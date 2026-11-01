# Example and optional inspiration

These references illustrate design choices. They are not required dependencies, permission to copy code, or evidence that a visual design improves learning. Check a linked page’s current behavior when using it as a reference; ordinary implementation need not begin with web research.

## A focused course example

- [Student course: animated order journey](https://orperets.github.io/postgres-data-engineering-student/labs/01-tutorial-practice/#order-journey)
- [Animation model and player source](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/docs/gitbook/javascripts/lab01-order-journey.js)
- [Scoped scene styling](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/docs/gitbook/stylesheets/lab01-order-journey.css)
- [Independent model and PostgreSQL checks](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/tests/test_lab01_order_journey.cjs)

The main scene presents one of three concepts: matching rows, building groups in working memory, or a growing window. It uses a representative three-order/five-line subset, with short captions, a few controls, and details behind a disclosure. A separate example runs the fuller dataset in PostgreSQL. The simulation and actual query execution are labelled separately.

The GROUP BY example separates input, working groups, and output. Both working groups and output begin empty. Its default teaching method discovers keys over five input visits, creates three groups as those keys arrive, then visits the five records again to assign members and update sums. Only after assignment does it emit the three result rows. A one-pass SUM method instead alternates lookup/create with accumulator updates, retaining sums without member references. Both finish with order totals `101 → 300`, `102 → 200`, and `103 → 200`.

| Illustrated work or state | Create groups, then assign | One-pass SUM |
|---|---:|---:|
| Input records read, cumulative | 10 | 5 |
| Group lookups, cumulative | 10 | 5 |
| Group entries created | 3 | 3 |
| Member references retained at completion | 5 | 0 |
| Sum updates, cumulative | 5 | 5 |

These counts describe two explicit models on the same five records. Retained member references are additional to group entries and their sums; zero references does not mean zero memory. The extra discovery pass makes group creation observable and is not a claim about PostgreSQL's chosen algorithm. For real execution evidence, inspect the actual query with [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/16/sql-explain.html); do not substitute illustrated counters or animation duration for measured execution statistics.

Useful mechanics to study: pure snapshots, allocation and mutation on arrival, separate emission commits, model-derived counters, partial sums, a growing frame, normalized animation progress, callback generation checks, and distinct narrow-screen coordinates. Its specific SQL schema, platform, colors, record count, timing, and two-pass teaching sequence are examples rather than requirements for other lessons. Confirm the source revision and live publication separately before making deployment claims.

## Optional visual references

| Reference | Design idea to inspect |
|---|---|
| [Anton Zhiyanov: rolling aggregates](https://antonz.org/sql-window-functions-rolling-aggregates/) | Moving window boundaries and calculations shown together; short rolling-average and running-sum animations make each contributing row observable. |
| [Joincraft](https://sreenivas-sadhu-prabhakara.github.io/joincraft/) · [source](https://github.com/Sreenivas-Sadhu-Prabhakara/joincraft) | Ribbons connect individual matched records, making repeated keys and multiple outputs visible. |
| [Setosa: principal component analysis](https://setosa.io/ev/principal-component-analysis/) | A prominent explorable visual, direct manipulation, and nearby concise explanation. |

Borrow the principle appropriate to the learning objective. A matching problem may need ribbons; accumulation may need moving values and changing totals; an abstract transformation may need direct manipulation instead of travelling tokens. Preserve the requested host and avoid adding a dashboard, quiz, execution engine, or full architecture map merely because a reference includes one.
