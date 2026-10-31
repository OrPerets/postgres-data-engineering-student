/* Browser-only teaching simulation. The SQL shown is not executed. */
(function () {
  'use strict';

  const orders = Object.freeze([
    { id: 101, date: '2026-01-05', revenue: 300 },
    { id: 102, date: '2026-02-05', revenue: 200 },
    { id: 103, date: '2026-02-05', revenue: 200 },
    { id: 104, date: '2026-03-01', revenue: 400 },
    { id: 134, date: '2026-03-27', revenue: 120 }
  ]);
  const modes = ['running', 'moving', 'default'];
  const orderings = ['date_id', 'date'];

  function calculateFrame(index, mode, ordering) {
    if (!Number.isInteger(index) || index < 0 || index >= orders.length) throw new Error('Invalid current row');
    if (!modes.includes(mode)) throw new Error('Invalid calculation');
    if (!orderings.includes(ordering)) throw new Error('Invalid ordering');
    // This concrete date-only ROWS sequence is one possible ordering of tied dates.
    const current = orders[index];
    const start = mode === 'moving' ? Math.max(0, index - 2) : 0;
    const end = mode === 'default' && ordering === 'date'
      ? orders.reduce((last, row, i) => row.date <= current.date ? i : last, index) : index;
    const frame = orders.slice(start, end + 1);
    const total = frame.reduce((sum, row) => sum + row.revenue, 0);
    const result = mode === 'moving' ? total / frame.length : total;
    return { current, frame, result, total, mode, ordering };
  }

  function windowSql(mode, ordering) {
    if (!modes.includes(mode) || !orderings.includes(ordering)) throw new Error('Invalid calculation or ordering');
    const field = mode === 'moving' ? 'AVG' : 'SUM';
    const order = ordering === 'date' ? 'order_date' : 'order_date, order_id';
    const frame = mode === 'running' ? '\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW'
      : mode === 'moving' ? '\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW' : '';
    return `SELECT order_id, order_date, revenue,\n  ${field}(revenue) OVER (\n    PARTITION BY customer_id\n    ORDER BY ${order}${frame}\n  ) AS result\nFROM window_lab_order_revenue\nWHERE customer_id = 1\nORDER BY order_date, order_id;`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { orders, calculateFrame, windowSql };
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab01-window-frame');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('window-frame');
    root.innerHTML = `
      <div class="window-frame__heading"><span class="window-frame__eyebrow">EXPLORE THE WINDOW</span><h3>Watch the frame move</h3><p>One customer, five orders. Move through the rows and see which values contribute.</p></div>
      <div class="window-frame__controls">
        <label for="window-frame-mode">1 · Choose a calculation<select id="window-frame-mode"><option value="running">Running sum</option><option value="moving">Average of last 3 orders</option><option value="default">Running sum · default frame</option></select></label>
      </div>
      <details class="window-frame__advanced"><summary>Explore ordering and ties</summary><label for="window-frame-order">Window ordering<select id="window-frame-order"><option value="date_id">Date, then order ID</option><option value="date">Date only</option></select></label></details>
      <div class="window-frame__stage"><div class="window-frame__stage-heading"><strong>2 · Move through the orders</strong><span class="window-frame__progress"></span></div>
      <p class="window-frame__hint">Select an order or use the arrows. The tinted cards are in the frame; the outlined card is the current row.</p>
      <div class="window-frame__strip" role="group" aria-label="Orders in the customer partition"></div>
      <div class="window-frame__actions" aria-label="Move through orders">
        <button type="button" data-action="previous">← Previous</button><button type="button" data-action="next">Next →</button><button type="button" data-action="play" aria-pressed="false">Play</button><button type="button" data-action="reset">Reset</button>
      </div></div>
      <div class="window-frame__result" role="status" aria-live="polite" aria-atomic="true"><span class="window-frame__result-label">3 · CALCULATE</span><strong class="window-frame__result-title"></strong><p class="window-frame__math"></p><p class="window-frame__detail"></p></div>
      <details class="window-frame__data"><summary>See the row table</summary><div class="window-frame__table-wrap" role="region" aria-label="Order rows and current frame" tabindex="0"><table><caption>Customer 1 · completed orders</caption><thead><tr><th scope="col">Order</th><th scope="col">Date</th><th scope="col">Revenue</th><th scope="col">Role in calculation</th></tr></thead><tbody></tbody></table></div></details>
      <details class="window-frame__sql"><summary>Show matching SQL</summary><pre><code></code></pre></details>
      <p class="window-frame__note">Browser simulation of the lab's synthetic data; it does not execute SQL or connect to PostgreSQL. Run the worksheet to verify the query.</p>`;
    const mode = root.querySelector('#window-frame-mode');
    const ordering = root.querySelector('#window-frame-order');
    const strip = root.querySelector('.window-frame__strip');
    const progress = root.querySelector('.window-frame__progress');
    const previous = root.querySelector('[data-action="previous"]');
    const next = root.querySelector('[data-action="next"]');
    const play = root.querySelector('[data-action="play"]');
    const reset = root.querySelector('[data-action="reset"]');
    const tbody = root.querySelector('tbody');
    const title = root.querySelector('.window-frame__result-title');
    const math = root.querySelector('.window-frame__math');
    const detail = root.querySelector('.window-frame__detail');
    const code = root.querySelector('code');
    let index = 0;
    let timer = null;
    const fmt = (value) => Number.isInteger(value) ? String(value) : value.toFixed(2) + ' (rounded)';
    function stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      play.textContent = 'Play';
      play.setAttribute('aria-pressed', 'false');
    }
    function render() {
      const calc = calculateFrame(index, mode.value, ordering.value);
      progress.textContent = `Order ${index + 1} of ${orders.length}`;
      strip.replaceChildren();
      orders.forEach((row, rowIndex) => {
        const isCurrent = row.id === calc.current.id;
        const inFrame = calc.frame.some((member) => member.id === row.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'window-frame__card' + (inFrame ? ' is-in-frame' : '') + (isCurrent ? ' is-current' : '');
        card.setAttribute('aria-pressed', String(isCurrent));
        const name = document.createElement('span'); name.textContent = `Order ${row.id}`;
        const value = document.createElement('strong'); value.textContent = String(row.revenue);
        const date = document.createElement('small'); date.textContent = row.date;
        const role = document.createElement('small'); role.className = 'window-frame__card-role';
        role.textContent = isCurrent ? 'Current · in frame' : inFrame ? 'In frame' : 'Outside frame';
        card.append(name, value, date, role);
        card.addEventListener('click', () => { stop(); index = rowIndex; render(); strip.children[rowIndex].focus(); });
        strip.append(card);
      });
      previous.disabled = index === 0;
      next.disabled = index === orders.length - 1;
      tbody.replaceChildren();
      for (const row of orders) {
        const isCurrent = row.id === calc.current.id;
        const inFrame = calc.frame.some((member) => member.id === row.id);
        const tr = document.createElement('tr');
        if (inFrame) tr.classList.add('window-frame__in-frame');
        if (isCurrent) tr.classList.add('window-frame__current');
        const role = isCurrent ? 'Current row · in frame' : inFrame ? 'In frame' : 'Outside frame';
        for (const value of [row.id, row.date, row.revenue, role]) {
          const td = document.createElement('td');
          td.textContent = String(value);
          tr.append(td);
        }
        tbody.append(tr);
      }
      const label = mode.value === 'moving' ? 'Moving average' : 'Running sum';
      title.textContent = `${label} at order ${calc.current.id}: ${fmt(calc.result)}`;
      const values = calc.frame.map((row) => row.revenue).join(' + ');
      math.textContent = mode.value === 'moving' ? `(${values}) ÷ ${calc.frame.length} = ${fmt(calc.result)}` : `${values} = ${fmt(calc.result)}`;
      let note = mode.value === 'default'
        ? (ordering.value === 'date' ? 'The default frame includes all peers with the same date, regardless of their relative position.' : 'With date and unique order ID, there are no same-date peers in this window.')
        : (mode.value === 'moving' ? 'The frame contains this order and up to two preceding orders.' : 'The frame contains ordered rows from the start through the current row.');
      if (ordering.value === 'date' && mode.value !== 'default') note += ' With date-only ROWS, the relative order of same-date orders is not guaranteed; this display shows one possible order.';
      detail.textContent = note;
      code.textContent = windowSql(mode.value, ordering.value);
    }
    previous.addEventListener('click', () => { stop(); if (index > 0) index -= 1; render(); });
    next.addEventListener('click', () => { stop(); if (index < orders.length - 1) index += 1; render(); });
    mode.addEventListener('change', () => { stop(); render(); });
    ordering.addEventListener('change', () => { stop(); render(); });
    reset.addEventListener('click', () => { stop(); index = 0; mode.value = 'running'; ordering.value = 'date_id'; render(); });
    play.addEventListener('click', () => {
      if (timer !== null) { stop(); return; }
      if (index === orders.length - 1) index = 0;
      render();
      play.textContent = 'Pause';
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (index >= orders.length - 1) { stop(); return; }
        index += 1;
        render();
        if (index === orders.length - 1) stop();
      }, 1800);
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
