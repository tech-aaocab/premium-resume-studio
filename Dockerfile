FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/render-server.js"]
