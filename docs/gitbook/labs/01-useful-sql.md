# Useful SQL patterns

Use these PostgreSQL patterns to break a problem into steps, classify rows, and handle missing values. The examples use the lab's `customers`, `orders`, and `order_items` tables. Run each example below on the browser’s sample data, or try it in a [practice editor](01-tutorial-practice.md#lab01-practice). Results show up to 100 rows.

<div class="useful-sql-examples" data-useful-sql markdown="1">

## CTE · Name an intermediate result

A common table expression (CTE) gives a query result a name for the current SQL statement. Use `WITH` to separate calculation from filtering.

```sql
WITH city_customers AS (
    SELECT city, COUNT(*) AS customer_count
    FROM customers
    GROUP BY city
)
SELECT city, customer_count
FROM city_customers
WHERE customer_count >= 2
ORDER BY city;
```

The inner query produces one row per city; the outer query filters those grouped rows. A CTE helps organize a query but does not automatically make it faster.

## CASE · Choose a value by condition

`CASE` returns the result of the first condition that is true. The `ELSE` branch covers all other rows.

```sql
SELECT order_id, status,
       CASE
           WHEN status = 'completed' THEN 'Finished'
           WHEN status = 'pending' THEN 'In progress'
           ELSE 'Other'
       END AS order_stage
FROM orders
ORDER BY order_id;
```

## Conditional aggregation · Count by condition

Use `CASE` inside an aggregate to calculate several counts in the same group.

```sql
SELECT customer_id,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM orders
GROUP BY customer_id
ORDER BY customer_id;
```

Each order contributes either 1 or 0 to each count. PostgreSQL also supports `COUNT(*) FILTER (WHERE status = 'completed')`.

## COALESCE · Provide a fallback

`COALESCE` returns the first non-NULL argument. Here it treats a missing discount as zero when calculating line revenue:

```sql
SELECT order_id, line_no, discount_pct,
       quantity * unit_price * (1 - COALESCE(discount_pct, 0) / 100.0) AS line_revenue
FROM order_items
ORDER BY order_id, line_no;
```

Choose a fallback only when it matches the business rule: a missing value is not always zero.

## NULLIF · Handle a zero denominator

`NULLIF(a, b)` returns NULL if the values are equal; otherwise it returns `a`. Use it to avoid division by zero:

```sql
WITH city_counts AS (
    SELECT COALESCE(city, 'Unknown') AS city, COUNT(*) AS customer_count
    FROM customers
    GROUP BY COALESCE(city, 'Unknown')
)
SELECT city, customer_count,
       ROUND(100.0 * customer_count / NULLIF(SUM(customer_count) OVER (), 0), 2) AS customer_share_pct
FROM city_counts
ORDER BY city;
```

If the denominator is zero, the division returns NULL rather than an error. `100.0` preserves a fractional percentage.

</div>

Continue to [Tutorial & practice](01-tutorial-practice.md) to apply these patterns.
