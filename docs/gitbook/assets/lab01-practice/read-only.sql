-- The browser copy is disposable. Keep classroom tables owned by the setup
-- role and run student queries as a role with SELECT access only.
CREATE ROLE lab01_browser_reader;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO lab01_browser_reader;
GRANT SELECT ON customers, orders, order_items TO lab01_browser_reader;
SET SESSION AUTHORIZATION lab01_browser_reader;
SET default_transaction_read_only = on;
