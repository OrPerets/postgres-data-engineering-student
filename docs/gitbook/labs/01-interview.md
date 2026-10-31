# Job interview questions — Lab 01

**Chapter 3 of 4 · Explain your reasoning**

Use the examples from the lab. Answer each question aloud first, then open its suggested answer and compare. [← All Lab 01 chapters](01-relational-sql.md)

<details><summary>1. How can a WHERE condition change the result of a LEFT JOIN?</summary><p>A LEFT JOIN keeps unmatched rows from the left table, with NULLs for the right side. A WHERE condition such as <code>o.status = 'completed'</code> removes those unmatched rows. Put a right-side filter in the JOIN condition when unmatched left rows must remain, and check the intended semantics.</p></details>

<details><summary>2. Why can NOT IN return no rows when the subquery contains NULL?</summary><p>Comparisons involving NULL can be unknown. If no equal value is found but the list contains NULL, <code>NOT IN</code> can evaluate to unknown and the WHERE clause excludes that row. Consider <code>NOT EXISTS</code>, while explicitly deciding how NULL values in the outer column should be handled.</p></details>

<details><summary>3. How does a window function differ from GROUP BY?</summary><p>GROUP BY produces one row per group; a window function calculates across related rows while retaining the individual input rows. For a customer running total, partition by customer and order by date plus a stable tie-breaker; choose the frame deliberately.</p></details>

<details><summary>4. How would you investigate a slow SQL query?</summary><p>First check that it returns the intended results, then examine <code>EXPLAIN (ANALYZE, BUFFERS)</code> for actual row counts, repeated work, scans, sorts and buffer activity. Compare alternatives under representative data and conditions; indexes and plans depend on the workload. ANALYZE executes the query, so take care with statements that modify data.</p></details>

<details><summary>5. What are the advantages of window functions, and when would you use them?</summary><p>They let you add group-level or ordered calculations to individual rows without collapsing them. Common uses include running totals, ranking customers and comparing each order with the previous one. They can make a query clearer than a self-join or correlated subquery, but speed depends on the plan and data; measure it.</p></details>

<details><summary>6. What do PARTITION BY, ORDER BY and a window frame control?</summary><p><code>PARTITION BY</code> defines groups, <code>ORDER BY</code> orders rows within each group, and the frame selects the rows used by frame-sensitive calculations such as a running sum. In PostgreSQL, an ordered window's default frame includes peers with equal ordering values; specify a frame and tie-breaker when you need a particular row-by-row result.</p></details>

<details><summary>7. How do ROW_NUMBER and RANK handle ties?</summary><p><code>ROW_NUMBER()</code> assigns a different number to every row; add a stable tie-breaker for reproducible selection. <code>RANK()</code> gives equal ranks to peers and leaves gaps after ties. If ties must share a rank, do not add a unique identifier to that ranking window's ordering.</p></details>

<details><summary>8. How can you filter to the three highest-ranked orders per customer?</summary><p>Compute <code>ROW_NUMBER()</code> in a subquery or CTE, partitioned by customer and ordered by the intended measure and a stable tie-breaker. Filter the resulting number in the outer query. Window results are computed after the same query level's <code>WHERE</code>, so they cannot be filtered there directly.</p></details>


## Put it into practice

Choose one answer and explain it with a specific order or customer from the [tutorial](01-tutorial-practice.md). Then take the [self-check](01-test-yourself.md); it is practice and does not submit a grade.
