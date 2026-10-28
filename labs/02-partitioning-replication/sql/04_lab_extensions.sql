-- Optional idempotent helper VIEW for student exploration; exercise solutions are not included.
-- Execute on Primary only, AFTER loading sales tables.
CREATE OR REPLACE VIEW sales_monthly_summary AS
SELECT date_trunc('month', sale_date)::date AS month_start,
       COUNT(*) AS transactions,
       SUM(amount) AS revenue
FROM sales_partitioned
GROUP BY 1;
COMMENT ON VIEW sales_monthly_summary IS 'Reference summary for data verification; students must write window functions independently';
