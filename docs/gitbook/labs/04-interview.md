# Lab 04 — Job interview questions

[← Lab 04 overview](04-mapreduce.md) · [MapReduce exercises](04-exercises.md)

Try answering aloud before opening each suggested answer. Use an example from the lab to support your explanation.

<details><summary>1. What happens in Map, Shuffle and Reduce?</summary><p>Map emits intermediate key-value pairs from input records. Shuffle routes and groups values by key. Reduce processes each group to produce a result, such as a count.</p></details>

<details><summary>2. When is a combiner safe, and why can averaging worker averages be wrong?</summary><p>A combiner is safe when its partial state can be merged in any allowed grouping without changing the intended result. Worker averages can have different group sizes, so an unweighted average gives them the wrong influence. A mean can retain sum and count until the final calculation.</p></details>

<details><summary>3. What is a hot key, and how can you reduce its impact?</summary><p>A hot key receives a disproportionate share of records, so its assigned reducer may become a bottleneck. Safe local aggregation can reduce intermediate records. Splitting a hot key across buckets and aggregating again can distribute work, at the cost of an additional step.</p></details>

<details><summary>4. Why must partitioning route identical keys consistently?</summary><p>All values for a key must reach the same reducer for a single-stage result per key. A stable partition function makes routing reproducible. Changing the reducer count can change assignments without changing correct final counts.</p></details>
