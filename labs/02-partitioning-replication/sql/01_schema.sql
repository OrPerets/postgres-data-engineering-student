-- Run on Primary. Drops and recreates the experiment tables.
DROP TABLE IF EXISTS sales_regular;
DROP TABLE IF EXISTS sales_partitioned CASCADE;
CREATE TABLE sales_regular (
 sale_id BIGINT NOT NULL,
 sale_date DATE NOT NULL,
 customer_id INT NOT NULL,
 amount NUMERIC(12,2) NOT NULL
);
CREATE TABLE sales_partitioned (LIKE sales_regular) PARTITION BY RANGE (sale_date);
CREATE TABLE sales_2024 PARTITION OF sales_partitioned FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE sales_2025 PARTITION OF sales_partitioned FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE sales_2026 PARTITION OF sales_partitioned FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
