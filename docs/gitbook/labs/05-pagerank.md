# Lab 05 — PageRank

How does a page gain importance from links? Follow rank through a directed graph, then implement and evaluate an iterative PageRank calculation.

## Learning path

<ol class="lab01-timeline" markdown="1">
<li markdown="block">

### [Meet the graph](#the-labs-graph)

Understand pages, links and rank before calculating an update.

</li>
<li markdown="block">

<a id="first-iteration-with-damping-085"></a><a id="step-1-distribute-contributions"></a><a id="step-2-collect-contributions"></a><a id="step-3-verify-with-python"></a>
<a id="2-predict-rank-flow"></a><a id="3-run-the-example"></a><a id="4-add-dangling-nodes-and-damping"></a><a id="visual-walkthrough-one-rank-update"></a><a id="guided-exercise-compute-one-pagerank-iteration-by-hand"></a><a id="add-a-dangling-page-and-damping"></a>
### [Explore rank flow](../activities/lab05-learning-pack.md#explore-rank-over-iterations)

Step through contributions, dangling mass and damping on a practice graph.

</li>
<li markdown="block">

<a id="5-implement-and-validate"></a><a id="optional-hints-for-the-assignment"></a><a id="checkpoint-conservation-and-convergence"></a><a id="if-your-output-differs"></a>
### [Complete the exercises](05-exercises.md)

Trace two iterations, implement the Python functions and explain how an iterative job scales.

</li>
<li markdown="block">

<a id="connect-it-to-mapreduce"></a><a id="mini-challenge-explore-the-damping-factor"></a><a id="try-the-interactive-simulator-preview"></a>
### [Check your understanding](../activities/lab05-learning-pack.md#check-your-understanding)

Practice the ideas and explore how changing damping affects the calculation.

</li>
<li markdown="block">

<a id="job-interview-questions"></a>
### [Job interview questions](05-interview.md)

Explain rank flow, damping, dangling pages and convergence.

</li>
</ol>

## The lab's graph

A **directed graph** represents pages as nodes and links as arrows. A page divides its current rank among its outgoing links; a page's next rank depends on the contributions it receives. A link from a high-rank page can matter more than a link from a low-rank page.

The assignment starts with three pages: `A → B, C`, `B → C`, and `C → A`. Later it adds a fourth page, `D`, with no outgoing links. Such a page is **dangling**: its rank must be redistributed to avoid losing mass. The calculation also uses **damping** to combine link-based rank with uniform teleportation.

In each iteration the MapReduce model emits rank contributions, groups them by destination and updates ranks. The adjacency list must travel to the next iteration as well. The lab runs a **single-process simulation**, not a multi-node cluster.

## Get ready {#1-get-ready}

The [practice activities](../activities/lab05-learning-pack.md) and a Python draft editor are available in the browser. Run the Python assignment and tests in a Codespace with Python; PostgreSQL, Docker and Hadoop are not needed for the main lab. First complete the hand calculations and predictions in Questions 2 and 7: the setup command runs the reference demonstration and reveals example results. Then, from the repository root:

```bash
make lab-pagerank
```

Choose a draft editor and follow the execution instructions on the [exercises page](05-exercises.md). Browser, guided-workspace and Codespace-file drafts are separate and do not sync.

<a id="6-performance-experiment"></a><a id="performance-what-is-and-isnt-measured"></a>
The [optional performance experiment](05-exercises.md#optional-performance-experiment) compares processes on one host; it is not a multi-machine benchmark.

[Open lab files](https://github.com/OrPerets/postgres-data-engineering-student/tree/main/labs/05-pagerank) · [Full assignment](https://github.com/OrPerets/postgres-data-engineering-student/blob/main/labs/05-pagerank/STUDENT_ASSIGNMENT.md)
