# Mamma Formula

Sistema de Gestão de Receitas, CMV e Produção — Mamma Mia Salgados.

Centraliza fichas técnicas, calcula o CMV automaticamente a partir do preço
atual de cada matéria-prima, e acompanha rendimento e produção.

## Stack

- **Next.js** (App Router) + React
- **Tailwind CSS v4**
- **Supabase** (Postgres) como banco de dados
- **lucide-react** para ícones

Mesmo padrão técnico usado nos outros sistemas da Mamma Mia (Control, PCP
Inteligente, Rota Inteligente).

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

### Modo demonstração vs. conectado ao Supabase

Sem configurar variáveis de ambiente, o sistema roda em **modo
demonstração**: usa os dados de exemplo em `src/lib/seed.js` (Queijo
Mussarela, Pão de Queijo Tradicional etc.) e tudo funciona no navegador,
mas nada é salvo entre sessões.

Para conectar ao banco de verdade:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de `supabase/schema.sql`
   — isso cria todas as tabelas (matérias-primas, receitas, CMV,
   rendimentos, revisões, checklists, produções, uploads etc.) e os
   triggers que recalculam preço médio/mínimo/máximo automaticamente.
3. Copie `.env.example` para `.env.local` e preencha:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   ```
4. Reinicie `npm run dev`. A barra lateral mostra "Conectado ao Supabase"
   quando a conexão está ativa.

## O que já está implementado (MVP)

- **Dashboard** — cards executivos (receitas ativas, matérias-primas, CMV
  médio, receita mais cara/lucrativa) e tabela de CMV por receita.
- **Matérias-Primas** — cadastro, busca, histórico de preço com
  gráfico, e atualização de preço (que já recalcula preço médio/mín/máx
  automaticamente via trigger no banco).
- **Receitas** — ficha técnica com busca de ingrediente, quantidade
  editável e cálculo automático do CMV (ingredientes + embalagem).
- **CMV** — visão consolidada comparando o CMV unitário de todas as
  receitas.
- **Rendimento** — calculadora de peso → rendimento %, perda, CMV por kg
  e CMV unitário.
- **Produções** — comparação teórico vs. real por lote.

O `supabase/schema.sql` já inclui as tabelas para os módulos que ainda
não têm tela própria (Revisões com versionamento em JSON, Checklists,
Testes, Importador por IA via tabela `uploads`, Embalagens, Histórico de
auditoria) — a estrutura de dados está pronta para quando esses módulos
forem construídos.

## Próximos passos sugeridos

1. **Revisões** — tela de comparação entre versões (o schema já grava um
   snapshot completo a cada revisão em `revisoes.snapshot`).
2. **Importador por IA** — upload de PDF de ficha técnica → OCR → preview
   → aprovação (tabela `uploads` já modela o fluxo pendente → aprovado).
3. **Checklists de produção/qualidade** com aprovação em 3 níveis
   (Produção, Qualidade, Diretoria).
4. **Autenticação por perfil** (Administrador, Qualidade, Produção,
   Compras, PCP, Diretoria, Visualizador) usando Supabase Auth + RLS.
5. **Fase 2**: integração com Estoque (baixa automática), PCP (cálculo de
   insumos por quantidade desejada) e BI (ranking de margem, evolução de
   CMV).

## Estrutura

```
src/
  app/                 rotas (App Router) — uma pasta por módulo
  components/          Sidebar, StatCard
  lib/
    calc.js            cálculo de CMV e rendimento (funções puras)
    store.jsx          estado global + leitura/escrita no Supabase
    seed.js             dados de demonstração
    supabaseClient.js   cliente Supabase (detecta modo demonstração)
supabase/
  schema.sql           schema completo do banco (todas as tabelas do spec)
```
