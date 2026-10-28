# Algorithm Explorers — student preview

A dependency-free interactive browser app for MapReduce and PageRank. It is intentionally **not publicly hosted** yet. It uses HTML/CSS/JavaScript only and doesn't store or send student inputs to a backend.

## Preview inside GitHub Codespaces

From the repository root:

```bash
python -m http.server 8000 --directory simulators
```

Codespaces should detect port 8000. Open it using the **Ports** panel (or the notification to open the forwarded port) to view `index.html`. Keep the port visibility **Private**; do not make it public unless explicitly approved.

## MapReduce features
- Editable uppercase letter input (one record per line)
- Adjustable reducer count, local combiner toggle
- Step-by-step input → map → shuffle → reduce
- Counts of mapper pairs and intermediate pairs sent to shuffle

## PageRank features
- Edit node names and directed edges; dangling nodes allowed
- Damping control, next/previous iteration, reset
- Rank-weighted graph and per-node table
- L1 change and total-rank conservation

## Validation
Click **Run self-checks**. It checks the ABR/CCR/ACB counts, combiner equivalence, PageRank's four-page first damped iteration, and that ranks sum to 1. It is a basic regression check, not a complete automated browser/UI test.

## Teaching scope
MapReduce is a **logical** visualization, not real distributed Hadoop execution. PageRank is executed locally in the browser and uses the lecture's uniform-teleportation and correctly damped dangling-mass formula. No timing conclusions about a distributed cluster should be drawn.

We can link it from GitBook once deployment visibility and instructor-material separation have been reviewed.
