# ✅ Solução: Busca por Placa Corrigida

## 🔍 Problema Identificado

A busca por placa **não estava funcionando** porque o código tentava chamar uma API que **não existe**:
- URL antiga: `https://denatran.parallelum.com.br/api/v1/{placa}`
- Esta API nunca existiu ou foi descontinuada
- Resultado: Todas as buscas por placa falhavam

## ✨ Solução Implementada

Implementei uma solução robusta que:

1. **Usa o backend como proxy** - Chamadas de API agora passam pelo servidor backend
2. **Suporta múltiplos provedores** - Você pode escolher qual API de consulta de placas usar
3. **Inclui opção gratuita** - BrasilAPI não requer cadastro ou pagamento
4. **Mantém busca manual funcionando** - A busca por veículo continua 100% funcional sem backend

## 🚀 Como Usar Agora

### Opção 1: Usar BrasilAPI (Gratuito)

**Passo 1: Configure o backend**
```bash
cd backend
cp .env.example .env
npm install
npm start
```

O arquivo `.env` já está configurado com BrasilAPI por padrão. Não precisa alterar nada!

**Passo 2: Configure o frontend**
```bash
cd frontend
echo "VITE_BACKEND_URL=http://localhost:3001" > .env
npm run dev
```

**Passo 3: Teste**
1. Abra http://localhost:5173
2. Clique em "Busca por Placa"
3. Digite uma placa (ex: ABC1234)
4. Veja os resultados!

### Opção 2: Usar Serviço Pago (Mais Confiável)

Se você quer dados mais completos e confiáveis para produção:

1. Cadastre-se em um serviço:
   - **ApiPlaca**: https://apiplaca.com.br
   - **PlacaFipe**: https://placafipe.com

2. Edite `backend/.env`:
   ```env
   PLATE_API_PROVIDER=apiplaca
   PLATE_API_KEY=sua_chave_aqui
   ```

3. Inicie o backend: `npm start`

### Opção 3: Continuar Sem Backend

A **busca manual por veículo** continua funcionando sem precisar de backend!

1. No app, clique em "Busca por Veículo"
2. Selecione marca, modelo e ano
3. Funciona perfeitamente!

## 📚 Documentação Completa

Criei documentação detalhada em:
- **`backend/SETUP_GUIDE.md`** - Guia completo de configuração do backend
- **`README.md`** - Atualizado com novas instruções
- **`DEPLOYMENT.md`** - Informações sobre deploy atualizadas

## 🔧 Mudanças Técnicas

### Arquivos Modificados

1. **`frontend/src/services/consultaService.js`**
   - Agora chama o backend em vez da API inexistente
   - Melhor tratamento de erros
   - Mensagens claras quando backend não está disponível

2. **`backend/src/services/plateService.js`**
   - Suporte para BrasilAPI (gratuito)
   - Suporte para ApiPlaca (pago)
   - Suporte para PlacaFipe (pago)
   - Suporte para APIs customizadas

3. **`backend/.env.example`**
   - Exemplos claros de configuração
   - BrasilAPI configurado por padrão

4. **`backend/src/index.js`**
   - Mensagens de startup melhoradas
   - Valida configuração ao iniciar

## ⚠️ Importante Entender

### GitHub Pages (Produção)
O site em **https://mariobignami.github.io/fipefacil/** hospeda apenas o frontend (arquivos estáticos).

Para a busca por placa funcionar em produção, você precisa:
1. Fazer deploy do backend em algum lugar (Heroku, Railway, Vercel, etc.)
2. Configurar a variável `VITE_BACKEND_URL` no frontend apontando para o backend em produção

**Enquanto isso:**
- ✅ Busca manual funciona perfeitamente no GitHub Pages
- ❌ Busca por placa só funciona localmente (com backend rodando)

### Custos

| Opção | Custo | Limitações |
|-------|-------|-----------|
| BrasilAPI | Grátis | Pode ter rate limits, sem SLA |
| ApiPlaca | ~R$ 50-200/mês | Dados completos, suporte |
| PlacaFipe | ~R$ 100-300/mês | Integração FIPE direta |
| Heroku (hospedar backend) | Grátis ou $7/mês | - |

## 🎯 Próximos Passos Recomendados

### Para Desenvolvimento Local
1. ✅ Use BrasilAPI (já está configurado!)
2. ✅ Siga os passos em "Como Usar Agora" acima

### Para Produção
1. 📝 Decida qual provedor de API usar
2. 🚀 Faça deploy do backend (veja `backend/SETUP_GUIDE.md`)
3. ⚙️ Configure `VITE_BACKEND_URL` no frontend
4. 🔄 Faça novo deploy do frontend

## ❓ Problemas Comuns

**"Backend não está disponível"**
- Certifique-se que o backend está rodando: `cd backend && npm start`
- Verifique se o `.env` do frontend tem `VITE_BACKEND_URL=http://localhost:3001`
- Reinicie o frontend após criar/alterar o `.env`

**"PLATE_API_NOT_CONFIGURED"**
- Edite `backend/.env` e configure `PLATE_API_PROVIDER=brasilapi`
- Reinicie o backend

**"Veículo não encontrado"**
- Verifique se a placa está correta
- Tente com outras placas
- Use a busca manual como alternativa

## 📞 Suporte

- Documentação completa: `backend/SETUP_GUIDE.md`
- Issues: https://github.com/mariobignami/fipefacil/issues

---

## 📚 Pesquisa rápida sobre APIs de placa

- **BrasilAPI (`/placa/v1/{placa}`)**: gratuita, sem chave. Entrega `marca`, `modelo`, `anoModelo`, `combustivel`, `cor` e dados de município; sem preço FIPE. Sujeita a rate limit.
- **ApiPlaca (`/v1/placa/{placa}`)**: pago, header `Authorization: Bearer <chave>`. Costuma trazer `codigo_fipe` e detalhes de veículo/chassi.
- **PlacaFipe (`/consulta/{placa}`)**: pago, retorna `codigo_fipe` e já inclui `valor`/`mes_referencia` FIPE na resposta.
- **Alternativas pagas (OlhoNoCarro, Bina, InfosCar)**: oferecem histórico e restrições, mas exigem contrato e não devem expor a chave no frontend — use `PLATE_API_URL` como proxy.

Como cruzamos com a Tabela FIPE:
1. Normalizamos marca/modelo/ano/combustível/cor a partir da API de placa e preservamos `codigo_fipe`/`valor` quando vierem.
2. Se não houver preço FIPE, consultamos `https://fipe.parallelum.com.br/api/v2` usando a combinação de marca/modelo/ano.
3. O frontend exibe os dados consolidados e mostra um aviso quando a busca FIPE não retornar valor.

## Resumo Executivo

**O que estava errado:** API inexistente

**O que foi feito:** Backend proxy com múltiplos provedores

**Como usar:** Siga "Como Usar Agora" acima (5 minutos para configurar)

**Busca manual:** Continua funcionando sem mudanças! ✅
