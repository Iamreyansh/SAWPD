-- Atomic stock decrement function — prevents overselling via race conditions
-- Returns the new stock_count, or -1 if insufficient stock.

create or replace function decrement_stock(p_product_id text, p_qty integer)
returns integer
language plpgsql
as $$
declare
  new_stock integer;
begin
  update products
  set stock_count = stock_count - p_qty
  where id = p_product_id
    and stock_count >= p_qty
  returning stock_count into new_stock;

  if new_stock is null then
    return -1;
  end if;
  return new_stock;
end;
$$;

-- Atomic stock increment — used for rollback when order insert fails after decrement.

create or replace function increment_stock(p_product_id text, p_qty integer)
returns integer
language plpgsql
as $$
declare
  new_stock integer;
begin
  update products
  set stock_count = stock_count + p_qty
  where id = p_product_id
  returning stock_count into new_stock;

  if new_stock is null then
    return -1;
  end if;
  return new_stock;
end;
$$;

-- Sum revenue for orders matching given statuses.

create or replace function sum_orders_total(p_store_slug text, p_statuses text[])
returns integer
language sql
as $$
  select coalesce(sum(total), 0)::integer
  from orders
  where store_slug = p_store_slug
    and status = any(p_statuses::order_status[]);
$$;

-- Sum discount amounts for a store.

create or replace function sum_discounts(p_store_slug text)
returns integer
language sql
as $$
  select coalesce(sum(discount_amount), 0)::integer
  from orders
  where store_slug = p_store_slug;
$$;

-- Count orders with non-null discount for a store.

create or replace function count_discounted_orders(p_store_slug text)
returns integer
language sql
as $$
  select count(*)::integer
  from orders
  where store_slug = p_store_slug
    and discount_amount is not null;
$$;
