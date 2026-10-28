# SQL and Query Optimization — Student Lab

## Data model and rules

Tables:

- `customers(customer_id, full_name, city)`
- `orders(order_id, customer_id, order_date, status)`
- `order_items(order_id, line_no, product_name, category, quantity, unit_price, discount_pct)`

### Business Rules

1. **Completed orders:** Use completed orders only unless stated otherwise.
2. **Revenue exclusions:** Cancelled and returned orders do **not** contribute to revenue.
3. **Returns:** A returned order represents a full return.
4. **Discounts:** `discount_pct` represents a percentage between 0 and 100. `NULL` means no discount.
5. **Net revenue:** Calculate revenue for each order line using:
   ```sql
   quantity * unit_price * (1 - COALESCE(discount_pct, 0) / 100.0)
   ```

## Checklist

Check that outer joins keep customers without orders, that completed orders with zero revenue count, and that duplicate order item rows never inflate order counts. Be explicit about grouping grain (order, customer, city). Use deterministic ORDER BY where needed.

**The source PDF is the authoritative problem statement.** The database is a reproducible synthetic sample constructed for classroom practice.
