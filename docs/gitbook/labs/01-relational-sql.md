<a id="see-the-story-in-your-data"></a>

# Lab 01 — Relational SQL

<a id="sql-foundations"></a>

## Choose a chapter

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Window functions](01-window-functions.md)

Understand `OVER`, partitions, ordering and frames. Explore rankings, previous values and running totals with interactive examples.

</li>
<li markdown="block">

### [Tutorial & practice](01-tutorial-practice.md)

Meet the customer and order tables, [follow an animated order journey](01-tutorial-practice.md#order-journey), then work through 15 SQL questions in your browser. A Codespace is optional.

</li>
<li markdown="block">

### [Job interview questions](01-interview.md)

Practice explaining JOINs, `NULL`, window functions and query plans with examples from the lab.

</li>
<li markdown="block">

### [Test yourself](01-test-yourself.md)

Check your understanding with short questions and feedback on the ideas in this lab.

</li>
</ol>

<a id="getting-ready"></a>

## The lab's data

The lab uses **sample data** for a small order system. Customers place orders, and each order can contain product lines from the books, electronics, and home categories. The initial sample contains 15 customers, 34 orders, and 43 item lines, with orders dated January–March 2026. Your task is to turn those records into useful answers about customers, orders, and revenue.

### Tables and columns

- **`customers` — one row per customer.** `customer_id` identifies the customer; `full_name` is their name; `city` is their city and can be `NULL`.
- **`orders` — one row per order.** `order_id` identifies the order; `customer_id` links it to a customer; `order_date` is the order date; `status` is `completed`, `cancelled`, `returned`, or `pending`.
- **`order_items` — one row per order line.** `order_id` links the line to an order; `line_no` identifies the line within that order; `product_name` and `category` describe the product; `quantity`, `unit_price`, and `discount_pct` describe the purchase. The pair `(order_id, line_no)` is the primary key. A `NULL` discount means no discount.

One customer can have many orders, and one order can have many item lines. A customer may have no orders, and the schema also permits an order without item lines. Joining orders to their lines can therefore repeat an order across several rows. The exercise schema is in `labs/01-relational-sql/sql/01_schema.sql`.

### Business rules and goals

- For revenue, use completed orders unless a question says otherwise.
- A returned order represents a full return.
- A completed order with a 100% discount still counts as an order.
- Calculate line revenue as `quantity * unit_price * (1 - COALESCE(discount_pct, 0) / 100.0)`.
- A completed order without lines has zero revenue when included in an order-level calculation.

Use SQL to connect the tables, calculate customer and order metrics, identify trends and rankings, and explain how your query handles missing values, ties, and row counts. Open [tutorial and practice](01-tutorial-practice.md#lab01-practice) to explore sample rows and answer the 15 questions.
