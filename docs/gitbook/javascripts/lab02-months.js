/* Illustrative browser-only monthly window simulation; no database calls. */
(function () {
  'use strict';
  const months = Object.freeze([
    { month: 'January', revenue: 100 }, { month: 'February', revenue: 0 },
    { month: 'March', revenue: 300 }, { month: 'April', revenue: 200 }
  ]);

  function calculate(mode, month) {
    if (!['sparse', 'complete'].includes(mode)) throw new Error('Unknown calendar');
    if (!months.some(row => row.month === month)) throw new Error('Unknown month');
    const rows = months.filter(row => mode === 'complete' || row.month !== 'February');
    const index = rows.findIndex(row => row.month === month);
    if (index < 0) return { rows, current: null, previous: null, frame: [], average: null };
    const frame = rows.slice(Math.max(0, index - 2), index + 1);
    return { rows, current: rows[index], previous: index ? rows[index - 1] : null, frame,
      average: frame.reduce((sum, row) => sum + row.revenue, 0) / frame.length };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab02-months-explorer');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    root.classList.add('lab02-months');
    root.innerHTML = `
      <p class="lab02-months__eyebrow">INTERACTIVE · MONTHLY WINDOWS</p>
      <h3>Is the previous row the previous month?</h3>
      <p>Imagine January revenue 100, no February sales, March 300 and April 200. Predict the previous value and three-row average, then reveal the calculation.</p>
      <p>Here we assume complete data and no February sales, so a calendar row can use zero. An unknown or missing month must not automatically be treated as zero.</p>
      <div class="lab02-months__controls">
        <label for="lab02-months-mode">Rows supplied to the window<select id="lab02-months-mode"><option value="sparse">Only months with sales</option><option value="complete">Complete calendar (February = 0)</option></select></label>
        <label for="lab02-months-current">Current month<select id="lab02-months-current"><option>January</option><option>February</option><option selected>March</option><option>April</option></select></label>
      </div>
      <button type="button" id="lab02-months-reveal" aria-expanded="false" aria-controls="lab02-months-result">Reveal calculation</button>
      <div id="lab02-months-result" hidden>
        <p class="lab02-months__note">Scroll horizontally within the table to see all columns if needed.</p>
        <div class="lab02-months__table" role="region" aria-label="Months supplied to the window" tabindex="0"><table><caption>Rows in date order; status identifies the current frame</caption><thead><tr><th scope="col">Month</th><th scope="col">Revenue</th><th scope="col">Role</th></tr></thead><tbody></tbody></table></div>
        <div class="lab02-months__result" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
      <p class="lab02-months__note">Illustrative browser simulation; it does not query PostgreSQL. <code>LAG</code> reads a previous row, and <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> counts rows, not calendar months.</p>`;
    const mode = root.querySelector('#lab02-months-mode');
    const current = root.querySelector('#lab02-months-current');
    const reveal = root.querySelector('#lab02-months-reveal');
    const result = root.querySelector('#lab02-months-result');
    const tbody = root.querySelector('tbody');
    const summary = root.querySelector('.lab02-months__result');
    let shown = false;
    const fmt = n => Number.isInteger(n) ? String(n) : `${n.toFixed(2)} (rounded)`;
    function render() {
      const state = calculate(mode.value, current.value);
      tbody.replaceChildren();
      for (const item of state.rows) {
        const tr = document.createElement('tr');
        const isCurrent = state.current && item.month === state.current.month;
        const inFrame = state.frame.some(row => row.month === item.month);
        if (inFrame) tr.classList.add('lab02-months__in-frame');
        if (isCurrent) tr.classList.add('lab02-months__current');
        const th = document.createElement('th'); th.scope = 'row'; th.textContent = item.month; tr.append(th);
        for (const text of [item.revenue, isCurrent ? 'Current row · in frame' : inFrame ? 'In frame' : 'Outside frame']) {
          const td = document.createElement('td'); td.textContent = String(text); tr.append(td);
        }
        tbody.append(tr);
      }
      if (!state.current) {
        summary.textContent = `${current.value} has no row in this input, so there is no window result for that month. Choose the complete calendar to include it.`;
      } else {
        const previous = state.previous ? `${state.previous.month}: ${state.previous.revenue}` : 'NULL (no previous row)';
        const terms = state.frame.map(row => row.revenue).join(' + ');
        summary.textContent = `LAG for ${state.current.month}: ${previous}. Three-row moving average: (${terms}) / ${state.frame.length} = ${fmt(state.average)}. The frame contains ${state.frame.length} available row${state.frame.length === 1 ? '' : 's'}.`;
      }
      result.hidden = !shown;
      reveal.setAttribute('aria-expanded', String(shown));
      reveal.textContent = shown ? 'Hide calculation' : 'Reveal calculation';
    }
    for (const control of [mode, current]) control.addEventListener('change', () => { shown = false; render(); });
    reveal.addEventListener('click', () => { shown = !shown; render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
