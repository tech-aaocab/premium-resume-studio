# Calling this skill from Gemini

This skill follows the standard agent-skill format (`SKILL.md` + scripts) and
works with any agent that supports it. Below are the concrete ways to invoke
it from Google's Gemini products.

## Gemini CLI (with extensions)

The Gemini CLI supports installing extensions from GitHub. The extension
manifest expects an `extension.json` or a `SKILL.md` at the repo root —
this repo ships the latter.

Install:

```bash
gemini extensions install https://github.com/<your-username>/sourabh-resume-studio
```

Invoke (from any directory where the profile exists):

```bash
gemini "Render profile/sourabh.json as a stunning PDF and save to output.pdf"
```

The CLI will discover `SKILL.md`, follow its instructions, and run
`node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf`.

## Gemini in AI Studio / gemini.google.com (web)

1. Open a new chat in AI Studio (gemini.google.com).
2. Paste the entire contents of `SKILL.md` into the **System instructions** field.
3. In the user message, paste your profile JSON and ask:
   "Render this profile as a stunning PDF and save to output.pdf."
4. Gemini will follow the skill's instructions and call the build script.
5. The output PDF is at `output.pdf` in the working directory Gemini has access to.

If the chat context does not have shell access, Gemini can produce the rendered
HTML (the script writes one to `examples/_preview.html` if you pass `--html`)
which you can copy out and render locally with any browser.

## Gemini in VS Code (with Code Assist extension)

The Google Gemini Code Assist extension in VS Code discovers skills in
your workspace via `SKILL.md`. Open this folder in VS Code, then ask:

> "Build the stunning PDF from profile/sourabh.json"

Code Assist will run the build script via the integrated terminal.

## Gemini API (programmatic)

If you want to call the renderer directly from the Gemini API:

```python
import google.generativeai as genai
import subprocess

# 1. Set up Gemini with a tool that lets it run shell commands
model = genai.GenerativeModel(
    "gemini-1.5-pro",
    tools=[{"function_declarations": [{
        "name": "render_resume",
        "description": "Render the profile JSON to a stunning PDF using the premium-resume-studio skill.",
        "parameters": {
            "type": "object",
            "properties": {
                "profile_path": {"type": "string"},
                "out_path": {"type": "string"},
            },
            "required": ["profile_path"]
        }
    }]}]
)

# 2. Wire the function call to the build script
def render_resume(profile_path, out_path="output.pdf"):
    subprocess.run(["node", "scripts/build_stunning_pdf.js",
                    "--profile", profile_path, "--out", out_path], check=True)
    return f"Rendered {out_path}"
```

## Compatibility

The skill format used here is the open agent-skill format (frontmatter +
`SKILL.md` body). It's compatible with:

- Claude Code / Anthropic SDKs
- Gemini CLI and AI Studio
- Cursor
- GitHub Copilot Workspace
- Aider, Cline, Continue, Roo Code
- Any agent that loads a folder containing `SKILL.md`

The build script itself has no Google-specific dependencies. You can use
it from any Node.js environment with Playwright installed.
