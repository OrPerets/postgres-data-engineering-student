<div class="course-hero lab01-landing-hero" markdown="1">

<p class="course-kicker">LAB 01 &nbsp; / &nbsp; RELATIONAL SQL</p>

# See the story in your data.

Learn to read relational data, write SQL, and explain your results using a small customer-order dataset.
{: .course-hero__lead }

<div class="course-actions" markdown="1">

[Start with SQL foundations](#sql-foundations){: .course-action-primary }

</div>
</div>

## Choose a chapter

Start with the foundations below, then follow the chapters in order. Use the optional activities when a concept needs another look. Visual simulations use synthetic examples; the practice chapter runs PostgreSQL in your browser.

<div class="grid cards" markdown="1">

- **01 · Window functions**

    Understand `OVER`, partitions, ordering and frames. Explore rankings, previous values and running totals with interactive examples.

    [Explore window functions →](01-window-functions.md)

- **02 · Tutorial & practice**

    Meet the customer and order tables, then work through 15 SQL questions in your browser. A Codespace is optional.

    [Start the tutorial →](01-tutorial-practice.md)

- **03 · Job interview questions**

    Practice explaining JOINs, `NULL`, window functions and query plans with examples from the lab.

    [Prepare for an interview →](01-interview.md)

- **04 · Test yourself**

    Check your understanding with short questions and feedback on the ideas in this lab.

    [Try the self-check →](01-test-yourself.md)

</div>

## Getting ready

The lesson, activities and SQL practice are available in your browser. The practice database starts fresh after a page reload, while SQL drafts are stored locally in this browser; download your answers for a backup. For a separate PostgreSQL environment, follow the optional [Codespace walkthrough](../start-lab01.md). Neither database nor drafts synchronize between the two routes.

## SQL foundations

Use this quick refresher before the window lesson. Each query asks what **one row** in its result represents. The [tutorial](01-tutorial-practice.md#1-meet-the-data) introduces the lab tables and their keys in more detail.

### Select and filter rows

`SELECT` chooses columns, `FROM` chooses the source, and `WHERE` keeps rows whose condition is true. `ORDER BY` controls the displayed order; add a stable tie-breaker if tied rows need a predictable order.

```sql
SELECT order_id, order_date, status
FROM orders
WHERE status = 'completed'
ORDER BY order_date, order_id;
```

Use parentheses to make combined `AND` and `OR` conditions clear. A semicolon ends the statement. Try the query in any editor in [Tutorial & practice](01-tutorial-practice.md#lab01-practice).

### Connect tables and keep track of grain

A customer can have many orders, and an order can have many item lines. A `JOIN` connects related rows using keys; joining orders to items produces one row **per matching item line**, not necessarily one per order. An `INNER JOIN` keeps matches; a `LEFT JOIN` also keeps unmatched left-side rows, filling right-side columns with `NULL`. A right-side condition in `WHERE` can remove those unmatched rows. [Explore joins](../activities/lab01-learning-pack.md#explore-joins).

### Summarize, handle missing values, and build in stages

`GROUP BY` combines rows into groups; for example, this returns one row per customer with an order:

```sql
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id;
```

`COUNT(*)` counts rows; `COUNT(column)` ignores `NULL`. `NULL` means a value is missing or unknown: test it with `IS NULL` or `IS NOT NULL`, not `= NULL`. `COALESCE` can provide a fallback when the question calls for one. [Explore NULL comparisons](../activities/lab01-learning-pack.md#explore-not-in-and-null).

A subquery or a common table expression (`WITH ...`) lets you calculate an intermediate result and use it in a later step—for example, calculate revenue per order before summarizing customers. Unlike `GROUP BY`, a **window function** can add a calculation while keeping each input row visible.

**Next:** [Explore window functions →](01-window-functions.md)
