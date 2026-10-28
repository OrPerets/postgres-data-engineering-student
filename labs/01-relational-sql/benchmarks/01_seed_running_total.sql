-- Isolated performance dataset: does NOT overwrite customers / orders / order_items.
-- 12,000 events = 120 customers * 100 daily sales each.
-- Do not add indexes yet: lesson is repeated scans vs one ordered window pass.
DROP TABLE IF EXISTS benchmark_sales;
CREATE TABLE benchmark_sales (
  sale_id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  sale_date date NOT NULL,
  amount numeric(12,2) NOT NULL
);
INSERT INTO benchmark_sales(sale_id, customer_id, sale_date, amount)
SELECT gs, ((gs-1) % 120) + 1,
       DATE '2026-01-01' + (((gs-1) / 120) % 100),
       (1 + (gs * 13) % 100)::numeric(12,2)
FROM generate_series(1,12000) gs;
ANALYZE benchmark_sales;
SELECT count(*) AS generated_sales, count(DISTINCT customer_id) AS customers
FROM benchmark_sales;
