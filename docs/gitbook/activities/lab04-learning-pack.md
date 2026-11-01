# Lab 04 — MapReduce practice

Use these activities before or during [Lab 04](../labs/04-mapreduce.md). They are optional practice, separate from the assignment.

## Trace Map → Shuffle → Reduce

Predict how many times each letter appears, then step through the records, mapper output, optional local combining, grouping, and final counts. Each line is one mapper's local group in this illustration. Compare the number of pairs with and without combining: does the answer change?

<div id="lab04-mapreduce-explorer"></div>

<noscript>For DATA, DARK, and TASK, emit (letter, 1) for each character, group the values by letter and sum each group. The final counts are A: 4, D: 2, K: 2, R: 1, S: 1, T: 2. A local sum combiner can reduce the number of pairs without changing these counts. The [Lab 04 guide](../labs/04-mapreduce.md) explains how to run the Python demonstration.</noscript>

## Compare distributed means

What happens when workers have different numbers of observations? Predict before comparing their local means with the mean of all observations. A mergeable state keeps each worker's sum and count together.

<div id="lab04-mean-explorer"></div>

<noscript>For worker A = [1] and worker B = [3, 5, 7], the worker means are 1 and 5. Their unweighted average is 3, but the mean of all four values is 4. Merge (sum, count) states and divide the combined sum by the combined count.</noscript>

## Explore mergeable population variance

Compare local population variances with a result calculated from merged `(count, sum, sum of squares)` states. Predict the result before revealing it.

<div id="lab04-variance-explorer"></div>

<noscript>Workers A = [1, 2] and B = [3, 4] each have population variance 0.25. Merge their count, sum and sum of squares to calculate the variance of all four observations, which is 1.25. Empty input has no population variance; floating-point cancellation can affect this formula for large, close values.</noscript>

## Check your understanding

Try five short questions about mapping, grouping, safe combiners, mean and skew. Each answer includes an explanation. This self-check is practice; no results are saved or submitted.

<div id="lab04-practice-quiz"></div>

<noscript>The practice quiz needs JavaScript enabled.</noscript>

## Continue the workshop

Return to [Lab 04](../labs/04-mapreduce.md) for the assignment, optional hints and Python exercises.
