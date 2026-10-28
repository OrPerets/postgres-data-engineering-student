# Glossary

**CTE:** A named query expression introduced using `WITH`.

**Window function:** A calculation over a group or ordered frame of rows without collapsing all rows into one output row.

**Partition pruning:** Skipping physical table partitions that cannot match a query predicate.

**Read replica:** A standby database receiving changes from a primary. It may lag and is not a backup.

**Staging view:** A saved query that transforms source data on read; it is not necessarily a physical copy.

**Fact grain:** The exact business or source-observation level represented by one fact row.

**Idempotency:** Reprocessing the same input does not change the intended final state.

**Map:** Convert each input item into zero or more intermediate key-value pairs.

**Shuffle:** Group or redistribute intermediate data by key.

**Reduce:** Aggregate grouped values into an output.

**Dangling node:** A graph node with no outgoing links.

**TF-IDF:** Term frequency multiplied by inverse document frequency, representing local focus adjusted for global rarity.
