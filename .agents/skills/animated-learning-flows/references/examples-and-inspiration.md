# Example and optional inspiration

These references illustrate design choices. They are not required dependencies, permission to copy code, or evidence that a visual design improves learning. Check a linked page’s current behavior when using it as a reference; ordinary implementation need not begin with web research.

## A focused course example

- [Student course: animated order journey](https://orperets.github.io/postgres-data-engineering-student/labs/01-tutorial-practice/#order-journey)
- [Animation model and player source](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/docs/gitbook/javascripts/lab01-order-journey.js)
- [Scoped scene styling](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/docs/gitbook/stylesheets/lab01-order-journey.css)
- [Independent model and PostgreSQL checks](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/tests/test_lab01_order_journey.cjs)

The main scene presents one of three concepts: matching rows, accumulating groups, or a growing window. It uses a representative three-order/five-line subset, with short captions, a few controls, and details behind a disclosure. A separate example runs the fuller dataset in PostgreSQL. The simulation and actual query execution are labelled separately.

Useful mechanics to study: pure snapshots, token arrival followed by output commit, partial sums, a growing frame, normalized animation progress, callback generation checks, and distinct narrow-screen coordinates. Its specific SQL schema, platform, colors, record count, and timing are examples rather than requirements for other lessons. Confirm the source revision and live publication separately before making deployment claims.

## Optional visual references

| Reference | Design idea to inspect |
|---|---|
| [Anton Zhiyanov: rolling aggregates](https://antonz.org/sql-window-functions-rolling-aggregates/) | Moving window boundaries and calculations shown together; short rolling-average and running-sum animations make each contributing row observable. |
| [Joincraft](https://sreenivas-sadhu-prabhakara.github.io/joincraft/) · [source](https://github.com/Sreenivas-Sadhu-Prabhakara/joincraft) | Ribbons connect individual matched records, making repeated keys and multiple outputs visible. |
| [Setosa: principal component analysis](https://setosa.io/ev/principal-component-analysis/) | A prominent explorable visual, direct manipulation, and nearby concise explanation. |

Borrow the principle appropriate to the learning objective. A matching problem may need ribbons; accumulation may need moving values and changing totals; an abstract transformation may need direct manipulation instead of travelling tokens. Preserve the requested host and avoid adding a dashboard, quiz, execution engine, or full architecture map merely because a reference includes one.
