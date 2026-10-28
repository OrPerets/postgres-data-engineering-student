-- This script RECREATES the three exercise tables. Classroom only.
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  city VARCHAR(80)
);
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  order_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('completed','cancelled','returned','pending'))
);
CREATE TABLE order_items (
  order_id INT NOT NULL REFERENCES orders(order_id),
  line_no INT NOT NULL CHECK (line_no > 0),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('books','electronics','home')),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount_pct NUMERIC(5,2) CHECK (discount_pct BETWEEN 0 AND 100),
  PRIMARY KEY (order_id, line_no)
);
-- discount_pct is a percentage (e.g. 20 means 20%):
-- quantity * unit_price * (1 - COALESCE(discount_pct,0)/100.0)
