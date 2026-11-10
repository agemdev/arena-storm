-- Banco de Minutos: pagar com o saldo de outro cliente, minutos de promoção
-- e desconto automático ao encerrar ("usar minutos de" marcado no atendimento).

-- 1) De quem sai o saldo no pagamento em minutos (vazio = o próprio cliente do atendimento)
alter table public.pagamentos add column cliente_minutos_id uuid references public.clientes (id);

-- 2) Atendimento marcado para pagar com minutos de alguém
alter table public.atendimentos add column minutos_de uuid references public.clientes (id) on delete set null;

-- 3) Extrato: motivo "promocao" + observação
alter table public.minutos_lancamentos drop constraint minutos_lancamentos_motivo_check;
alter table public.minutos_lancamentos
  add constraint minutos_lancamentos_motivo_check check (motivo in ('bonus', 'uso', 'estorno', 'ajuste', 'promocao')),
  add column obs text;

-- O admin só pode lançar crédito de promoção (o resto é sempre automático)
create policy "admin dá promoção" on public.minutos_lancamentos for insert to authenticated
  with check (
    arena_id in (select privado.minhas_arenas())
    and motivo = 'promocao' and minutos > 0 and minutos <= 10000
    and pagamento_id is null and atendimento_id is null
  );

-- 4) Pagamento em minutos usa o saldo de quem foi escolhido
create or replace function privado.pagamento_minutos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_cliente uuid;   -- cliente do atendimento (ganha bônus)
  v_pagador uuid;   -- de quem saem os minutos
  v_saldo integer;
  v_min integer;
begin
  if tg_op = 'INSERT' then
    select cliente_id into v_cliente from public.atendimentos where id = new.atendimento_id;
    if new.forma = 'minutos' then
      v_pagador := coalesce(new.cliente_minutos_id, v_cliente);
      if v_pagador is null then
        raise exception 'Pagamento com minutos: escolha de qual cliente sai o saldo';
      end if;
      v_min := ceil(new.valor)::integer;
      select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = v_pagador;
      if v_saldo < v_min then
        raise exception 'Saldo de minutos insuficiente (saldo: %)', v_saldo;
      end if;
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_pagador, -v_min, 'uso', new.id, new.atendimento_id);
    elsif v_cliente is not null and floor(new.valor) >= 1 then
      insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo, pagamento_id, atendimento_id)
      values (new.arena_id, v_cliente, floor(new.valor)::integer, 'bonus', new.id, new.atendimento_id);
    end if;
    return new;
  end if;

  -- DELETE: lança o contrário do que esse pagamento gerou
  insert into public.minutos_lancamentos (arena_id, cliente_id, minutos, motivo)
  select arena_id, cliente_id, -minutos, 'estorno'
  from public.minutos_lancamentos where pagamento_id = old.id;
  return old;
end $$;

-- 5) Ao encerrar o tempo (na mão, no fim combinado ou pelo Servidor): desconta os minutos sozinho
create or replace function privado.atendimento_desconta_minutos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_total numeric;
  v_pago numeric;
  v_saldo integer;
  v_valor numeric;
begin
  if new.minutos_de is null or new.cancelado_em is not null then
    return new;
  end if;
  select new.valor_uso + new.ajuste + coalesce((select sum(total) from public.consumos where atendimento_id = new.id), 0)
    into v_total;
  select coalesce(sum(valor), 0) into v_pago from public.pagamentos where atendimento_id = new.id;
  select coalesce(sum(minutos), 0) into v_saldo from public.minutos_lancamentos where cliente_id = new.minutos_de;
  v_valor := least(greatest(v_total, 0) - v_pago, v_saldo); -- até onde o saldo der
  if v_valor > 0 then
    insert into public.pagamentos (arena_id, atendimento_id, forma, valor, cliente_minutos_id)
    values (new.arena_id, new.id, 'minutos', v_valor, new.minutos_de);
  end if;
  return new;
end $$;
revoke execute on function privado.atendimento_desconta_minutos() from public, anon, authenticated;

create trigger atendimentos_desconta_minutos after update of fim on public.atendimentos
  for each row when (old.fim is null and new.fim is not null)
  execute function privado.atendimento_desconta_minutos();
