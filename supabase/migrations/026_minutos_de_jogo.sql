-- Banco de Minutos: GANHAR continua R$ 1 = 1 min. USAR passa a ser 1 min de saldo = 1 min de JOGO
-- (o valor em R$ é calculado pelo preço/hora do atendimento). Minutos só pagam tempo, não consumo.

alter table public.pagamentos add column if not exists minutos_usados integer check (minutos_usados is null or minutos_usados > 0);

-- Desconto do saldo ao registrar pagamento em minutos (usa minutos_usados; pagamentos antigos: R$ 1 = 1 min)
create or replace function privado.pagamento_minutos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid;
  v_pagador uuid;
  v_saldo integer;
  v_min integer;
begin
  if tg_op = 'INSERT' then
    select cliente_id into v_cliente from public.atendimentos where id = new.atendimento_id;
    v_pagador := coalesce(new.cliente_minutos_id, v_cliente);
    if new.forma = 'minutos' then
      if v_pagador is null then
        raise exception 'Pagamento com minutos: escolha de qual cliente sai o saldo';
      end if;
      v_min := coalesce(new.minutos_usados, ceil(new.valor)::integer);
      select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = v_pagador;
      if v_saldo < v_min then
        raise exception 'Saldo de minutos insuficiente (saldo: %)', v_saldo;
      end if;
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_pagador, -v_min, 'uso', new.id, new.atendimento_id);
    elsif new.forma = 'pacote' then
      if v_pagador is null then
        raise exception 'Pagamento com pacote: escolha de qual cliente sai o pacote';
      end if;
      select coalesce(sum(minutos), 0) into v_saldo from public.pacote_lancamentos where cliente_id = v_pagador;
      if v_saldo < new.minutos_pacote then
        raise exception 'Saldo do pacote insuficiente (saldo: % min)', v_saldo;
      end if;
      insert into public.pacote_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_pagador, -new.minutos_pacote, 'uso', new.id, new.atendimento_id);
    elsif v_cliente is not null and floor(new.valor) >= 1 then
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_cliente, floor(new.valor)::integer, 'bonus', new.id, new.atendimento_id);
    end if;
    return new;
  end if;

  insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno' from public.minutos_lancamentos where pagamento_id = old.id;
  insert into public.pacote_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno' from public.pacote_lancamentos where pagamento_id = old.id;
  return old;
end $$;

-- Ao encerrar: primeiro o pacote, depois os minutos — os dois cobrem só o TEMPO que ainda falta pagar
create or replace function privado.atendimento_desconta_minutos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_total numeric;
  v_pago numeric;
  v_saldo integer;
  v_valor numeric;
  v_jogado integer;
  v_cobre integer;
  v_falta_tempo numeric;
begin
  if new.cancelado_em is not null or (new.minutos_de is null and new.pacote_de is null) or new.inicio is null or not (new.valor_hora > 0) then
    return new;
  end if;
  select new.valor_uso + new.ajuste + coalesce((select sum(total) from public.consumos where atendimento_id = new.id), 0)
    into v_total;

  if new.pacote_de is not null then
    v_jogado := greatest(0, round(extract(epoch from (new.fim - new.inicio)) / 60))::integer;
    select coalesce(sum(minutos), 0) into v_saldo from public.pacote_lancamentos where cliente_id = new.pacote_de;
    v_cobre := least(v_jogado, v_saldo);
    select coalesce(sum(valor), 0) into v_pago from public.pagamentos where atendimento_id = new.id;
    v_valor := least(round(v_cobre * new.valor_hora / 60, 2), greatest(v_total, 0) - v_pago, new.valor_uso);
    if v_cobre > 0 and v_valor > 0 then
      insert into public.pagamentos (arena_id, atendimento_id, forma, valor, cliente_minutos_id, minutos_pacote)
      values (new.arena_id, new.id, 'pacote', v_valor, new.pacote_de, v_cobre);
    end if;
  end if;

  if new.minutos_de is not null then
    select coalesce(sum(valor), 0) into v_pago from public.pagamentos where atendimento_id = new.id;
    -- Só o tempo: o que falta pagar, no máximo o valor do uso
    v_falta_tempo := least(greatest(v_total - v_pago, 0), new.valor_uso);
    select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = new.minutos_de;
    v_cobre := least(ceil(v_falta_tempo * 60 / new.valor_hora)::integer, greatest(v_saldo, 0));
    v_valor := least(round(v_cobre * new.valor_hora / 60, 2), v_falta_tempo);
    if v_cobre > 0 and v_valor > 0 then
      insert into public.pagamentos (arena_id, atendimento_id, forma, valor, cliente_minutos_id, minutos_usados)
      values (new.arena_id, new.id, 'minutos', v_valor, new.minutos_de, v_cobre);
    end if;
  end if;
  return new;
end $$;
