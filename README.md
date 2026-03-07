# FipeFácil 🚗

Aplicação web para consultar o valor FIPE de veículos através da placa ou busca manual.

## 🌐 Acesso Online

O aplicativo está disponível em: **https://mariobignami.github.io/fipefacil/**

Você pode usar diretamente no seu celular ou computador!

## 🎯 Como Usar

### Busca por Veículo (Recomendado)
1. Acesse o aplicativo no link acima
2. Selecione o tipo de veículo (Carro, Moto ou Caminhão)
3. Escolha a marca do veículo
4. Selecione o modelo
5. Escolha o ano
6. Clique em "Consultar Valor FIPE"
7. Veja o valor FIPE atualizado com todos os detalhes!

### Busca por Placa (Demonstração)
1. Clique na aba "Busca por Placa"
2. Digite uma placa no formato antigo (ABC1234) ou Mercosul (ABC1D23)
3. Clique em "Consultar" ou use uma das placas de exemplo
4. Veja os dados do veículo e o valor FIPE!

### Placas de Exemplo

O aplicativo inclui placas de demonstração que você pode testar:
- **HHE-7F34** - Volkswagen Gol 2020
- **FDP-0389** - Fiat Uno 2018
- **ABC-1234** - Chevrolet Onix 2019
- **XYZ-5678** - Honda Civic 2021

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

O backend é opcional. O frontend funciona de forma independente consultando a API FIPE diretamente.

```bash
cd backend
npm install
npm start
```

## 📦 Deploy

O aplicativo é automaticamente implantado no GitHub Pages através de GitHub Actions sempre que há um push na branch `main`.

## 🔧 Tecnologias

- **Frontend**: React + Vite
- **API**: FIPE Parallelum (https://fipe.parallelum.com.br)
- **Deploy**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.
