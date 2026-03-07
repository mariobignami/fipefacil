# FipeFácil 🚗

Aplicação web para consultar o valor FIPE de veículos através da placa ou busca manual.

## 🌐 Acesso Online

O aplicativo está disponível em: **https://mariobignami.github.io/fipefacil/**

Você pode usar diretamente no seu celular ou computador!

## 🎯 Como Usar

### Busca por Veículo (Recomendado) ⭐
Esta é a forma principal de usar o aplicativo. Funciona 100% online sem necessidade de backend.

1. Acesse o aplicativo no link acima
2. Selecione o tipo de veículo (Carro, Moto ou Caminhão)
3. Escolha a marca do veículo
4. Selecione o modelo
5. Escolha o ano
6. Clique em "Consultar Valor FIPE"
7. Veja o valor FIPE atualizado com todos os detalhes!

### Busca por Placa
A busca por placa requer um backend configurado com uma API externa de consulta de placas.
No GitHub Pages, essa funcionalidade está desabilitada. Use a busca manual por veículo.

## ✨ Funcionalidades

- ✅ **Busca Manual Completa**: Consulte qualquer veículo selecionando marca, modelo e ano
- ✅ **Dados Reais da Tabela FIPE**: Preços atualizados mensalmente
- ✅ **Suporte a Múltiplos Tipos**: Carros, motos e caminhões
- ✅ **Interface Intuitiva**: Design moderno e responsivo
- ✅ **Sem Necessidade de Cadastro**: Use imediatamente
- ✅ **100% Gratuito**: Sem custos ou limitações

## 🛠️ Desenvolvimento Local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

### Backend (Opcional)

O backend é opcional e necessário apenas para a funcionalidade de busca por placa.
O frontend funciona de forma independente consultando a API FIPE diretamente.

Para habilitar a busca por placa:

1. Configure as variáveis de ambiente (copie `.env.example` para `.env`):
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edite o `.env` e configure sua API de consulta de placas:
   ```
   PLATE_API_KEY=sua_chave_api
   PLATE_API_URL=https://api.example.com/consulta/{plate}
   ```

3. Inicie o backend:
   ```bash
   npm install
   npm start
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
