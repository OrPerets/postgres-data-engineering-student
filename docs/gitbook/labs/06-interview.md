# Job interview questions — Lab 06

[← Lab 06 overview](06-tfidf.md) · [Exercises](06-exercises.md) · [Visual practice](../activities/lab06-learning-pack.md)

Answer aloud before revealing each suggested answer. Use an example from the lab to support your explanation.

<details><summary>1. What is the difference between term frequency and document frequency?</summary><p>Term frequency measures how often a term occurs within one document, here normalized by that document's token count. Document frequency counts how many distinct documents contain the term, regardless of how many times it appears in each one.</p></details>

<details><summary>2. Why does TF-IDF give less weight to terms that appear in many documents?</summary><p>A term appearing in many documents is often less useful for distinguishing one document from another. In this lab, <code>IDF = ln((N+1)/(df+1))</code>, so a term present in every document has IDF zero; other TF-IDF conventions may produce different values.</p></details>

<details><summary>3. How can tokenization affect a TF-IDF comparison?</summary><p>Case normalization, punctuation rules and token boundaries change document lengths and term counts. Compare implementations using the same corpus and preprocessing rules, as well as the same TF and IDF formulas.</p></details>

<details><summary>4. What happens to IDF when new documents are added to a corpus?</summary><p>The total number of documents and the document frequency of some terms can change. Consequently, existing IDF values and TF-IDF scores may need to be updated using the new global corpus statistics.</p></details>
