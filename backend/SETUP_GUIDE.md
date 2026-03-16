# Guia de Configuração do Backend - Busca por Placa

Este guia explica como configurar o backend para habilitar a funcionalidade de busca por placa.

## Por que preciso do backend?

A busca manual por veículo funciona 100% no navegador sem backend. Porém, a **busca por placa** requer uma API especializada de consulta de placas, que não pode ser chamada diretamente do navegador por questões de:

1. **Segurança**: APIs de placa geralmente requerem chaves de API que não devem ser expostas no frontend
2. **CORS**: Muitas APIs não permitem chamadas diretas do navegador
3. **Custo**: O backend permite controlar e monitorar o uso da API

## Provedores de API Suportados

### 1. BrasilAPI (Gratuito) ⭐ Recomendado para testes

**Características:**
- ✅ Totalmente gratuito
- ✅ Não precisa de cadastro ou chave de API
- ✅ Mantido pela comunidade brasileira
- ⚠️ Limitações de taxa de requisição
- ⚠️ Pode estar indisponível em alguns momentos
- 🔗 Endpoint: `https://brasilapi.com.br/api/placa/v1/{placa}` (marca, modelo, ano/modelo, combustível, cor; sem preço FIPE)

**Configuração:**
```env
PLATE_API_PROVIDER=brasilapi
```

**Pronto!** Não precisa de mais nada.

---

### 2. ApiPlaca (Pago)

**Características:**
- ✅ Dados mais completos e confiáveis
- ✅ SLA e suporte comercial
- ✅ Maior limite de requisições
- 💰 Serviço pago (consulte planos em https://apiplaca.com.br)
- 🔗 Endpoint: `https://api.apiplaca.com.br/v1/placa/{placa}` com header `Authorization: Bearer <sua_chave>`

**Configuração:**
1. Crie uma conta em https://apiplaca.com.br
2. Obtenha sua chave de API
3. Configure:
```env
PLATE_API_PROVIDER=apiplaca
PLATE_API_KEY=sua_chave_aqui
```

---

### 3. PlacaFipe (Pago)

**Características:**
- ✅ Integração direta com dados FIPE
- ✅ Dados atualizados em tempo real
- 💰 Serviço pago
- 🔗 Endpoint: `https://api.placafipe.com/consulta/{placa}` com header `x-api-key: <sua_chave>`

**Configuração:**
```env
PLATE_API_PROVIDER=placafipe
PLATE_API_KEY=sua_chave_aqui
```

---

### 4. API Customizada

Se você tem acesso a outra API de consulta de placas:

**Configuração:**
```env
PLATE_API_PROVIDER=custom
PLATE_API_URL=https://sua-api.com/consulta/{plate}
PLATE_API_KEY=sua_chave_aqui
```

A URL deve conter `{plate}` que será substituído pela placa consultada.

---

## Passo a Passo para Configuração

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Criar Arquivo de Configuração

```bash
cp .env.example .env
```

### 3. Editar o Arquivo `.env`

Abra o arquivo `.env` e configure conforme o provedor escolhido:

**Para BrasilAPI (gratuito):**
```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
PLATE_API_PROVIDER=brasilapi
```

**Para serviços pagos:**
```env
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
PLATE_API_PROVIDER=apiplaca
PLATE_API_KEY=sua_chave_api_aqui
```

### 4. Iniciar o Backend

```bash
npm start
```

Você deve ver:
```
Server running on port 3001
Plate API provider: brasilapi
```

### 5. Configurar o Frontend

No diretório `frontend`, crie um arquivo `.env`:

```bash
cd ../frontend
echo "VITE_BACKEND_URL=http://localhost:3001" > .env
```

### 6. Testar

1. Inicie o frontend (se ainda não estiver rodando):
```bash
npm run dev
```

2. Acesse http://localhost:5173
3. Selecione "Busca por Placa"
4. Digite uma placa válida (ex: ABC1234)
5. Clique em "Consultar"

## Solução de Problemas

### Erro: "Backend não está disponível"

**Causa**: O frontend não consegue conectar ao backend.

**Solução**:
1. Verifique se o backend está rodando em http://localhost:3001
2. Verifique se o arquivo `.env` do frontend tem `VITE_BACKEND_URL=http://localhost:3001`
3. Reinicie o frontend após criar/modificar o `.env`

### Erro: "PLATE_API_NOT_CONFIGURED"

**Causa**: O backend está rodando mas não está configurado com um provedor de API.

**Solução**:
1. Verifique o arquivo `backend/.env`
2. Certifique-se de ter configurado `PLATE_API_PROVIDER`
3. Reinicie o backend

### Erro 404: "Veículo não encontrado"

**Causa**: A placa consultada não existe ou a API retornou 404.

**Solução**:
- Verifique se a placa está correta
- Teste com placas diferentes
- Se usar BrasilAPI, a API pode ter limitações de dados

### BrasilAPI não funciona

**Causa**: A API pode estar temporariamente indisponível ou com problemas.

**Solução**:
1. Verifique o status em https://status.brasilapi.com.br
2. Considere usar um serviço pago para produção
3. Use a busca manual como alternativa

## Deploy em Produção

### Opção 1: Heroku

```bash
# No diretório backend
heroku create seu-app-nome
heroku config:set PLATE_API_PROVIDER=brasilapi
heroku config:set ALLOWED_ORIGINS=https://mariobignami.github.io
git push heroku main
```

### Opção 2: Railway

1. Conecte seu repositório no Railway
2. Configure as variáveis de ambiente:
   - `PLATE_API_PROVIDER`
   - `PLATE_API_KEY` (se necessário)
   - `ALLOWED_ORIGINS`

### Opção 3: Vercel/Netlify Functions

O backend pode ser adaptado para rodar como serverless functions.

### Configurar Frontend para Produção

Após fazer deploy do backend, atualize o frontend:

```bash
cd frontend
# Edite .env.production
echo "VITE_BACKEND_URL=https://seu-backend.herokuapp.com" > .env.production
```

Faça commit e push para atualizar o GitHub Pages.

## Custos Estimados

| Provedor | Custo | Requisições/mês |
|----------|-------|-----------------|
| BrasilAPI | Grátis | Limitado |
| ApiPlaca | ~R$ 50-200/mês | 1.000-10.000 |
| PlacaFipe | ~R$ 100-300/mês | 1.000-10.000 |
| Heroku (hospedagem) | Grátis / $7/mês | Ilimitado |

## Perguntas Frequentes

**P: Posso usar sem backend?**
R: A busca manual funciona sem backend. A busca por placa requer backend.

**P: BrasilAPI é confiável para produção?**
R: Para projetos pequenos e pessoais, sim. Para produção comercial, considere APIs pagas.

**P: Posso criar minha própria API de placas?**
R: Sim, use a opção "custom" e configure sua própria URL.

**P: Os dados são armazenados?**
R: Não, o backend apenas faz proxy das requisições. Nada é salvo.

## Suporte

- GitHub Issues: https://github.com/mariobignami/fipefacil/issues
- BrasilAPI Docs: https://brasilapi.com.br/docs
