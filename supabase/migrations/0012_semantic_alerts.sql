-- 0012_semantic_alerts.sql
-- Alertas por significado (embedding), evoluindo os alertas por palavra-chave.
-- Additivo: colunas novas em `alerts`. keyword-alerts existentes seguem com type='keyword'.

alter table alerts
  add column if not exists type            text not null default 'keyword',
  add column if not exists semantic_query  text,
  add column if not exists query_embedding vector(1536),
  add column if not exists threshold       real not null default 0.3;

-- check de type (idempotente)
alter table alerts drop constraint if exists alerts_type_check;
alter table alerts add constraint alerts_type_check check (type in ('keyword', 'semantic'));

comment on column alerts.type            is 'keyword = casa palavras exatas; semantic = casa por significado (embedding)';
comment on column alerts.semantic_query  is 'descrição do risco a detectar (ex: "cliente quer cancelar") — só p/ type=semantic';
comment on column alerts.query_embedding is 'embedding (1536d) de semantic_query, gerado ao criar/editar o alerta';
comment on column alerts.threshold       is 'similaridade mínima (cosseno) p/ disparar — default 0.3';

-- índice p/ buscar alertas semânticos ativos por tenant (checagem dentro do generate-embeddings)
create index if not exists idx_alerts_semantic_active
  on alerts (tenant_id) where type = 'semantic' and active;
