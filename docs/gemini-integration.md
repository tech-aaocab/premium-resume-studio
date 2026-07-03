# Calling this skill from Gemini

This skill follows the standard agent-skill format (`SKILL.md` + scripts) and
works with any agent that supports it. Below are the concrete ways to invoke
it from Google's Gemini products.

## Gemini CLI (with extensions)

```bash
gemini extensions install https://github.com/<your-username>/premium-resume-studio
gemini "Render profile/sourabh.json as a stunning PDF and save to output.pdf"
```

The CLI will discover `SKILL.md`, follow its instructions, and run
`node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf`.

## Gemini in AI Studio / gemini.google.com (web)

1. Open a new chat in AI Studio (gemini.google.com).
2. Paste the entire contents of `SKILL.md` into the **System instructions** field.
3. In the user message, paste your profile JSON and ask:
   "Render this profile as a stunning PDF."
4. Gemini will follow the skill's instructions. If it has shell access in the
   sandbox, the PDF is at `output.pdf`; otherwise ask for the rendered HTML
   and render it locally with any browser.

## Gemini in VS Code (with Code Assist extension)

Open this folder in VS Code. Ask Copilot:
"Build the stunning PDF from profile/sourabh.json". It runs the build script
via the integrated terminal.

## Gemini API (programmatic)

The programmatic pattern uses **function calling**: you describe the skill to
Gemini, declare a `render_resume` function, and Gemini emits a function call
when the user asks for a render. Your code runs the build script, returns
the result, and Gemini uses it in its final response.

### Prerequisites

```bash
pip install google-genai
export GEMINI_API_KEY=...           # from https://aistudio.google.com/apikey
git clone https://github.com/srksourabh/premium-resume-studio.git
cd premium-resume-studio
./install.sh                        # installs Playwright + Chromium
```

### Working example (`call_gemini.py`)

```python
"""
End-to-end: ask Gemini to render a resume via the premium-resume-studio skill.
Gemini emits a function call; we run the build script and return the result.
"""
import os, subprocess
from pathlib import Path
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# ---- 1. Declare the render function (what Gemini can call) ----
render_decl = types.FunctionDeclaration(
    name="render_resume",
    description=(
        "Render a JSON profile into a premium PDF resume using the "
        "premium-resume-studio skill (HTML + CSS + Chromium)."
    ),
    parameters={
        "type": "object",
        "properties": {
            "profile_path": {
                "type": "string",
                "description": "Absolute or relative path to the profile JSON.",
            },
            "out_path": {
                "type": "string",
                "description": "Output PDF path. Default: output.pdf",
            },
        },
        "required": ["profile_path"],
    },
)
tools = [types.Tool(function_declarations=[render_decl])]

# ---- 2. Implement the function (runs the build script) ----
def render_resume(profile_path: str, out_path: str = "output.pdf") -> dict:
    profile = Path(profile_path).resolve()
    if not profile.exists():
        return {"status": "error", "message": f"profile not found: {profile}"}
    subprocess.run(
        ["node", "scripts/build_stunning_pdf.js",
         "--profile", str(profile), "--out", out_path],
        check=True, cwd=Path(__file__).parent.resolve(),
    )
    size = Path(out_path).stat().st_size if Path(out_path).exists() else 0
    return {"status": "ok", "path": str(Path(out_path).resolve()), "size_bytes": size}

# ---- 3. Build the request ----
skill = Path("SKILL.md").read_text(encoding="utf-8")
config = types.GenerateContentConfig(
    system_instruction=skill,            # SKILL.md is the system prompt
    tools=tools,
    tool_config=types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(mode="AUTO"),
    ),
)

user_prompt = "Build my resume from profile/sourabh.json"

# ---- 4. First turn: Gemini decides to call the function ----
turn1 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=user_prompt,
    config=config,
)

# ---- 5. Execute the function call(s) and send results back ----
parts = turn1.candidates[0].content.parts
function_results = []
for part in parts:
    if part.function_call:
        fn = part.function_call
        args = dict(fn.args) if fn.args else {}
        print(f"Gemini called: {fn.name}({args})")
        result = render_resume(**args) if fn.name == "render_resume" else {"error": "unknown fn"}
        function_results.append(
            types.Part.from_function_response(name=fn.name, response=result)
        )

# ---- 6. Second turn: Gemini sees the result and replies with a summary ----
turn2 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=[
        turn1.candidates[0].content,                  # Gemini's function-call turn
        types.Content(role="user", parts=function_results),  # tool results
    ],
    config=config,
)

print(turn2.text)                  # e.g. "Rendered output.pdf (135 KB)."
```

Run it:

```bash
GEMINI_API_KEY=... python3 call_gemini.py
# → Gemini called: render_resume({'profile_path': 'profile/sourabh.json'})
# → Rendered /abs/path/output.pdf (135614 bytes).
```

### Lighter alternative: system-instructions only

If you don't need Gemini to actually run the build, you can skip the
function-calling loop and just use SKILL.md as a system prompt. Gemini will
tell you the exact `node` command to run:

```python
config = types.GenerateContentConfig(system_instruction=skill)
r = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Render profile/sourabh.json as a stunning PDF and tell me the exact command to run.",
    config=config,
)
print(r.text)
```

You then run the command yourself. This pattern is good for one-off renders
where you don't want to set up the function-calling loop.

## Compatibility

The skill format used here is the open agent-skill format (frontmatter +
`SKILL.md` body). It's compatible with:

- Claude Code / Anthropic SDKs
- Gemini CLI, AI Studio, and the Gemini API
- Cursor
- GitHub Copilot Workspace
- Aider, Cline, Continue, Roo Code
- Any agent that loads a folder containing `SKILL.md`

The build script itself has no Google-specific dependencies. It works in any
Node.js environment with Playwright installed.
