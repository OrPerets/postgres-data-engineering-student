# Job interview questions — Lab 05

[← Lab 05 overview](05-pagerank.md) · [PageRank exercises](05-exercises.md)

Answer each question aloud before opening the explanation.

<details><summary>1. How does PageRank differ from simply counting incoming links?</summary><p>PageRank weights a link by the rank of its source and divides that source's contribution among its outgoing links. Two pages with the same number of incoming links can therefore have different ranks.</p></details>

<details><summary>2. What is a dangling node, and how does this lab handle it?</summary><p>A dangling node has no outgoing links. The lab sums the rank of all such nodes and redistributes that mass uniformly across every page, so it is not lost from the calculation.</p></details>

<details><summary>3. Why does PageRank use a damping factor?</summary><p>Damping combines following links with a chance of teleporting to another page. It limits the influence of link structure alone and helps the iteration converge; the precise result depends on the chosen factor and teleportation distribution.</p></details>

<details><summary>4. How would you tell when an iterative PageRank calculation can stop?</summary><p>Compare successive rank vectors with a stated distance, such as the sum of absolute differences, and stop when it falls below a tolerance or a maximum iteration count is reached. Also check that ranks remain nonnegative and sum approximately to one.</p></details>
