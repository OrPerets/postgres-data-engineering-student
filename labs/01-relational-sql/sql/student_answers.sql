-- SQL and Query Optimization — Lab 01
-- Answer each question below its full description.
-- Business rules and original questions: see the course PDF and STUDENT_BRIEF.md.
-- Write only your own solutions. Do not modify source tables unless instructed.
-- To run this file with psql, complete the answers first.

-- ============================================================================
-- QUESTION 01
-- Display up to five orders from January 2026 that satisfy either condition: the order was completed and the customer is from Haifa, or the order was cancelled. The January date restriction applies to both cases.
-- ============================================================================

-- Your answer for Question 1:


-- ============================================================================
-- QUESTION 02
-- For every customer, display the number of completed orders, total revenue, average revenue per completed order, and date of the most recent completed order. Include customers with no completed orders, showing zero for the count and revenue and NULL for the average and date. Completed orders with zero revenue still count.
-- ============================================================================

-- Your answer for Question 2:


-- ============================================================================
-- QUESTION 03
-- Find customers who purchased from both the books and electronics categories in completed orders and have no returned orders anywhere in the dataset. The categories may occur in the same order or in different orders.
-- ============================================================================

-- Your answer for Question 3:


-- ============================================================================
-- QUESTION 04
-- For every completed order, calculate its revenue and the average revenue of the other completed orders belonging to the same customer. Return only orders whose revenue is strictly greater than that average. Exclude customers with only one completed order.
-- ============================================================================

-- Your answer for Question 4:


-- ============================================================================
-- QUESTION 05
-- For each city, display the number of customers, total number of orders, number of orders in each status, and percentage of orders that were completed. Include customers with no orders. Display missing cities as Unknown and return NULL for the percentage when a city has no orders.
-- ============================================================================

-- Your answer for Question 5:


-- ============================================================================
-- QUESTION 06
-- The following query is intended to count completed orders and calculate average revenue per completed order for every customer, including customers with no activity. Identify three logical errors and correct them. Then return only customers with at least two completed orders and total revenue of at least 500.
--
-- Query supplied in the assignment (to diagnose and correct):
-- SELECT c.customer_id, COUNT(*) AS completed_orders,
--        AVG(i.quantity * i.unit_price * (1 - COALESCE(i.discount_pct, 0) / 100.0)) AS avg_order_revenue
-- FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
--                  LEFT JOIN order_items i ON i.order_id = o.order_id
-- WHERE o.status = 'completed'
-- GROUP BY c.customer_id;
-- ============================================================================

-- Your answer for Question 6:


-- ============================================================================
-- QUESTION 07
-- Find customers whose city is known and whose city has no customer with a returned order. Customers without orders may qualify. Predict the result of the following query on the supplied data, explain its behavior, and correct it.
--
-- Query supplied in the assignment (to diagnose and correct):
-- SELECT customer_id, full_name, city
-- FROM customers
-- WHERE city NOT IN (
--     SELECT c.city
--     FROM customers c
--     JOIN orders o ON o.customer_id = c.customer_id
--     WHERE o.status = 'returned'
-- );
-- ============================================================================

-- Your answer for Question 7:


-- ============================================================================
-- QUESTION 08
-- Calculate total revenue for each customer with at least one completed order. Within each city, return all customers at the two highest distinct revenue levels, including ties. Display ROW_NUMBER, RANK, and DENSE_RANK. Break ties in ROW_NUMBER by ascending customer_id, while preserving revenue ties in the other rankings.
-- ============================================================================

-- Your answer for Question 8:


-- ============================================================================
-- QUESTION 09
-- For every completed order, display its revenue, the previous completed order’s revenue, the percentage change, cumulative revenue, and a moving average over up to the three most recent completed orders, including the current order. Calculate these separately for each customer, ordered by date and then order ID. Return NULL for percentage change when there is no previous order or its revenue is zero.
-- ============================================================================

-- Your answer for Question 9:


-- ============================================================================
-- QUESTION 10
-- For each customer with a completed order, identify the category in which they spent the most. Break ties alphabetically by category name. Display the category’s revenue and its percentage of the customer’s total revenue. Return NULL for the percentage when total revenue is zero.
-- ============================================================================

-- Your answer for Question 10:


-- ============================================================================
-- QUESTION 11
-- Produce exactly three rows for every customer, covering January, February, and March 2026. Display monthly revenue, the previous month’s revenue, and the percentage change. Show zero revenue for months without purchases. For January, return NULL for the previous month’s revenue and percentage change. Also return NULL for percentage change when the previous month’s revenue is zero.
-- ============================================================================

-- Your answer for Question 11:


-- ============================================================================
-- QUESTION 12
-- Find customers who purchased from every category sold in a completed order anywhere in the dataset. Determine the required categories from the data. Purchases with a 100 percent discount still count. If no category has been sold, return an empty result. Provide two different solutions.
-- ============================================================================

-- Your answer for Question 12:


-- ============================================================================
-- QUESTION 13
-- Find pairs of different products purchased together in at least two completed orders. Count each order once per pair, even when a product appears on multiple lines. Display each pair once, with the alphabetically smaller product name first, together with the number of orders containing the pair.
-- ============================================================================

-- Your answer for Question 13:


-- ============================================================================
-- QUESTION 14
-- For each customer whose cumulative revenue from completed orders reached at least 500, return the first order at which they reached or exceeded that threshold. Determine the sequence by order date and then order ID. Include the cumulative revenue at that point and exclude customers who never reached the threshold.
-- ============================================================================

-- Your answer for Question 14:


-- ============================================================================
-- QUESTION 15
-- For customer 1, calculate completed-order revenue and two cumulative sums. The first uses ORDER BY order_date, order_id with a ROWS frame from the beginning through the current row. The second uses ORDER BY order_date with a RANGE frame from the beginning through the current row. Predict both cumulative values for each order dated 2026-02-05 and explain the difference.
-- ============================================================================

-- Your answer for Question 15:
