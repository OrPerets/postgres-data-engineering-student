-- Synthetic teaching dataset, invented for this lab. NOT original source data.
-- Includes null city, no orders, no completed orders, duplicate same-day customer orders,
-- 100% discounts, ties, returned orders, missing order lines and repeated product lines.
BEGIN;
INSERT INTO customers (customer_id,full_name,city) VALUES
(1,'Dana Cohen','Haifa'), (2,'Noam Levi','Tel Aviv'),
(3,'Maya Green','Haifa'), (4,'Lior Bar','Jerusalem'),
(5,'Yael Tal',NULL), (6,'Tom Ben','Tel Aviv'),
(7,'Eden Raz','Jerusalem'), (8,'Amit Gil','Haifa'),
(9,'Neta Shah','Beer Sheva'), (10,'Omer Paz','Beer Sheva'),
(11,'Roni Gold','Tel Aviv'), (12,'Shai Ziv',NULL),
(13,'Tali Oz','Eilat'), (14,'Ori Ron','Eilat'),
(15,'Gal Arad','Haifa');

INSERT INTO orders (order_id,customer_id,order_date,status) VALUES
(101,1,'2026-01-05','completed'), (102,1,'2026-02-05','completed'),
(103,1,'2026-02-05','completed'), (104,1,'2026-03-01','completed'),
(105,1,'2026-03-08','cancelled'), (106,2,'2026-01-10','completed'),
(107,2,'2026-02-09','returned'), (108,2,'2026-03-09','completed'),
(109,3,'2026-01-12','cancelled'), (110,3,'2026-01-15','returned'),
(111,4,'2026-01-03','completed'), (112,4,'2026-02-10','completed'),
(113,4,'2026-03-13','completed'), (114,5,'2026-01-07','returned'),
(115,6,'2026-01-15','completed'), (116,6,'2026-02-15','completed'),
(117,7,'2026-02-05','completed'), (118,7,'2026-03-06','completed'),
(119,8,'2026-01-17','completed'), (120,8,'2026-01-18','completed'),
(121,9,'2026-01-01','completed'), (122,9,'2026-03-01','completed'),
(123,10,'2026-02-01','completed'), (124,10,'2026-03-02','pending'),
(125,11,'2026-02-02','completed'), (126,11,'2026-03-03','completed'),
(127,12,'2026-01-26','completed'), (128,13,'2026-02-19','completed'),
(129,13,'2026-03-20','completed'), (130,14,'2026-01-11','completed'),
(131,14,'2026-03-12','completed'), (132,15,'2026-01-19','completed'),
(133,15,'2026-02-19','completed'), (134,1,'2026-03-27','completed');

INSERT INTO order_items (order_id,line_no,product_name,category,quantity,unit_price,discount_pct) VALUES
(101,1,'Novel','books',1,100,NULL),
(101,2,'Mouse','electronics',1,200,0),
(102,1,'Novel','books',1,150,0),
(102,2,'Lamp','home',1,50,0),
(103,1,'Mouse','electronics',2,100,0),
(104,1,'Desk','home',1,400,0),
(105,1,'Novel','books',1,300,0),
(106,1,'Novel','books',1,300,0),
(106,2,'Mouse','electronics',1,150,0),
(107,1,'Lamp','home',1,200,0),
(108,1,'Mouse','electronics',1,150,100),
(108,2,'Novel','books',1,100,0),
(109,1,'Desk','home',1,200,0),
(110,1,'Novel','books',1,100,0),
(111,1,'Novel','books',1,100,0),
(111,2,'Mouse','electronics',1,200,0),
(112,1,'Lamp','home',1,300,0),
(113,1,'Desk','home',1,400,0),
(114,1,'Desk','home',1,400,0),
(115,1,'Novel','books',1,150,0),
(115,2,'Mouse','electronics',1,150,0),
(116,1,'Desk','home',1,300,0),
(117,1,'Novel','books',1,300,0),
(118,1,'Mouse','electronics',1,300,0),
(119,1,'Novel','books',1,100,0),
(119,2,'Mouse','electronics',1,200,0),
(119,3,'Novel','books',1,50,0),
(120,1,'Lamp','home',1,250,0),
(121,1,'Novel','books',1,200,0),
(122,1,'Mouse','electronics',1,350,0),
(123,1,'Desk','home',1,250,0),
(125,1,'Novel','books',1,300,0),
(126,1,'Lamp','home',1,300,0),
(127,1,'Novel','books',1,0,0),
(128,1,'Novel','books',1,200,0),
(128,2,'Mouse','electronics',1,100,0),
(129,1,'Lamp','home',1,200,0),
(130,1,'Novel','books',1,100,0),
(130,2,'Mouse','electronics',1,200,0),
(131,1,'Desk','home',1,250,0),
(132,1,'Novel','books',1,120,0),
(133,1,'Mouse','electronics',1,220,0),
(134,1,'Mouse','electronics',1,150,20);
-- Order 124 is pending and intentionally has no lines.
COMMIT;
ANALYZE customers;
ANALYZE orders;
ANALYZE order_items;
