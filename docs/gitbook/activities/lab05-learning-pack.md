# Lab 05 — PageRank practice and quiz

Use these optional activities before or during [Lab 05](../labs/05-pagerank.md). They are practice, not graded assignment answers.

## Explore rank over iterations

Start with a four-page practice graph and predict how rank flows. It differs from the assessed assignment graph. Choose a damping factor, step through the updates and observe the total rank, shared contributions and change between iterations. Changing the factor restarts from the same uniform ranks. The explorer runs locally in your browser; it is a logical simulation, not a distributed cluster.

<div id="lab05-pagerank-explorer"></div>

<noscript>For the practice graph A → B, B → A,C, C → B and D → none, start each page at 0.25. Each non-dangling page splits its rank evenly across its outlinks. Collect incoming values by destination, distribute D’s rank uniformly, and apply damping to both contributions. Add uniform teleportation. You can also use the [Python exercises](../labs/05-exercises.md).</noscript>

## Check your understanding

Try five short questions on rank propagation, dangling nodes, damping and convergence. Answers include explanations; results are not graded, saved or submitted.

<div id="lab05-practice-quiz"></div>

<noscript>The practice quiz needs JavaScript enabled.</noscript>

## Continue the workshop

Return to [Lab 05](../labs/05-pagerank.md) for the Python assignment, optional hints and performance experiment.
