# Mamma Formula

Sistema de Gestão de Receitas, CMV e Produção — Mamma Mia Salgados.

Centraliza fichas técnicas, calcula o CMV automaticamente a partir do preço
atual de cada matéria-prima, e acompanha rendimento e produção.

## Stack

- **Next.js** (App Router) + React
- **Tailwind CSS v4**
- **Google Sheets + Apps Script** como banco de dados e API
- **lucide-react** para ícones

Mesmo padrão técnico usado nos outros sistemas da Mamma Mia (Control, Operações).

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

### Modo demonstração vs. conectado à planilha

Sem configurar a variável de ambiente, o sistema roda em **modo
demonstração**: usa os dados de exemplo em `src/lib/seed.js` (Queijo
Mussarela, Pão de Queijo Tradicional etc.) e tudo funciona no navegador,
mas nada é salvo entre sessões.

Para conectar na planilha de verdade:

1. Abra **script.google.com**, crie um novo projeto e cole o conteúdo de
   `mamma-formula-appsscript/Code.gs`.
2. Rode a função `setup` uma vez — ela cria uma planilha chamada
   "Mamma Formula - Dados" com todas as abas (Categorias, Fornecedores,
   MateriasPrimas, HistoricoPrecos, Receitas, ReceitaItens, Producoes) já
   populadas com dados de exemplo.
3. Implante como **App da Web** (Executar como: Eu · Quem pode acessar:
   Qualquer pessoa) e copie a URL gerada (termina em `/exec`).
4. Copie `.env.example` para `.env.local` e preencha:
