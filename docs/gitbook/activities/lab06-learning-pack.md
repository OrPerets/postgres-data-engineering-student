# Lab 06 — Regex and TF-IDF practice

Explore ticket-ID boundaries and the small lecture corpus, then try five questions before returning to [Lab 06](../labs/06-tfidf.md). These activities are optional practice and do not grade or submit your assignment.

## Explore ticket-ID boundaries

Compare an unbounded pattern with a pattern using word boundaries. Predict what each matches before revealing the substrings and offsets. These fixed ASCII examples run in your browser; they do not execute Python.

<div id="lab06-regex"></div>

<noscript>Paper exercise: compare TKT-[0-9]{4,6} with the same pattern surrounded by word boundaries. Predict the match for TKT-1042, TKT-12, TKT-1042A, TKT-1234_, TKT-1234567 and xTKT-1042. Consider the characters immediately outside each candidate; underscore is a word character. The examples use ASCII and uppercase IDs.</noscript>

## Explore term weights

Select a document and a term to see term count, document length, document frequency and the resulting score. Then predict how adding an illustrative document changes an existing score, and compare the results. These browser-only calculations use the lab's natural-log convention; they do not run a distributed system.

<div id="lab06-practice"></div>

<noscript>The interactive practice requires JavaScript. For a paper exercise, use D1's TF=2/4 and the original N=4, DF=3. Predict whether its score for data rises or falls if a fifth document is added (a) containing data or (b) without it. In each case apply IDF = ln((N+1)/(DF+1)). The Lab 06 tutorial explains the formula and contains the original corpus example.</noscript>

## Continue the workshop

Return to [Lab 06](../labs/06-tfidf.md) for the assignment, optional hints and PostgreSQL comparison.
