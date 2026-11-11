-- M6 fase 6c: consoles (PS5, Switch, VR) ligados/desligados pelo ping do Servidor
-- mac: endereço físico (aa-bb-cc-dd-ee-ff) → Servidor acha o IP novo sozinho
alter table public.equipamentos
  add column if not exists mac text,
  add column if not exists rede_online boolean,
  add column if not exists rede_visto_em timestamptz;

alter table public.equipamentos
  drop constraint if exists equipamentos_mac_formato,
  add constraint equipamentos_mac_formato check (mac is null or mac ~ '^([0-9a-f]{2}-){5}[0-9a-f]{2}$');
