# Tutorial & practice — Lab 01

[Jump to the questions and SQL editors ↓](#lab01-practice)

<a id="1-meet-the-data"></a><a id="business-rules-for-the-questions"></a>

Review [the lab's tables and business rules](01-relational-sql.md#the-labs-data) before starting.

## Follow one customer's order journey {#order-journey}

Choose **JOIN**, **GROUP BY** or **Window**, then press **Play**. In **GROUP BY**, watch empty working memory fill before any output appears.

<div id="lab01-order-journey" data-lab01-order-journey markdown="1">
<div data-journey-fallback markdown="1">

This small example uses customer 1's completed orders **101, 102 and 103**, with **5 item lines** from the actual synthetic lab data.

| Stage | Rows | What one row represents |
|---|---:|---|
| JOIN | 5 | One matching item line; an order can appear more than once |
| GROUP BY order | 3 | One order, with the revenue of its lines added together |
| Window running total | 3 | One order, with cumulative revenue beside it |

Order **101** combines **100 + 200 = 300**; order **102** combines **150 + 50 = 200**; order **103** has one line worth **200**. Grouping combines lines into orders. The window keeps those three order rows.

The default grouping demonstration first reads the five lines to create an empty group for each distinct order ID. It reads the lines again to assign each member and update its group's sum. Only then does it emit the three output rows. The alternative **One-pass SUM** creates groups as needed and updates their sums during a single scan, without retaining member references. Both produce the same totals.

These teaching models count illustrated work and retained state: the first makes **10 input reads** and retains **5 member references**; the second makes **5 input reads** and retains **0 member references**. Both hold **3 group sums**. These counts exclude the displayed source and output tables; they are not measurements of PostgreSQL memory or execution time. Inspect an actual query with [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/16/sql-explain.html) to see its chosen execution plan.

| Order | Date | Order revenue | Running total |
|---|---|---:|---:|
| 101 | 2026-01-05 | 300 | 300 |
| 102 | 2026-02-05 | 200 | 500 |
| 103 | 2026-02-05 | 200 | 700 |

The running total uses `ORDER BY order_date, order_id` and `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. The order ID resolves the two February 5 orders into a deterministic sequence.

</div>
<noscript>The tables above explain the three illustrated transformations. Enable JavaScript for the animation and browser SQL runner.</noscript>
</div>

<div class="lab01-practice" id="lab01-practice" data-lab01-practice markdown="1">

<noscript>Enable JavaScript to run queries here. You can also use the optional Codespace routes later on this page.</noscript>

<div class="lab01-practice-layout" markdown="1">

<aside class="lab01-reference" aria-labelledby="lab01-reference-title"><p class="lab01-reference-title" id="lab01-reference-title"><strong>Tables &amp; schema</strong></p><p>One customer → many orders → many item lines. Expand a table to see its columns, sample rows, or the full table.</p><p class="lab01-reference-legend"><strong>PK</strong> primary key · <strong>FK</strong> foreign key · <strong>Required</strong> cannot be NULL</p><details data-reference-table="customers"><summary><code>customers</code> <span>one row per customer</span></summary><ul><li><code>customer_id</code> <span>integer · PK · required</span></li><li><code>full_name</code> <span>varchar(120) · required</span></li><li><code>city</code> <span>varchar(80) · nullable</span></li></ul><div class="lab01-reference-actions"><button type="button" data-sample="customers">Sample rows</button><button type="button" data-view-all="customers">View all rows</button></div><p data-reference-status role="status" aria-live="polite"></p><div class="lab01-reference-result" data-reference-result></div></details><details data-reference-table="orders"><summary><code>orders</code> <span>one row per order</span></summary><ul><li><code>order_id</code> <span>integer · PK · required</span></li><li><code>customer_id</code> <span>integer · FK → customers.customer_id · required</span></li><li><code>order_date</code> <span>date · required</span></li><li><code>status</code> <span>varchar(20) · required</span></li></ul><div class="lab01-reference-actions"><button type="button" data-sample="orders">Sample rows</button><button type="button" data-view-all="orders">View all rows</button></div><p data-reference-status role="status" aria-live="polite"></p><div class="lab01-reference-result" data-reference-result></div></details><details data-reference-table="order_items"><summary><code>order_items</code> <span>one row per item line</span></summary><ul><li><code>order_id</code> <span>integer · PK, FK → orders.order_id · required</span></li><li><code>line_no</code> <span>integer · PK · required</span></li><li><code>product_name</code> <span>text · required</span></li><li><code>category</code> <span>text · required</span></li><li><code>quantity</code> <span>integer · required</span></li><li><code>unit_price</code> <span>numeric(12,2) · required</span></li><li><code>discount_pct</code> <span>numeric(5,2) · nullable</span></li></ul><p>The primary key is the pair <code>(order_id, line_no)</code>.</p><div class="lab01-reference-actions"><button type="button" data-sample="order_items">Sample rows</button><button type="button" data-view-all="order_items">View all rows</button></div><p data-reference-status role="status" aria-live="polite"></p><div class="lab01-reference-result" data-reference-result></div></details><noscript>Enable JavaScript to load sample rows; the schema above remains available.</noscript></aside>

<div class="lab01-practice-questions" markdown="1">

<section class="lab01-question" data-question="1" markdown="1">

### Question 01

Display up to five orders from January 2026 that satisfy either condition: the order was completed and the customer is from Haifa, or the order was cancelled. The January date restriction applies to both cases.

<details><summary>Question 1 — Dates and conditions</summary><p>Which conditions must the January date restriction apply to? Check how parentheses affect the order of AND and OR.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-1">Your SQL for question 1</label>
<textarea id="lab01-sql-1" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
SELECT o.* FROM orders o JOIN customers c USING(customer_id)
WHERE o.order_date>=DATE '2026-01-01' AND o.order_date<DATE '2026-02-01'
 AND ((o.status='completed' AND c.city='Haifa') OR o.status='cancelled')
ORDER BY o.order_id LIMIT 5;
```

</details>

</section>

<section class="lab01-question" data-question="2" markdown="1">

### Question 02

For every customer, display the number of completed orders, total revenue, average revenue per completed order, and date of the most recent completed order. Include customers with no completed orders, showing zero for the count and revenue and NULL for the average and date. Completed orders with zero revenue still count.

<details><summary>Question 2 — Thinking guide</summary><ul>
<li>We need one result per customer, but an order can have several item lines. First, think about how to calculate one revenue value per completed order.</li>
<li>We need every customer, including those without completed orders, so consider which table should be on the left side of a <code>LEFT JOIN</code>.</li>
<li>If an order has no item lines or its revenue is zero, it is still a completed order. Count orders rather than item lines.</li>
<li>If a customer has no completed orders, what should be zero, and which values should remain <code>NULL</code>? Check the count, total, average and latest date separately.</li>
</ul></details>

<div class="lab01-editor">
<label for="lab01-sql-2">Your SQL for question 2</label>
<textarea id="lab01-sql-2" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
)
SELECT c.customer_id,c.full_name,count(r.order_id) AS completed_orders,
 coalesce(sum(r.revenue),0) AS total_revenue,avg(r.revenue) AS avg_order_revenue,
 max(r.order_date) AS last_completed_date
FROM customers c LEFT JOIN instructor_order_revenue r USING(customer_id)
GROUP BY c.customer_id,c.full_name ORDER BY c.customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="3" markdown="1">

### Question 03

Find customers who purchased from both the books and electronics categories in completed orders and have no returned orders anywhere in the dataset. The categories may occur in the same order or in different orders.

<details><summary>Question 3 — Thinking guide</summary><ul>
<li>We need customers who bought from <em>both</em> categories, so check each customer's completed orders across all their item lines.</li>
<li>If books and electronics appear in different completed orders, the customer can still qualify. Avoid requiring both categories on the same order or item line.</li>
<li>We also need no returned orders, so test that condition separately across the customer's orders.</li>
<li>Think about <code>EXISTS</code> and <code>NOT EXISTS</code>: how could each express one of these requirements without duplicating customers?</li>
</ul></details>

<div class="lab01-editor">
<label for="lab01-sql-3">Your SQL for question 3</label>
<textarea id="lab01-sql-3" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
SELECT c.customer_id,c.full_name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items i USING(order_id)
              WHERE o.customer_id=c.customer_id AND o.status='completed' AND i.category='books')
 AND EXISTS (SELECT 1 FROM orders o JOIN order_items i USING(order_id)
              WHERE o.customer_id=c.customer_id AND o.status='completed' AND i.category='electronics')
 AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.status='returned')
ORDER BY c.customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="4" data-storage-question="5" markdown="1">

### Question 04

For each city, display the number of customers, total number of orders, number of orders in each status, and percentage of orders that were completed. Include customers with no orders. Display missing cities as Unknown and return NULL for the percentage when a city has no orders.

**Before you begin:** First search and learn what `FILTER` is in SQL.

<details><summary>Question 4 — City summaries</summary><p>Build counts at the appropriate customer and order grains before combining them by city. Keep customers with no orders and consider a city with a zero-order denominator.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-4">Your SQL for question 4</label>
<textarea id="lab01-sql-4" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
SELECT coalesce(c.city,'Unknown') city, count(DISTINCT c.customer_id) customers,
 count(o.order_id) total_orders,
 count(o.order_id) FILTER (WHERE o.status='completed') completed,
 count(o.order_id) FILTER (WHERE o.status='cancelled') cancelled,
 count(o.order_id) FILTER (WHERE o.status='returned') returned,
 count(o.order_id) FILTER (WHERE o.status='pending') pending,
 100.0*count(o.order_id) FILTER (WHERE o.status='completed')/nullif(count(o.order_id),0) completed_pct
FROM customers c LEFT JOIN orders o USING(customer_id)
GROUP BY coalesce(c.city,'Unknown') ORDER BY city;
```

</details>

</section>

<section class="lab01-question" data-question="5" data-storage-question="6" markdown="1">

### Question 05

The following query is intended to count completed orders and calculate average revenue per completed order for every customer, including customers with no activity. Identify three logical errors and correct them. Then return only customers with at least two completed orders and total revenue of at least 500.

Query supplied in the assignment (to diagnose and correct):

```sql
SELECT c.customer_id, COUNT(*) AS completed_orders,
AVG(i.quantity * i.unit_price * (1 - COALESCE(i.discount_pct, 0) / 100.0)) AS avg_order_revenue
FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
LEFT JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.customer_id;
```

<details><summary>Question 5 — Debug an aggregate</summary><p>Trace what the WHERE filter does to unmatched customers, what each joined row represents, and whether the average is over order lines or orders. Check the requested output and final thresholds separately.</p></details>

You can include your written explanation as SQL comments, using `--`.

<div class="lab01-editor">
<label for="lab01-sql-5">Your SQL for question 5</label>
<textarea id="lab01-sql-5" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

The `WHERE` condition removes customers without a completed order; `COUNT(*)` counts joined rows rather than orders; and `AVG` averages item lines rather than order totals. The query below aggregates each order first.

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
)
SELECT c.customer_id,count(r.order_id) completed_orders,
 coalesce(sum(r.revenue),0) total_revenue,avg(r.revenue) avg_order_revenue
FROM customers c LEFT JOIN instructor_order_revenue r USING(customer_id)
GROUP BY c.customer_id
HAVING count(r.order_id)>=2 AND coalesce(sum(r.revenue),0)>=500 ORDER BY c.customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="6" data-storage-question="7" markdown="1">

### Question 06

Find customers whose city is known and whose city has no customer with a returned order. Customers without orders may qualify. Predict the result of the following query on the supplied data, explain its behavior, and correct it.

Query supplied in the assignment (to diagnose and correct):

```sql
SELECT customer_id, full_name, city
FROM customers
WHERE city NOT IN (
SELECT c.city
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'returned'
);
```

<details><summary>Question 6 — Missing cities and NOT IN</summary><p>What happens if the subquery produces a NULL city? Consider a way to test for the absence of a matching returned-order city while separately requiring the outer city to be known.</p></details>

You can include your written explanation as SQL comments, using `--`.

<div class="lab01-editor">
<label for="lab01-sql-6">Your SQL for question 6</label>
<textarea id="lab01-sql-6" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

The supplied query returns no rows for the sample data: its subquery includes a NULL city, so `NOT IN` is never true for a known city without a match. `NOT EXISTS` tests matching known cities directly.

```sql
SELECT c.customer_id,c.full_name,c.city FROM customers c
WHERE c.city IS NOT NULL AND NOT EXISTS (
SELECT 1 FROM customers bad JOIN orders o ON o.customer_id=bad.customer_id
WHERE bad.city=c.city AND o.status='returned')
ORDER BY c.customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="7" data-storage-question="8" markdown="1">

### Question 07

Calculate total revenue for each customer with at least one completed order. Within each city, return all customers at the two highest distinct revenue levels, including ties. Display ROW_NUMBER, RANK, and DENSE_RANK. Break ties in ROW_NUMBER by ascending customer_id, while preserving revenue ties in the other rankings.

<details><summary>Question 7 — Revenue ranks</summary><p>Compute each customer's revenue first. Compare what ROW_NUMBER, RANK and DENSE_RANK do with equal revenue; a tie-breaker used for row numbering should not break revenue ties in the other rankings.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-7">Your SQL for question 7</label>
<textarea id="lab01-sql-7" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
),
totals AS (
 SELECT c.customer_id,c.full_name,coalesce(c.city,'Unknown') city,sum(r.revenue) revenue
 FROM customers c JOIN instructor_order_revenue r USING(customer_id)
 GROUP BY c.customer_id,c.full_name,coalesce(c.city,'Unknown')
), ranks AS (
 SELECT *,
 row_number() OVER(PARTITION BY city ORDER BY revenue DESC,customer_id) row_number,
 rank() OVER(PARTITION BY city ORDER BY revenue DESC) rank,
 dense_rank() OVER(PARTITION BY city ORDER BY revenue DESC) dense_rank
 FROM totals)
SELECT * FROM ranks WHERE dense_rank<=2 ORDER BY city,dense_rank,customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="8" data-storage-question="9" markdown="1">

### Question 08

For every completed order, display its revenue, the previous completed order’s revenue, the percentage change, cumulative revenue, and a moving average over up to the three most recent completed orders, including the current order. Calculate these separately for each customer, ordered by date and then order ID. Return NULL for percentage change when there is no previous order or its revenue is zero.

<details><summary>Question 8 — Order history</summary><p>Compute one revenue value per completed order, then consider windows partitioned by customer and ordered by date and order ID. Define the moving frame and protect percentage calculations when the previous value is absent or zero.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-8">Your SQL for question 8</label>
<textarea id="lab01-sql-8" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
),
w AS (
 SELECT r.*,
 lag(revenue) OVER(PARTITION BY customer_id ORDER BY order_date,order_id) previous_revenue,
 sum(revenue) OVER(PARTITION BY customer_id ORDER BY order_date,order_id ROWS UNBOUNDED PRECEDING) running_revenue,
 avg(revenue) OVER(PARTITION BY customer_id ORDER BY order_date,order_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) moving_avg_3
 FROM instructor_order_revenue r)
SELECT *,100*(revenue-previous_revenue)/nullif(previous_revenue,0) percent_change
FROM w ORDER BY customer_id,order_date,order_id;
```

</details>

</section>

<section class="lab01-question" data-question="9" data-storage-question="10" markdown="1">

### Question 09

For each customer with a completed order, identify the category in which they spent the most. Break ties alphabetically by category name. Display the category’s revenue and its percentage of the customer’s total revenue. Return NULL for the percentage when total revenue is zero.

The schema permits completed orders without item lines. If a customer has no categories in their completed orders, the question does not specify how to represent their result; ask your instructor for clarification.

<details><summary>Question 9 — Top category</summary><p>Summarize revenue at customer-and-category grain, then choose one category per customer with a deterministic tie-break. Compare that amount with the customer's total, including the zero-total case.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-9">Your SQL for question 9</label>
<textarea id="lab01-sql-9" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

This example returns customers who have at least one category in a completed order. The question leaves customers with only itemless completed orders unspecified.

```sql
WITH categories AS (
SELECT o.customer_id,i.category,
 sum(i.quantity*i.unit_price*(1-coalesce(i.discount_pct,0)/100.0)) revenue
FROM orders o JOIN order_items i USING(order_id)
WHERE o.status='completed' GROUP BY o.customer_id,i.category
), w AS (
SELECT *,sum(revenue) OVER(PARTITION BY customer_id) customer_revenue,
 row_number() OVER(PARTITION BY customer_id ORDER BY revenue DESC,category) rn FROM categories)
SELECT customer_id,category,revenue,100*revenue/nullif(customer_revenue,0) pct_customer
FROM w WHERE rn=1 ORDER BY customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="10" data-storage-question="11" markdown="1">

### Question 10

Produce exactly three rows for every customer, covering January, February, and March 2026. Display monthly revenue, the previous month’s revenue, and the percentage change. Show zero revenue for months without purchases. For January, return NULL for the previous month’s revenue and percentage change. Also return NULL for percentage change when the previous month’s revenue is zero.

<details><summary>Question 10 — Complete months</summary><p>Make sure each customer has a row for each of the three months before comparing adjacent months. Distinguish the first month from a previous month with zero revenue.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-10">Your SQL for question 10</label>
<textarea id="lab01-sql-10" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
),
months AS (
SELECT generate_series(DATE '2026-01-01',DATE '2026-03-01',interval '1 month')::date month_start
), monthly AS (
SELECT customer_id,date_trunc('month',order_date)::date month_start,sum(revenue) revenue
FROM instructor_order_revenue GROUP BY 1,2
), spine AS (
SELECT c.customer_id,m.month_start,coalesce(r.revenue,0) revenue
FROM customers c CROSS JOIN months m LEFT JOIN monthly r USING(customer_id,month_start)
), w AS (
SELECT *,lag(revenue) OVER(PARTITION BY customer_id ORDER BY month_start) previous_revenue FROM spine)
SELECT *,100*(revenue-previous_revenue)/nullif(previous_revenue,0) pct_change FROM w
ORDER BY customer_id,month_start;
```

</details>

</section>

<section class="lab01-question" data-question="11" data-storage-question="12" markdown="1">

### Question 11

Find customers who purchased from every category sold in a completed order anywhere in the dataset. Determine the required categories from the data. Purchases with a 100 percent discount still count. If no category has been sold, return an empty result. Provide two different solutions.

<details><summary>Question 11 — Every sold category</summary><p>Derive the required category set from completed orders, and compare each customer's coverage with that set. A free purchase still counts; handle an empty required set explicitly.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-11">Your SQL for question 11</label>
<textarea id="lab01-sql-11" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

Two approaches are shown: double `NOT EXISTS`, and counting distinct categories.

**Solution 1**

```sql
SELECT c.customer_id FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o JOIN order_items i USING(order_id) WHERE o.status='completed')
AND NOT EXISTS (
 SELECT 1 FROM (SELECT DISTINCT i.category FROM orders o JOIN order_items i USING(order_id)
                WHERE o.status='completed') needed
 WHERE NOT EXISTS (SELECT 1 FROM orders o JOIN order_items i USING(order_id)
                   WHERE o.customer_id=c.customer_id AND o.status='completed' AND i.category=needed.category))
ORDER BY c.customer_id;
```

**Solution 2**

```sql
WITH required AS (
 SELECT count(DISTINCT i.category) n FROM orders o JOIN order_items i USING(order_id) WHERE o.status='completed'
), purchased AS (
SELECT o.customer_id,count(DISTINCT i.category) n FROM orders o JOIN order_items i USING(order_id)
WHERE o.status='completed' GROUP BY o.customer_id)
SELECT p.customer_id FROM purchased p CROSS JOIN required r WHERE r.n>0 AND p.n=r.n ORDER BY p.customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="12" data-storage-question="13" markdown="1">

### Question 12

Find pairs of different products purchased together in at least two completed orders. Count each order once per pair, even when a product appears on multiple lines. Display each pair once, with the alphabetically smaller product name first, together with the number of orders containing the pair.

<details><summary>Question 12 — Product pairs</summary><p>Start with unique products per completed order, then form pairs in a consistent alphabetical order. What must you count so repeated lines in one order cannot inflate the result?</p></details>

<div class="lab01-editor">
<label for="lab01-sql-12">Your SQL for question 12</label>
<textarea id="lab01-sql-12" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH product_order AS (
 SELECT DISTINCT o.order_id,i.product_name FROM orders o JOIN order_items i USING(order_id)
 WHERE o.status='completed')
SELECT a.product_name product_a,b.product_name product_b,count(*) orders_together
FROM product_order a JOIN product_order b ON a.order_id=b.order_id AND a.product_name<b.product_name
GROUP BY 1,2 HAVING count(*)>=2 ORDER BY orders_together DESC,1,2;
```

</details>

</section>

<section class="lab01-question" data-question="13" data-storage-question="14" markdown="1">

### Question 13

For each customer whose cumulative revenue from completed orders reached at least 500, return the first order at which they reached or exceeded that threshold. Determine the sequence by order date and then order ID. Include the cumulative revenue at that point and exclude customers who never reached the threshold.

<details><summary>Question 13 — First threshold crossing</summary><p>Build cumulative revenue in the specified order first. Only then determine which qualifying order is earliest for each customer.</p></details>

<div class="lab01-editor">
<label for="lab01-sql-13">Your SQL for question 13</label>
<textarea id="lab01-sql-13" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
),
w AS (
 SELECT r.*,sum(revenue) OVER(PARTITION BY customer_id ORDER BY order_date,order_id ROWS UNBOUNDED PRECEDING) cumulative,
 row_number() OVER(PARTITION BY customer_id ORDER BY order_date,order_id) rn
 FROM instructor_order_revenue r
), crossing AS (
 SELECT *,row_number() OVER(PARTITION BY customer_id ORDER BY rn) first_crossing
 FROM w WHERE cumulative>=500)
SELECT customer_id,order_id,order_date,revenue,cumulative FROM crossing WHERE first_crossing=1 ORDER BY customer_id;
```

</details>

</section>

<section class="lab01-question" data-question="14" data-storage-question="15" markdown="1">

### Question 14

For customer 1, calculate completed-order revenue and two cumulative sums. The first uses ORDER BY order_date, order_id with a ROWS frame from the beginning through the current row. The second uses ORDER BY order_date with a RANGE frame from the beginning through the current row. Predict both cumulative values for each order dated 2026-02-05 and explain the difference.

<details><summary>Question 14 — ROWS and RANGE</summary><p>Identify the ordering columns and frame for each cumulative calculation. Under a date-only ordering, consider whether same-day orders are peers and how that affects each result.</p></details>

You can include your written explanation as SQL comments, using `--`.

<div class="lab01-editor">
<label for="lab01-sql-14">Your SQL for question 14</label>
<textarea id="lab01-sql-14" data-sql rows="6" spellcheck="false" placeholder="Write your SQL here"></textarea>
<div class="lab01-editor-actions"><button type="button" data-run>Run query</button></div>
<p class="lab01-status" data-status role="status" aria-live="polite"></p>
<div class="lab01-result" data-result></div>
</div>


<details class="lab01-answer" markdown="1">
<summary>See answer</summary>

On 2026-02-05, order 102 has ROWS = 500 and RANGE = 700; order 103 has ROWS = 700 and RANGE = 700. RANGE includes both date peers, while ROWS follows the order-ID sequence.

```sql
WITH instructor_order_revenue AS (
    SELECT o.order_id, o.customer_id, o.order_date,
           COALESCE(SUM(i.quantity * i.unit_price *
               (1 - COALESCE(i.discount_pct, 0) / 100.0)), 0)::numeric AS revenue
    FROM orders o LEFT JOIN order_items i USING (order_id)
    WHERE o.status = 'completed'
    GROUP BY o.order_id, o.customer_id, o.order_date
)
SELECT order_id,order_date,revenue,
 sum(revenue) OVER(ORDER BY order_date,order_id ROWS UNBOUNDED PRECEDING) rows_total,
 sum(revenue) OVER(ORDER BY order_date RANGE UNBOUNDED PRECEDING) range_total
FROM instructor_order_revenue WHERE customer_id=1 ORDER BY order_date,order_id;
```

</details>

</section>

</div>

</div>

</div>

**Checkpoint:** Does your join multiply order counts? Are customers without orders kept where required? Are `NULL` values handled? Is the order deterministic when dates or amounts tie?

## Optional · Work in a Codespace {#2-optional-start-the-lab-in-a-codespace}

<span id="3-optional-write-answers-in-a-codespace"></span><span id="5-optional-performance-experiment"></span>

The browser editors work independently; use a Codespace if you also want the lab database or the performance experiment.

- **Start:** Open the [student repository](https://github.com/OrPerets/postgres-data-engineering-student) in Codespaces and run `make lab-sql` from the repository root. Existing tables are preserved; an incomplete setup is reported. See the [setup walkthrough](../start-lab01.md) or [troubleshooting](../troubleshooting.md).
- **Write SQL:** Run `make lab-sql-workspace` and open private port **8765** for the guided workspace, or edit `labs/01-relational-sql/sql/student_answers.sql` in the Codespace. [See how to save your work](../start-lab01.md#4-write-and-save-your-answers). The guided workspace, worksheet, and browser editors keep **separate drafts**; they do not sync. Save the guided draft regularly and download a backup.
- **Check and submit:** `make test LAB=01-relational-sql` checks the sample data and services, but does not grade SQL. Keep your answers and requested explanations, and submit them as instructed; saving or downloading is not submission.
- **Explore performance:** Compare a correlated subquery with a window function for running totals. From the lab folder, run the commands below and explore the [performance challenge](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/01-relational-sql/benchmarks/STUDENT_CHALLENGE.md). Results depend on the data, indexes, and cache.

    ```bash
    cd labs/01-relational-sql
    docker compose exec -T postgres psql -U student -d query_lab < benchmarks/01_seed_running_total.sql
    docker compose exec -T postgres psql -U student -d query_lab < benchmarks/03_compact_report.sql
    ```

    **Before seeding:** The first command drops and recreates `benchmark_sales`, including its rows and indexes. Back up any benchmark work first, or skip the seed to keep the existing table. The classroom tables are not dropped.

## Finish

Keep your SQL and the evidence requested by your instructor. Next, practice explaining your choices in the [job interview questions](01-interview.md), or check your understanding in [Test yourself](01-test-yourself.md).

### Your SQL practice

<div class="lab01-practice lab01-practice-actions"><button type="button" data-practice-export>Download answers</button></div>
