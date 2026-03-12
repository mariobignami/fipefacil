# FipeFácil 🚗

Aplicação web para consultar o valor FIPE de veículos através da placa ou busca manual.

## 🌐 Acesso Online

O aplicativo está disponível em: **https://mariobignami.github.io/fipefacil/**

Você pode usar diretamente no seu celular ou computador!

## 🎯 Como Usar

O aplicativo oferece duas formas de busca, acessíveis através de botões no topo da página:

### 🚗 Busca por Placa
Consulte veículos através da placa usando a API Parallelum DENATRAN:

1. Acesse o aplicativo e selecione "Busca por Placa"
2. Digite a placa do veículo (formato ABC1234 ou ABC1D23)
3. Clique em "Consultar"
4. Os dados do veículo são obtidos via API e o valor FIPE é buscado automaticamente

### 📋 Busca por Veículo
Funciona 100% online sem necessidade de backend.

1. Selecione "Busca por Veículo" no topo
2. Escolha o tipo de veículo (Carro, Moto ou Caminhão)
3. Selecione a marca do veículo
4. Escolha o modelo
5. Selecione o ano
6. Clique em "Consultar Valor FIPE"
7. Veja o valor FIPE atualizado com todos os detalhes!

**Nota sobre Busca por Placa**: A busca por placa requer que o backend esteja configurado e rodando com uma API de consulta de placas. Veja as instruções abaixo.

## ✨ Funcionalidades

- ✅ **Busca por Placa**: Consulta via backend configurável (BrasilAPI gratuita ou APIs pagas) + valor FIPE automaticamente
- ✅ **Busca Manual Completa**: Consulte qualquer veículo selecionando marca, modelo e ano
- ✅ **Toggle de Modos de Busca**: Alterne facilmente entre busca por placa e busca manual
- ✅ **Dados Reais da Tabela FIPE**: Preços atualizados mensalmente via fipe.parallelum.com.br
- ✅ **Suporte a Múltiplos Tipos**: Carros, motos e caminhões
- ✅ **Interface Intuitiva**: Design moderno e responsivo
- ✅ **Validação de Placas**: Suporte para formato antigo (ABC1234) e Mercosul (ABC1D23)
- ✅ **Sem Necessidade de Cadastro**: Use imediatamente
- ✅ **Frontend 100% Gratuito**: Busca manual funciona sem custos

## 🛠️ Desenvolvimento Local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

### Backend (Necessário para Busca por Placa)

O backend é necessário para a funcionalidade de busca por placa.
O frontend da busca manual funciona de forma independente consultando a API FIPE diretamente.

**Para habilitar a busca por placa:**

1. Configure as variáveis de ambiente:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edite o `.env` e escolha um provedor de API de placas:

   **Opção 1: BrasilAPI (Gratuito - Recomendado para testes)**
   ```env
   PLATE_API_PROVIDER=brasilapi
   ```
   Não precisa de chave de API!

   **Opção 2: ApiPlaca ou PlacaFipe (Pago)**
   ```env
   PLATE_API_PROVIDER=apiplaca  # ou placafipe
   PLATE_API_KEY=sua_chave_aqui
   ```

   **Opção 3: API Customizada**
   ```env
   PLATE_API_PROVIDER=custom
   PLATE_API_URL=https://sua-api.com/{plate}
   PLATE_API_KEY=sua_chave_aqui
   ```

3. Inicie o backend:
   ```bash
   npm install
   npm start
   ```

4. Configure o frontend para apontar para o backend:
   ```bash
   cd ../frontend
   # Crie um arquivo .env com:
   echo "VITE_BACKEND_URL=http://localhost:3001" > .env
   ```

O backend estará disponível em `http://localhost:3001`

## 📦 Deploy

O aplicativo é automaticamente implantado no GitHub Pages através de GitHub Actions sempre que há um push na branch `main`.

## 🔧 Tecnologias

- **Frontend**: React + Vite
- **API**: FIPE Parallelum (https://fipe.parallelum.com.br)
- **Deploy**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.
