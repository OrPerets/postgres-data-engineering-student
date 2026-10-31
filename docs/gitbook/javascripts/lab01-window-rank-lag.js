/* Browser-only demonstrations. No database connection or network requests. */
(function () {
  'use strict';

  const rankingInput = [
    { customer: 'A', id: 1, revenue: 600 },
    { customer: 'B', id: 2, revenue: 600 },
    { customer: 'C', id: 3, revenue: 300 }
  ];
  const orders = [
    { id: 101, date: '2026-01-05', revenue: 300 },
    { id: 102, date: '2026-02-05', revenue: 200 },
    { id: 103, date: '2026-02-05', revenue: 200 },
    { id: 104, date: '2026-03-01', revenue: 400 },
    { id: 134, date: '2026-03-27', revenue: 120 }
  ];

  function rankRows(rankTieBreaker, denseTieBreaker, hasRevenueTie = true) {
    const rows = rankingInput.map((row) => row.id === 2 && !hasRevenueTie ? { ...row, revenue: 500 } : row)
      .sort((a, b) => b.revenue - a.revenue || a.id - b.id);
    let rank = 0;
    let dense = 0;
    return rows.map((row, index) => {
      const previous = rows[index - 1];
      const newRevenue = !previous || previous.revenue !== row.revenue;
      // Appending a unique ID makes every row its own peer group.
      if (newRevenue || rankTieBreaker) rank = index + 1;
      if (newRevenue || denseTieBreaker) dense += 1;
      return { ...row, rowNumber: index + 1, rank, denseRank: dense };
    });
  }

  function lagRows(filterBefore) {
    const march = (order) => order.date >= '2026-03-01' && order.date < '2026-04-01';
    const input = filterBefore ? orders.filter(march) : orders;
    return input.map((order, index) => ({
      ...order,
      previous: index === 0 ? null : input[index - 1].revenue,
      previousOrder: index === 0 ? null : input[index - 1].id
    })).filter(march);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { rankRows, lagRows };
  if (typeof document === 'undefined') return;

  function appendCell(row, text, header) {
    const cell = document.createElement(header ? 'th' : 'td');
    if (header) cell.scope = 'row';
    cell.textContent = String(text);
    row.appendChild(cell);
  }

  function initRanking() {
    const root = document.getElementById('lab01-window-ranking');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('window-demo', 'window-rank-demo');
    root.innerHTML = `
      <p class="window-demo__eyebrow">INTERACTIVE · RANKING PLAYGROUND</p>
      <h3>What happens to tied customers?</h3>
      <p>What happens when two customers tie? Predict their ranks, then reveal the result.</p>
      <label class="window-demo__label" for="window-rank-data">Example revenues</label>
      <select id="window-rank-data"><option value="tie">Tie: A 600 · B 600 · C 300</option><option value="distinct">Distinct: A 600 · B 500 · C 300</option></select>
      <div class="window-demo__source" aria-label="Example customer revenues"><span><strong>A</strong> 600</span><span><strong>B</strong> <b id="window-rank-b-value">600</b></span><span><strong>C</strong> 300</span></div>
      <details class="window-demo__advanced"><summary>Explore tie-breakers</summary><fieldset class="window-demo__choices"><legend>Add customer ID as a tie-breaker</legend>
        <label><input type="checkbox" id="window-rank-break"> For <code>RANK</code></label>
        <label><input type="checkbox" id="window-dense-break"> For <code>DENSE_RANK</code></label>
        <small><code>ROW_NUMBER</code> always uses customer ID to make its order reproducible.</small>
      </fieldset></details>
      <button type="button" class="window-demo__button" id="window-rank-reveal" aria-expanded="false" aria-controls="window-rank-result">Reveal rankings</button>
      <div id="window-rank-result" hidden>
        <div class="window-demo__rank-visual" aria-label="Rankings by function"></div>
        <details class="window-demo__rank-table"><summary>See results as a table</summary><div class="window-demo__table-wrap" role="region" aria-label="Ranking result table" tabindex="0">
          <table><caption>One row per customer, highest revenue first</caption><thead><tr><th scope="col">Customer</th><th scope="col">Revenue</th><th scope="col">ROW_NUMBER</th><th scope="col">RANK</th><th scope="col">DENSE_RANK</th></tr></thead><tbody></tbody></table>
        </div></details>
        <p class="window-demo__insight" role="status" aria-live="polite"></p>
        <details><summary>See the SQL window definitions</summary><pre><code></code></pre></details>
      </div>
      <p class="window-demo__footnote">Browser simulation with illustrative customers. It does not query PostgreSQL.</p>`;
    const rankBreak = root.querySelector('#window-rank-break');
    const denseBreak = root.querySelector('#window-dense-break');
    const dataSelect = root.querySelector('#window-rank-data');
    const bValue = root.querySelector('#window-rank-b-value');
    const button = root.querySelector('#window-rank-reveal');
    const result = root.querySelector('#window-rank-result');
    const body = root.querySelector('tbody');
    const visual = root.querySelector('.window-demo__rank-visual');
    const message = root.querySelector('.window-demo__insight');
    const sql = root.querySelector('details code');
    let revealed = false;

    function render() {
      const hasRevenueTie = dataSelect.value === 'tie';
      bValue.textContent = hasRevenueTie ? '600' : '500';
      body.replaceChildren();
      const ranked = rankRows(rankBreak.checked, denseBreak.checked, hasRevenueTie);
      visual.replaceChildren();
      for (const [label, property, explanation] of [
        ['ROW_NUMBER', 'rowNumber', 'Every row gets a number'],
        ['RANK', 'rank', 'Ties share a rank; gaps can follow'],
        ['DENSE_RANK', 'denseRank', 'Ties share a rank; no rank is skipped']
      ]) {
        const group = document.createElement('section');
        group.className = 'window-demo__rank-group';
        const heading = document.createElement('strong'); heading.textContent = label;
        const description = document.createElement('small'); description.textContent = explanation;
        const scores = document.createElement('div'); scores.className = 'window-demo__rank-scores';
        ranked.forEach((item) => {
          const score = document.createElement('span');
          score.textContent = `${item.customer}: ${item[property]}`;
          scores.append(score);
        });
        group.append(heading, description, scores);
        visual.append(group);
      }
      for (const item of ranked) {
        const tr = document.createElement('tr');
        appendCell(tr, item.customer, true);
        for (const v of [item.revenue, item.rowNumber, item.rank, item.denseRank]) appendCell(tr, v, false);
        body.appendChild(tr);
      }
      const states = [];
      if (!hasRevenueTie) {
        states.push('All revenues are distinct, so all three rankings are 1, 2, 3. Adding customer ID does not change these results.');
      } else {
        states.push(rankBreak.checked ? 'For RANK, A and B are no longer peers because their IDs differ.' : 'RANK keeps the 600 tie: A and B share rank 1, and C is rank 3.');
        states.push(denseBreak.checked ? 'For DENSE_RANK, A and B are no longer peers because their IDs differ.' : 'DENSE_RANK keeps the 600 tie and gives C rank 2.');
      }
      message.textContent = states.join(' ');
      sql.textContent = `ROW_NUMBER() OVER (ORDER BY revenue DESC, customer_id)\nRANK() OVER (ORDER BY revenue DESC${rankBreak.checked ? ', customer_id' : ''})\nDENSE_RANK() OVER (ORDER BY revenue DESC${denseBreak.checked ? ', customer_id' : ''})`;
      result.hidden = !revealed;
      button.textContent = revealed ? 'Hide rankings' : 'Reveal rankings';
      button.setAttribute('aria-expanded', String(revealed));
    }
    button.addEventListener('click', () => { revealed = !revealed; render(); });
    for (const control of [rankBreak, denseBreak, dataSelect]) control.addEventListener('change', () => { revealed = false; render(); });
    render();
  }

  function initLag() {
    const root = document.getElementById('lab01-window-lag');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('window-demo', 'window-lag-demo');
    root.innerHTML = `
      <p class="window-demo__eyebrow">INTERACTIVE · LAG TIMELINE</p>
      <h3>Where did the previous order go?</h3>
      <p>Predict order 104’s previous revenue. Then move the March filter to see what changes.</p>
      <label class="window-demo__label" for="window-lag-filter">Apply the March filter</label>
      <select id="window-lag-filter"><option value="before">Before calculating LAG</option><option value="after">After calculating LAG</option></select>
      <div class="window-demo__timeline-heading"><strong>Rows seen by LAG</strong><span>Earlier → later</span></div><div class="window-demo__timeline" aria-label="Customer 1 order history"></div>
      <p class="window-demo__insight" role="status" aria-live="polite"></p>
      <div class="window-demo__table-wrap" role="region" aria-label="March order result" tabindex="0">
        <table><caption>Visible result: completed orders in March for customer 1</caption><thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Revenue</th><th scope="col">Previous revenue</th><th scope="col">Previous order</th></tr></thead><tbody></tbody></table>
      </div>
      <details><summary>See SQL for this filter position</summary><pre><code></code></pre></details>
      <p class="window-demo__footnote">Browser simulation of the synthetic completed-order data; it does not execute SQL. The SQL uses the worksheet's session-local <code>window_lab_order_revenue</code> view.</p>`;
    const select = root.querySelector('#window-lag-filter');
    const timeline = root.querySelector('.window-demo__timeline');
    const message = root.querySelector('.window-demo__insight');
    const body = root.querySelector('tbody');
    const sql = root.querySelector('details code');
    const dateFilter = "order_date >= DATE '2026-03-01' AND order_date < DATE '2026-04-01'";
    function render() {
      const before = select.value === 'before';
      timeline.replaceChildren();
      for (const order of orders) {
        const card = document.createElement('div');
        card.className = 'window-demo__order' + (order.id === 104 ? ' is-current' : '') + (!before && order.id === 103 ? ' is-previous' : '') + (before && order.date < '2026-03-01' ? ' is-excluded' : '');
        const title = document.createElement('strong');
        title.textContent = `Order ${order.id}`;
        const detail = document.createElement('span');
        detail.textContent = `${order.date} · ${order.revenue}`;
        const label = document.createElement('small');
        label.textContent = order.id === 104 ? 'Current order' : !before && order.id === 103 ? 'Previous order →' : before && order.date < '2026-03-01' ? 'Filtered out' : 'In LAG input';
        card.append(title, detail, label);
        timeline.appendChild(card);
      }
      body.replaceChildren();
      const rows = lagRows(before);
      for (const item of rows) {
        const tr = document.createElement('tr');
        appendCell(tr, item.id, true);
        for (const value of [item.date, item.revenue, item.previous === null ? 'NULL' : item.previous, item.previousOrder === null ? 'None' : item.previousOrder]) appendCell(tr, value, false);
        body.appendChild(tr);
      }
      message.textContent = before
        ? 'Before LAG: only March orders enter the window. Order 104 is first, so its previous revenue is NULL.'
        : 'After LAG: earlier orders remain in the window. Order 104 follows order 103, whose revenue is 200.';
      sql.textContent = before
        ? `SELECT order_id, order_date, revenue,\n  LAG(revenue) OVER (PARTITION BY customer_id\n    ORDER BY order_date, order_id) AS previous_revenue\nFROM window_lab_order_revenue\nWHERE customer_id = 1 AND ${dateFilter}\nORDER BY order_date, order_id;`
        : `WITH history AS (\n  SELECT *, LAG(revenue) OVER (PARTITION BY customer_id\n    ORDER BY order_date, order_id) AS previous_revenue\n  FROM window_lab_order_revenue\n  WHERE customer_id = 1\n)\nSELECT order_id, order_date, revenue, previous_revenue\nFROM history\nWHERE ${dateFilter}\nORDER BY order_date, order_id;`;
    }
    select.addEventListener('change', render);
    render();
  }

  function init() { initRanking(); initLag(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
