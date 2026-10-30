-- Window functions: guided worksheet. See README.md in this directory.
-- Run the whole file in one psql session, then add your solutions below each task.
-- The temporary view disappears at session end; source tables are not modified.

-- 1. GRAIN: one row per completed order. LEFT JOIN retains a completed order
-- with no lines; COALESCE gives it zero revenue. NULL discount means no discount.
CREATE OR REPLACE TEMP VIEW window_lab_order_revenue AS
SELECT o.order_id, o.customer_id, o.order_date,
       COALESCE(SUM(i.quantity * i.unit_price *
                    (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0) AS revenue
FROM orders AS o
LEFT JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY o.order_id, o.customer_id, o.order_date;

-- Predict: how many rows for order 101 before and after aggregation?
SELECT o.order_id, i.line_no, i.quantity, i.unit_price, i.discount_pct
FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.order_id = 101 ORDER BY i.line_no;
SELECT * FROM window_lab_order_revenue WHERE order_id = 101;

-- Self-check: no rows should appear if the view has one row per order.
SELECT order_id, COUNT(*) AS copies
FROM window_lab_order_revenue GROUP BY order_id HAVING COUNT(*) <> 1;

-- Self-check: every completed order should appear, even if it has no lines.
SELECT o.order_id FROM orders AS o
WHERE o.status = 'completed'
  AND NOT EXISTS (SELECT 1 FROM window_lab_order_revenue AS r
                  WHERE r.order_id = o.order_id);

-- 2. GROUP VERSUS WINDOW: predict row counts, then compare totals.
SELECT customer_id, SUM(revenue) AS customer_revenue
FROM window_lab_order_revenue
GROUP BY customer_id ORDER BY customer_id;

SELECT customer_id, order_id, revenue,
       SUM(revenue) OVER (PARTITION BY customer_id) AS customer_revenue
FROM window_lab_order_revenue
ORDER BY customer_id, order_date, order_id;

-- TODO: For every completed order, add (a) number of completed orders for
-- its customer and (b) the order's share of customer revenue. Use NULLIF for
-- a zero customer total. Compare the output row count with the input count.
-- Write your query here:


-- 3. RANKING: first calculate totals at customer grain. Then, per city,
-- calculate ROW_NUMBER (break ties with customer_id), RANK and DENSE_RANK
-- (preserve revenue ties). Include customers with completed orders only.
-- TODO: Fill in your query; use a CTE for customer totals and a second query
-- level for the three windows. Sort the output for inspection.
-- Write your query here:


-- 4. PREVIOUS ORDER: for each completed order calculate LAG(revenue), change,
-- and percentage change, ordered by date then order ID within each customer.
-- Hint: calculate LAG in a CTE, then use its result in the outer SELECT.
-- Return NULL for percentage change when there is no previous value or it is 0.
-- TODO: Write your query and compare March-only filtering before versus after
-- the window. Record a customer for whom the two results differ.
-- Write your query here:


-- 5. FRAMES: predict all values in the guide's table, then calculate:
-- (a) sum over ROWS UNBOUNDED PRECEDING ordered by order_date, order_id;
-- (b) sum with ORDER BY order_date and no explicit frame; and
-- (c) average over ROWS BETWEEN 2 PRECEDING AND CURRENT ROW, date then ID.
-- Partition each by customer_id. Display customer 1 ordered by date and ID.
-- Then compare the default frame and ROWS using the SAME ordering: first
-- date and ID for both, then date alone for both. Tied dates in a date-only
-- ROWS window do not have a guaranteed order.
-- TODO: Write your query here:


-- 6. FILTER AFTER A WINDOW: find customers at the two highest distinct
-- revenue levels per city, including ties, for customers with at least one
-- completed order. First aggregate customer totals;
-- calculate DENSE_RANK in a CTE; filter rank <= 2 in an outer SELECT.
-- TODO: Write your query here:


-- OPTIONAL: LAST_VALUE and frames, missing calendar months, or the first
-- cumulative threshold crossing. See the guide for the questions.
