# Backend da consulta por placa (scraping do tabelafipebrasil.com).
#
# A imagem oficial do Playwright já traz o Chromium e todas as dependências de
# sistema necessárias — é o jeito mais confiável de rodar o navegador headless
# que resolve o desafio do Cloudflare.
#
# Build (a partir da pasta frontend):
#   docker build -t fipefacil-api .
# Run:
#   docker run -p 3001:3001 -e ALLOWED_ORIGINS=https://mariobignami.github.io fipefacil-api

FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PORT=3001

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server ./server

EXPOSE 3001

CMD ["node", "server/index.js"]
