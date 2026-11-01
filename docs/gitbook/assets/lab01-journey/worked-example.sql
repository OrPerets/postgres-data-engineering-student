-- Worked example: customer 1's completed orders in the synthetic Lab 01 data.
-- One row per completed order, followed by a running total.
-- This SELECT does not change source tables or exercise answers.
WITH completed_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
                        (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0) AS revenue
    FROM orders AS o
    LEFT JOIN order_items AS i ON i.order_id = o.order_id
    WHERE o.customer_id = 1 AND o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
)
SELECT order_id, customer_id, order_date, revenue,
       SUM(revenue) OVER (
           PARTITION BY customer_id
           ORDER BY order_date, order_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM completed_order_revenue
ORDER BY order_date, order_id;
