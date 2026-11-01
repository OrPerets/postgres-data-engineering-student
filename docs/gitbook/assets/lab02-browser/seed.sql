-- Browser-only practice dataset: 3,288 generated sales, three per day in
-- 2024–2026. This is deliberately smaller and different from the Codespace
-- dataset; timings and plans are not representative of the full lab.
CREATE TABLE sales_regular (
  sale_id BIGINT NOT NULL,
  sale_date DATE NOT NULL,
  customer_id INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL
);
CREATE TABLE sales_partitioned (LIKE sales_regular) PARTITION BY RANGE (sale_date);
CREATE TABLE sales_2024 PARTITION OF sales_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE sales_2025 PARTITION OF sales_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE sales_2026 PARTITION OF sales_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

INSERT INTO sales_regular (sale_id, sale_date, customer_id, amount)
SELECT n, DATE '2024-01-01' + ((n - 1) / 3),
       (n * 17 % 200) + 1, ((n * 123 % 99900) + 100)::numeric / 100
FROM generate_series(1, 3288) AS g(n);
INSERT INTO sales_partitioned SELECT * FROM sales_regular;
ANALYZE sales_regular;
ANALYZE sales_partitioned;
