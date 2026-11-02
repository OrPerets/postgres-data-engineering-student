# SQL Views

A **[view](https://www.postgresql.org/docs/current/sql-createview.html)** is a named query that you can use like a table in a `SELECT`. A regular view stores the query definition; PostgreSQL evaluates it when you query the view, using the current data in its underlying tables.

<div id="sql-view-flow">
  <div class="view-heading"><h3>Stored rows. A saved rule. A fresh result.</h3><span class="text-small">Interactive illustration</span></div>
  <div class="viz-controls view-controls">
    <label class="form-check"><input class="form-check-input" type="checkbox" data-view-complete><span class="form-check-label">Complete order 102</span></label>
    <button type="button" class="btn btn-primary" data-view-query>Query the view</button>
  </div>
  <svg class="view-scene" role="img" aria-labelledby="view-scene-title view-scene-desc">
    <title id="view-scene-title">A regular SQL view reads stored rows on each query</title>
    <desc id="view-scene-desc">The orders table stores three rows. The completed_orders view stores a filter for completed orders. Querying it returns orders 101 and 103. Change order 102, then query again.</desc>
  </svg>
  <p class="text-small view-feedback" role="status" aria-live="polite" data-view-feedback>Change order 102, then query the view again.</p>
  <noscript>This illustration needs JavaScript. The SQL examples below show how to query a view.</noscript>
</div>

*Illustration with sample rows. Run real SQL in the examples below.*

<div class="useful-sql-examples" data-useful-sql="views" markdown="1">

## Create and query a view

`CREATE VIEW` gives a name to a `SELECT`. Here the view selects only completed orders and exposes three columns:

```sql
CREATE TEMP VIEW completed_orders AS
SELECT order_id, customer_id, order_date
FROM orders
WHERE status = 'completed';

SELECT * FROM completed_orders
ORDER BY order_id
LIMIT 10;
```

`TEMP` makes this view available only in the current database session. For a persistent view in a database where you have permission, use `CREATE VIEW` without `TEMP`. The view does not copy the rows.

## Build a reusable calculation

A view can hide a longer join and aggregation behind a meaningful name. This example calculates revenue per completed order, including orders with no item lines:

```sql
CREATE TEMP VIEW completed_order_revenue AS
SELECT o.order_id, o.customer_id,
       COALESCE(SUM(i.quantity * i.unit_price *
           (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric(12,2) AS revenue
FROM orders AS o
LEFT JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY o.order_id, o.customer_id;

SELECT customer_id, SUM(revenue) AS total_revenue
FROM completed_order_revenue
GROUP BY customer_id
ORDER BY customer_id;
```

The view is one row per order; the final query groups those rows by customer. Use a view like this when several reports need the same calculation.

## Query a view like a table

You can filter and sort a view just as you would a table. The following example defines its own view because each run is independent:

```sql
CREATE TEMP VIEW completed_orders AS
SELECT order_id, customer_id, order_date
FROM orders
WHERE status = 'completed';

SELECT order_id, order_date
FROM completed_orders
WHERE customer_id = 1
ORDER BY order_date, order_id;
```

</div>

## Why and when to use views

- **Reuse:** give a common join, filter, or calculation one name that multiple queries can use.
- **Clarity:** make reports easier to read by describing an intermediate result.
- **A stable interface:** expose selected columns or calculated fields while keeping the underlying design separate from consuming queries.
- **Controlled access:** views can be part of an access design that exposes selected data. Appropriate PostgreSQL ownership, privileges, and security settings are still necessary; a view alone is not a complete security policy.

## Change or remove a view

`CREATE OR REPLACE VIEW` can update a compatible view definition; PostgreSQL places restrictions on changing existing output columns. `DROP VIEW view_name;` removes the view definition, not its underlying tables. Check dependencies before changing or dropping a view used by other queries.

Continue to [Useful SQL patterns](01-useful-sql.md) for CTEs, `CASE`, and missing-value handling.
