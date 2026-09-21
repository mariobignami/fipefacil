# FipeFácil 🚗

Aplicação web para consultar o valor FIPE de veículos por busca manual e por placa.

## 🌐 Acesso Online (GitHub Pages)

O aplicativo está disponível em: **https://mariobignami.github.io/fipefacil/**

Você pode usar direto no celular ou computador.

## 🎯 Como Usar

### Busca manual

1. Selecione o tipo de veículo (Carro, Moto ou Caminhão)
2. Escolha a marca do veículo
3. Selecione o modelo
4. Escolha o ano
5. Clique em "Consultar Valor FIPE"

### Consulta por placa

1. Abra a aba **Consulta por Placa**
2. Escolha o formato (**Automático**, **Antiga** ou **Mercosul**)
3. Digite a placa (ex.: `ABC1234` ou `ABC1D23`, com ou sem hífen)
3. Veja:
   - dados principais do veículo
   - FIPE principal em destaque
   - outros modelos do mesmo ano
4. A interface mostra preview visual de placa **antiga cinza** e **Mercosul**

## ✨ Funcionalidades

- ✅ **Busca Manual Completa**: Consulte qualquer veículo selecionando marca, modelo e ano
- ✅ **Consulta por Placa**: Busca com scraping server-side e retorno organizado
- ✅ **Placa Antiga + Mercosul**: valida e normaliza ambos os formatos
- ✅ **Entrada Segmentada**: campos por caractere com teclado orientado (letra/número) no mobile
- ✅ **Dados Reais da Tabela FIPE**: Preços atualizados mensalmente via fipe.parallelum.com.br
- ✅ **Suporte a Múltiplos Tipos**: Carros, motos e caminhões
- ✅ **Interface Intuitiva**: Design moderno e responsivo
- ✅ **Sem Necessidade de Cadastro**: Use imediatamente
- ✅ **100% Gratuito**: Funciona sem custos

## 🛠️ Desenvolvimento Local

### Frontend

```bash
cd frontend
npm install
```

Terminal 1 (proxy scraping da placa):

```bash
npm run server
```

Terminal 2 (frontend):

```bash
npm run dev
```

Frontend em `http://localhost:5173` e backend/proxy em `http://localhost:3001`.

> O consulta por placa usa navegador headless. Se o Chromium do Playwright não
> estiver baixado, rode `npm run browser:install` — o backend também cai
> automaticamente para o Chrome/Edge instalado na máquina, se houver.

## 📦 Deploy

O projeto tem **duas partes** e cada uma vai para um lugar diferente:

| Parte | O que é | Onde roda |
| --- | --- | --- |
| Frontend (React) | arquivos estáticos | **GitHub Pages** (já automatizado) |
| Backend (`/api/placa`) | Node + Chromium (scraping) | precisa de um host que rode processos, ex.: **Render** |

> ⚠️ O GitHub Pages **só serve arquivos estáticos** — ele não executa Node.js,
> não roda navegador e não responde `/api/placa`. O GitHub Actions também não
> serve para hospedar: ele só executa tarefas rápidas durante o build/deploy.
> Sem um host para o backend, a consulta por placa não funciona em produção.

### Passo a passo do backend no Render (com Browserless)

O navegador usado para passar pelo Cloudflare roda **fora** do backend (Browserless,
via CDP). Assim o serviço no Render é um Node comum: leve e sem Chromium.

1. Crie uma conta em [browserless.io](https://www.browserless.io/) e copie a
   **API token** (Dashboard → API Keys).
2. Monte a URL do endpoint CDP. **Atenção:** como a fonte bloqueia IPs de
   datacenter, é obrigatório usar a rota stealth **com proxy residencial** —
   sem o proxy o site responde `403 Attention Required`:
   ```
   wss://production-sfo.browserless.io/stealth?token=SEU_TOKEN&emulationOs=windows&proxy=residential&proxySticky=true
   ```
   | Parâmetro | Para que serve |
   | --- | --- |
   | `/stealth` | navegador endurecido contra detecção de bot |
   | `emulationOs=windows` | fingerprint coerente de Windows (o padrão do Browserless é Linux) |
   | `proxy=residential` | sai por IP residencial — **essencial** para passar pelo Cloudflare da fonte |
   | `proxySticky=true` | mantém o mesmo IP durante a sessão |
   | `proxyCountry=br` | *(opcional)* sai por IP do Brasil. Deixamos de fora porque o proxy BR adiciona ~3,5 s por consulta (o navegador roda nos EUA e faz uma volta extra). Se a fonte voltar a bloquear, adicione. |

### Desempenho (o que esperar)

| Situação | Tempo aproximado |
| --- | --- |
| Placa já consultada (cache de 6 h) | **< 1 s** |
| Consulta nova, sessão do navegador reaproveitada | **~5–8 s** |
| Consulta nova, abrindo sessão remota nova | **~11–15 s** |
| Primeira consulta após o serviço hibernar (plano free do Render) | +30–60 s |

Otimizações aplicadas: sessão remota reaproveitada por `PLATE_REMOTE_IDLE_MS`
(1 min), cache de 6 h, bloqueio de imagens/CSS/fontes e uma única sessão
simultânea (fila).
3. Suba o código para o GitHub (o `render.yaml` já está na raiz).
4. Em [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → selecione o repositório.
   Quando o Render pedir `PLATE_BROWSER_WS_ENDPOINT`, cole a URL do passo 2.
5. Aguarde o build e copie a URL do serviço (ex.: `https://fipefacil-api.onrender.com`).
6. Teste: `https://fipefacil-api.onrender.com/` deve responder
   `{"status":"ok", ..., "browserMode":"remote"}`.
7. No GitHub, a URL do backend já vem por padrão do workflow
   (`VITE_PLATE_API_BASE` = `https://fipefacil-api.onrender.com`). Se quiser
   apontar para outro host, cadastre a variable em
   **Settings → Secrets and variables → Actions → Variables → New repository variable**
   (nome `VITE_PLATE_API_BASE`), que ela tem prioridade sobre o padrão.
8. Rode o workflow de deploy do frontend (push na `main` ou **Actions → Deploy to GitHub Pages → Run workflow**).

> ⚠️ O token do Browserless é segredo: cadastre só no painel do Render (o
> `render.yaml` usa `sync: false`, então ele nunca vai para o repositório).

Para testar localmente com o navegador remoto:

```powershell
$env:PLATE_BROWSER_WS_ENDPOINT='wss://production-sfo.browserless.io?token=SEU_TOKEN'
npm run server
```

Sem essa variável o backend usa o Chromium local (veja abaixo).

#### Alternativa: navegador local (Docker)

Se preferir não usar Browserless, o backend pode abrir o próprio Chromium.
Nesse caso use o `frontend/Dockerfile` (imagem oficial do Playwright) no Render
com **Runtime: Docker**, **Dockerfile Path: `frontend/Dockerfile`** e
**Docker Context: `frontend`** — mais memória é necessária (~300 MB só para o navegador).

### Backend: o navegador headless é obrigatório

A consulta por placa depende do Chromium (Playwright) para passar pelo Cloudflare,
então o ambiente de deploy precisa de:

1. Dependências do Playwright instaladas (`npx playwright install --with-deps chromium`);
2. Memória disponível para o navegador (~200–300 MB só para o Chromium).

Para testar a imagem localmente (requer Docker instalado):

```bash
cd frontend
docker build -t fipefacil-api .
docker run -p 3001:3001 \
  -e ALLOWED_ORIGINS=https://mariobignami.github.io \
  fipefacil-api
```

> 💡 O plano gratuito do Render tem 512 MB e hiberna após 15 min sem uso. Na
> primeira consulta depois de hibernar, a resposta pode levar ~30–60 s (o
> navegador precisa subir). Se isso incomodar, use um plano com mais memória ou
> um serviço de navegador remoto (Browserless/CDP) para não rodar Chromium no host.

### Variáveis de ambiente do backend

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3001` | Porta HTTP do backend |
| `ALLOWED_ORIGINS` | `https://mariobignami.github.io` | Origens CORS liberadas (separadas por vírgula) |
| `PLATE_BROWSER_WS_ENDPOINT` | *(vazio)* | Endpoint CDP de navegador remoto (ex.: Browserless `/stealth` + `proxy=residential`). **Vazio = Chromium local** |
| `PLATE_USER_AGENT` | *(vazio)* | Sobrescreve o User-Agent. **Deixe vazio**: o navegador já envia um UA coerente com o próprio fingerprint |
| `PLATE_BROWSER_CHANNEL` | *(vazio)* | Canal do navegador local (`chrome`/`msedge`; vazio = Chromium do Playwright) |
| `PLATE_BROWSER_HEADLESS` | `true` | `false` abre o navegador local visível (útil para depurar o desafio) |
| `PLATE_BROWSER_IDLE_MS` | `300000` | Tempo ocioso antes de fechar o navegador **local** e liberar memória |
| `PLATE_REMOTE_IDLE_MS` | `60000` | Tempo que a sessão remota fica aberta após a última consulta (`0` = fechar na hora) |
| `PLATE_FETCH_TIMEOUT_MS` | `25000` | Timeout de cada requisição/navegação |
| `PLATE_CHALLENGE_TIMEOUT_MS` | `20000` | Tempo máximo de espera pela resolução do desafio do Cloudflare |
| `PLATE_CACHE_TTL_MS` | `21600000` (6 h) | TTL do cache em memória por placa |
| `PLATE_BLOCK_ASSETS` | `true` | Bloqueia imagens/fontes/CSS para acelerar a consulta |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | — | `1` evita baixar Chromium no build (use no modo remoto) |

Os nomes de provedores declarados em `backend/.env` (`PLATE_API_PROVIDER`,
`PLATE_API_KEY`, ...) **não são usados** pelo código atual — o backend faz
scraping com navegador headless.

## 🔧 Tecnologias

- **Frontend**: React + Vite
- **Backend de Placa**: Node.js + Express + Cheerio (scraping)
- **API**: FIPE Parallelum (https://fipe.parallelum.com.br)
- **Deploy**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.

## ⚠️ Limitações e observação legal (consulta por placa)

- A consulta por placa depende do HTML de `https://www.tabelafipebrasil.com/placa`; mudanças de layout/seletor podem impactar o scraping.
- **A fonte não informa o modelo exato do veículo.** Ela devolve uma *lista* de modelos do mesmo ano daquela marca que "podem corresponder" à placa (ex.: para um VW T-Cross ela lista também um Saveiro CROSS, que casou pela palavra "CROSS"). O app **ranqueia os candidatos pela semelhança com o modelo da placa** e mostra o primeiro como "Modelo mais provável", mantendo os outros na tabela. Confirme sempre o modelo exato antes de usar o valor.
- A fonte está atrás do **Cloudflare com desafio JavaScript**, que responde `403` para requisições HTTP simples (fetch/axios/curl) — não importa o User-Agent ou os headers usados. Por isso o backend abre um **navegador headless (Playwright)** para resolver o desafio, reaproveitando a sessão entre as consultas.
- Se nem o navegador headless passar, a API responde `503` com o código `SOURCE_BLOCKED` e detalhes das tentativas.
- O recurso inclui tratamento para indisponibilidade da fonte e mensagens amigáveis quando não for possível interpretar os dados.
- Verifique sempre os **termos de uso** e políticas do site fonte antes de uso em produção/comercial.

## 🩺 Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `SOURCE_BLOCKED` (503) | Cloudflare recusou o acesso (IP de datacenter) | Use navegador remoto com **proxy residencial** (`proxy=residential` na URL do Browserless). Chromium em datacenter sem proxy é bloqueado pela fonte. |
| `SOURCE_RATE_LIMITED` (429) | Muitas consultas seguidas à fonte | Espere alguns minutos; o cache de 10 min reduz a frequência |
| `BROWSER_UNAVAILABLE` (500) | Falha ao iniciar o Chromium **ou** ao conectar no navegador remoto | Confira `PLATE_BROWSER_WS_ENDPOINT`/token, ou rode `npm run browser:install:deps` no modo local |
| `BACKEND_NOT_CONFIGURED` no navegador | Build do frontend sem `VITE_PLATE_API_BASE` | Configure a variable no GitHub Actions e refaça o deploy |
| `NETWORK_ERROR` no navegador | Backend fora do ar ou CORS bloqueado | Confira a URL do backend e a variável `ALLOWED_ORIGINS` |
| Primeira consulta lenta (~3–5 s) | Abertura/reuso do navegador | Normal; as consultas seguintes usam cache (e o modo remoto não reinicia o navegador) |
