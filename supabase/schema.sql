-- ============================================================
-- MAMMA FORMULA — Schema do banco de dados (Supabase / Postgres)
-- Sistema de Gestão de Receitas, CMV e Produção
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USUÁRIOS ----------
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  perfil text not null check (perfil in ('administrador','qualidade','producao','compras','pcp','diretoria','visualizador')),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ---------- FORNECEDORES ----------
create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  contato text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ---------- CATEGORIAS ----------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text check (tipo in ('materia_prima','receita')) not null,
  created_at timestamptz default now()
);

-- ---------- MATÉRIAS-PRIMAS ----------
create table if not exists materias_primas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  codigo_interno text,
  codigo_erp text,
  ean text,
  nome text not null,
  descricao text,
  categoria_id uuid references categorias(id),
  subcategoria text,
  fornecedor_principal_id uuid references fornecedores(id),
  fornecedor_secundario_id uuid references fornecedores(id),
  unidade text not null check (unidade in ('kg','g','L','ml','un','caixa','pacote','fardo')),
  preco_atual numeric(12,4) default 0,
  preco_medio numeric(12,4) default 0,
  preco_minimo numeric(12,4) default 0,
  preco_maximo numeric(12,4) default 0,
  ultima_compra date,
  foto_url text,
  status text default 'ativo' check (status in ('ativo','inativo')),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- HISTÓRICO DE PREÇOS ----------
create table if not exists historico_precos (
  id uuid primary key default gen_random_uuid(),
  materia_prima_id uuid references materias_primas(id) on delete cascade,
  preco numeric(12,4) not null,
  data date not null default current_date,
  fornecedor_id uuid references fornecedores(id),
  created_at timestamptz default now()
);

-- ---------- RECEITAS ----------
create table if not exists receitas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  categoria_id uuid references categorias(id),
  linha text,
  empresa text check (empresa in ('YUKA Alimentos','TC Distribuidora')),
  peso_total numeric(12,3),
  peso_unitario numeric(12,3),
  tempo_preparo text,
  temperatura text,
  validade text,
  observacoes text,
  foto_url text,
  pdf_url text,
  status text default 'ativa' check (status in ('ativa','em_revisao','inativa','aguardando_revisao')),
  versao_atual int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- ITENS DA RECEITA (ingredientes) ----------
create table if not exists receita_itens (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  materia_prima_id uuid references materias_primas(id),
  quantidade numeric(12,4) not null,
  unidade text not null,
  valor_unitario numeric(12,4), -- snapshot do preço no momento
  valor_total numeric(12,4),
  ordem int default 0,
  created_at timestamptz default now()
);

-- ---------- EMBALAGENS ----------
create table if not exists embalagens (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  nome text not null,
  custo_unitario numeric(12,4) default 0,
  quantidade_por_producao numeric(12,3) default 1,
  created_at timestamptz default now()
);

-- ---------- PROCESSOS (etapas macro) ----------
create table if not exists processos (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  nome text not null, -- ex: Escaldamento, Mistura, Descanso, Modelagem, Forno, Congelamento, Embalagem
  ordem int default 0,
  created_at timestamptz default now()
);

-- ---------- ETAPAS (detalhe de cada processo) ----------
create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid references processos(id) on delete cascade,
  tempo text,
  temperatura text,
  foto_url text,
  video_url text,
  observacao text,
  created_at timestamptz default now()
);

-- ---------- RENDIMENTOS ----------
create table if not exists rendimentos (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  peso_ingredientes numeric(12,3),
  peso_mistura numeric(12,3),
  peso_descanso numeric(12,3),
  peso_forno numeric(12,3),
  peso_final numeric(12,3),
  peso_embalagem numeric(12,3),
  peso_unitario numeric(12,3),
  rendimento_percentual numeric(6,2),
  perda_kg numeric(12,3),
  perda_percentual numeric(6,2),
  quantidade_produzida int,
  cmv_por_kg numeric(12,4),
  cmv_unitario numeric(12,4),
  created_at timestamptz default now()
);

-- ---------- CUSTOS (CMV consolidado por receita) ----------
create table if not exists custos (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  custo_ingredientes numeric(12,2) default 0,
  custo_embalagem numeric(12,2) default 0,
  custo_total numeric(12,2) default 0,
  quantidade_producao int,
  cmv_unitario numeric(12,4),
  calculado_em timestamptz default now()
);

-- ---------- TESTES ----------
create table if not exists testes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  numero int not null,
  descricao text,
  nota int check (nota between 0 and 10),
  aprovado boolean default false,
  created_at timestamptz default now()
);

-- ---------- REVISÕES (versionamento de receitas) ----------
create table if not exists revisoes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id) on delete cascade,
  versao int not null,
  snapshot jsonb not null, -- cópia completa da receita + itens no momento da revisão
  alteracoes jsonb, -- diff resumido (ex: {"Leite": {"de": 14, "para": 15}})
  motivo text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now()
);

-- ---------- CHECKLISTS ----------
create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid,
  tipo text check (tipo in ('producao','qualidade')),
  itens jsonb not null, -- [{"item": "Ingredientes separados", "ok": true}, ...]
  aprovacao_producao boolean default false,
  aprovacao_qualidade boolean default false,
  aprovacao_diretoria boolean default false,
  created_at timestamptz default now()
);

-- ---------- PRODUÇÕES ----------
create table if not exists producoes (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid references receitas(id),
  data date not null default current_date,
  lote text,
  operador_id uuid references usuarios(id),
  quantidade_teorica int,
  quantidade_real int,
  rendimento_teorico numeric(6,2),
  rendimento_real numeric(6,2),
  tempo_total text,
  observacoes text,
  created_at timestamptz default now()
);

alter table checklists
  add constraint checklists_producao_fk foreign key (producao_id) references producoes(id) on delete cascade;

-- ---------- UPLOADS (importador IA) ----------
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  arquivo_url text not null,
  tipo text default 'ficha_tecnica',
  status text default 'pendente' check (status in ('pendente','processando','revisao','aprovado','erro')),
  dados_extraidos jsonb,
  receita_id uuid references receitas(id),
  created_at timestamptz default now()
);

-- ---------- HISTÓRICO (log genérico de auditoria) ----------
create table if not exists historico (
  id uuid primary key default gen_random_uuid(),
  entidade text not null, -- ex: 'receita', 'materia_prima'
  entidade_id uuid not null,
  acao text not null, -- 'criado','atualizado','revisado','excluido'
  usuario_id uuid references usuarios(id),
  detalhes jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_receita_itens_receita on receita_itens(receita_id);
create index if not exists idx_receita_itens_mp on receita_itens(materia_prima_id);
create index if not exists idx_historico_precos_mp on historico_precos(materia_prima_id);
create index if not exists idx_revisoes_receita on revisoes(receita_id);
create index if not exists idx_producoes_receita on producoes(receita_id);
create index if not exists idx_materias_primas_categoria on materias_primas(categoria_id);
create index if not exists idx_receitas_categoria on receitas(categoria_id);

-- ============================================================
-- TRIGGER: recalcula valor_total do item da receita
-- ============================================================
create or replace function calc_valor_total_item()
returns trigger as $$
begin
  new.valor_total := coalesce(new.quantidade,0) * coalesce(new.valor_unitario,0);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calc_valor_total on receita_itens;
create trigger trg_calc_valor_total
  before insert or update on receita_itens
  for each row execute function calc_valor_total_item();

-- ============================================================
-- TRIGGER: ao inserir novo preço em historico_precos, atualiza materia_prima
-- ============================================================
create or replace function atualiza_preco_materia_prima()
returns trigger as $$
begin
  update materias_primas
  set preco_atual = new.preco,
      ultima_compra = new.data,
      preco_minimo = least(coalesce(preco_minimo, new.preco), new.preco),
      preco_maximo = greatest(coalesce(preco_maximo, new.preco), new.preco),
      preco_medio = (
        select avg(preco) from historico_precos where materia_prima_id = new.materia_prima_id
      ),
      updated_at = now()
  where id = new.materia_prima_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_atualiza_preco on historico_precos;
create trigger trg_atualiza_preco
  after insert on historico_precos
  for each row execute function atualiza_preco_materia_prima();
