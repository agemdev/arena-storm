-- M8 fase 8b: textos e fotos do site de cada arena (públicos: é o conteúdo do site)
create table if not exists public.site_conteudo (
  arena_id uuid primary key references public.arenas on delete cascade,
  titulo text,            -- ex.: "O melhor *lobby gamer* da região" (*...* = destaque colorido)
  chamada text,           -- frase abaixo do título
  aviso text,             -- caixinha abaixo dos horários (ex.: corujão)
  numeros jsonb not null default '[]',   -- [{valor, label}]
  estrutura jsonb not null default '[]', -- [{icone, titulo, texto}]
  jogos jsonb not null default '[]',     -- ["CS2", ...]
  torneios jsonb not null default '[]',  -- [{data "2026-12-20", titulo, texto}]
  faq jsonb not null default '[]',       -- [{p, r}]
  fotos jsonb not null default '[]',     -- [{url, alt, grande}]
  atualizado_em timestamptz not null default now()
);
alter table public.site_conteudo enable row level security;
drop policy if exists "site: todos leem" on public.site_conteudo;
create policy "site: todos leem" on public.site_conteudo for select to anon, authenticated using (true);
drop policy if exists "site: admin insere" on public.site_conteudo;
create policy "site: admin insere" on public.site_conteudo for insert to authenticated with check (arena_id in (select privado.arenas_escrita()));
drop policy if exists "site: admin edita" on public.site_conteudo;
create policy "site: admin edita" on public.site_conteudo for update to authenticated
  using (arena_id in (select privado.arenas_escrita())) with check (arena_id in (select privado.arenas_escrita()));

-- Fotos do site: pasta = id da arena. Leitura pública; enviar/apagar só admin com licença em dia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "fotos: enviar" on storage.objects;
create policy "fotos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] in (select privado.arenas_escrita()::text));
drop policy if exists "fotos: apagar" on storage.objects;
create policy "fotos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] in (select privado.arenas_escrita()::text));

-- Arena Storm: textos que estavam no código
insert into public.site_conteudo (arena_id, titulo, chamada, aviso, numeros, estrutura, jogos, torneios, faq, fotos)
values (
  'bef31925-8dea-4578-9e4c-3de3e956796c',
  'O melhor *lobby gamer* da região',
  'PCs gamer, PlayStation 5, simulador de corrida, realidade virtual e um espaço completo pra você e sua crew.',
  '🌙 Corujão das 22h às 6h. Reserve com antecedência!',
  '[{"valor":"10","label":"PCs gamer"},{"valor":"4","label":"PlayStation 5"},{"valor":"240","label":"FPS em 180Hz"}]',
  '[{"icone":"🖥️","titulo":"10 PCs Gamer","texto":"AMD Ryzen, placa de vídeo 8GB e 32GB de RAM. Monitores 180Hz rodando até 240 FPS."},
    {"icone":"🎮","titulo":"4 PlayStation 5","texto":"Os exclusivos e os competitivos do momento, pra jogar sozinho ou com a crew."},
    {"icone":"🏎️","titulo":"Simulador de Corrida","texto":"PC dedicado com volante e pedais Logitech G29. Sensação de pista de verdade."},
    {"icone":"🥽","titulo":"Realidade Virtual","texto":"Óculos VR standalone. Sessões de 30 minutos pra entrar no jogo de corpo inteiro."},
    {"icone":"🕹️","titulo":"Nintendo Switch","texto":"Diversão pra todas as idades, perfeito pra jogar em grupo e com a família."},
    {"icone":"🏆","titulo":"Campeonatos","texto":"Torneios na arena com a comunidade. Inscrição e detalhes pelo WhatsApp."}]',
  '["Counter-Strike 2","Valorant","FC 26","Fortnite","GTA V","GTA VI","League of Legends","Rocket League","Call of Duty","Free Fire","Exclusivos PS5"]',
  '[{"data":"2026-12-20","titulo":"Camp de FC 26","texto":"20 de dezembro de 2026"},{"data":"2027-01-16","titulo":"Counter-Strike 2","texto":"16 e 17 de janeiro de 2027"}]',
  '[{"p":"Como faço pra reservar?","r":"Chama a gente no WhatsApp com o dia, horário e quantas pessoas. A equipe confirma rapidinho."},
    {"p":"Quais jogos estão disponíveis?","r":"Counter-Strike 2, Valorant, FC 26, Fortnite, GTA V, GTA VI, League of Legends, Rocket League, Call of Duty, Free Fire, Exclusivos PS5. Quer algo específico? Avisa a equipe que a gente instala."},
    {"p":"Posso fazer aniversário na Arena?","r":"Pode! Temos pacotes de festa — veja os valores na seção Preços e agende pelo WhatsApp."},
    {"p":"Preciso levar meu equipamento?","r":"Não. Headset, teclado, mouse e monitor estão inclusos. Se preferir, pode trazer seu headset ou mousepad."},
    {"p":"Tem comida e bebida?","r":"Tem lanches e bebidas na arena. E o ambiente é climatizado."}]',
  '[{"url":"/fotos/pcs-neon.jpg","alt":"PCs gamer com luz neon","grande":true},
    {"url":"/fotos/simulador.jpg","alt":"Criança no simulador de corrida"},
    {"url":"/fotos/ps5.jpg","alt":"Crianças jogando PlayStation 5"},
    {"url":"/fotos/pcs.jpg","alt":"Arena cheia nos PCs"},
    {"url":"/fotos/criancas.jpg","alt":"Crianças jogando nos PCs"},
    {"url":"/fotos/fachada.jpg","alt":"Fachada da Arena Storm à noite","grande":true},
    {"url":"/fotos/ambiente.jpg","alt":"Ambiente da arena com geladeira de bebidas"},
    {"url":"/fotos/festa.jpg","alt":"Arena decorada para festa de aniversário"}]'
) on conflict (arena_id) do nothing;
