# 4 · Test yourself

[← Lab 01 chapters](01-relational-sql.md) · [Interview questions](01-interview.md)

**Can you explain what the query will do before running it?** Work through ten short questions about JOINs, NULLs, ranking, `LAG` and window frames. Each answer comes with an explanation, so use a mistake as a clue about what to revisit.

This is **practice**, not a grade: answers stay in this browser session and are not submitted or saved. You can restart as often as you like.

<div id="lab01-practice-quiz"></div>

<noscript>
<strong>Paper self-check:</strong> Five orders for one customer have revenues 300, 200, 200, 400, 120. How many rows does a window sum return? Which orders belong to the frame of order 104 in the sequence 101, 102, 103, 104, 134 when the frame is the current row plus two preceding rows? If March is filtered before LAG, can its first order see February?
<details>
<summary>Check the paper self-check</summary>
<p>The window sum keeps <strong>five</strong> order rows. The frame for order 104 contains <strong>102, 103 and 104</strong>. If February is filtered out before LAG, the first March order cannot see it; calculate the window over the full history first if the prior order is needed.</p>
</details>
</noscript>

## Choose your next step

- Revisit the [window-functions chapter](01-window-functions.md) to explore the visual examples.
- Apply your ideas in [Tutorial & practice](01-tutorial-practice.md).
- Explain your reasoning with the [interview questions](01-interview.md).
