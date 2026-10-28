-- A new PostgreSQL implementation of the lecture's four stages.
-- Natural logarithm as in lecture page 26, not the base-2 values on page 16.
WITH tokens AS (
  SELECT d.doc_id, lower(t.word) AS term
  FROM documents d
  CROSS JOIN LATERAL regexp_split_to_table(lower(d.raw_text),'[^a-z0-9]+') AS t(word)
  WHERE t.word <> ''
), term_counts AS (
  SELECT doc_id,term,count(*)::numeric AS term_count
  FROM tokens GROUP BY doc_id,term
), lengths AS (
  SELECT doc_id,sum(term_count) AS doc_len FROM term_counts GROUP BY doc_id
), df AS (
  SELECT term,count(DISTINCT doc_id)::numeric AS doc_freq
  FROM term_counts GROUP BY term
), n AS (
  SELECT count(*)::numeric AS total_docs FROM documents
)
SELECT c.doc_id,c.term,c.term_count,l.doc_len,df.doc_freq,
       c.term_count/l.doc_len AS tf,
       ln((n.total_docs+1)/(df.doc_freq+1)) AS idf,
       (c.term_count/l.doc_len)*ln((n.total_docs+1)/(df.doc_freq+1)) AS tfidf
FROM term_counts c
JOIN lengths l USING(doc_id)
JOIN df USING(term)
CROSS JOIN n
ORDER BY c.doc_id, c.term;
