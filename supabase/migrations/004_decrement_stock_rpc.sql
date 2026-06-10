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
