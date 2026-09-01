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

## 📦 Deploy

O frontend estático é implantado no GitHub Pages via GitHub Actions.

> ⚠️ **Importante:** o GitHub Pages não hospeda Node.js/Express.  
> A **consulta por placa** precisa do endpoint `/api/placa` (backend scraping) rodando em servidor próprio.

Para produção completa (manual + placa), publique também o backend (`frontend/server/index.js`) em uma plataforma com Node.js e configure o frontend para apontar para esse host.

Exemplo de configuração:

```bash
# em frontend/.env.production
VITE_PLATE_API_BASE=https://seu-backend.exemplo.com
```

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
- O recurso inclui tratamento para indisponibilidade da fonte e mensagens amigáveis quando não for possível interpretar os dados.
- Verifique sempre os **termos de uso** e políticas do site fonte antes de uso em produção/comercial.
