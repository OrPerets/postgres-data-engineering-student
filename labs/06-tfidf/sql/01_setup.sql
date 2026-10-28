DROP TABLE IF EXISTS documents;
CREATE TABLE documents (doc_id TEXT PRIMARY KEY, raw_text TEXT NOT NULL);
INSERT INTO documents (doc_id,raw_text) VALUES
('D1','data science uses data.'),
('D2','data engineering builds pipelines.'),
('D3','science uses experiments.'),
('D4','engineering uses data pipelines.');
