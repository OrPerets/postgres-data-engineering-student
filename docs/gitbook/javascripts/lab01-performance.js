(function () {
  'use strict';
  const source = document.currentScript;
  if (!source || !source.src) return;
  const workerUrl = new URL('lab01-performance-worker.js', source.src);
  workerUrl.search = new URL(source.src).search;
  function mount() {
    const root = document.querySelector('[data-performance-comparison]');
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    const form = root.querySelector('form');
    const input = root.querySelector('input');
    const run = root.querySelector('[data-perf-run]');
    const stop = root.querySelector('[data-perf-stop]');
    const status = root.querySelector('[data-perf-status]');
    const output = root.querySelector('[data-perf-results]');
    let worker;
    function reset() { if (worker) worker.terminate(); worker = null; run.disabled = false; stop.hidden = true; }
    stop.addEventListener('click', () => { reset(); status.textContent = 'Comparison stopped.'; });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.reportValidity()) return;
      output.replaceChildren();
      try { worker = new Worker(workerUrl, { type: 'module' }); }
      catch (_) { status.textContent = 'Could not start the comparison in this browser.'; return; }
      run.disabled = true; stop.hidden = false; status.textContent = 'Starting browser PostgreSQL…';
      worker.onerror = (event) => { const detail = event.message; reset(); status.textContent = `The comparison could not run${detail ? ': ' + detail : '. Please try again.'}`; };
      worker.onmessage = ({ data }) => {
        if (data.phase === 'setup') status.textContent = 'Preparing sales data…';
        if (data.phase === 'running') status.textContent = `Running ${data.name.toLowerCase()}…`;
        if (data.phase === 'error') { reset(); status.textContent = `Could not run: ${data.message}`; }
        if (data.phase !== 'done') return;
        reset();
        status.textContent = data.same ? 'Both queries returned identical results.' : 'The query results differ.';
        for (const result of data.results) {
          const panel = document.createElement('section');
          const title = document.createElement('h4'); title.textContent = `${result.name} · ${result.ms.toFixed(1)} ms`;
          const table = document.createElement('table');
          const header = table.createTHead().insertRow();
          ['ID', 'Amount', 'Running total'].forEach((label) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; header.append(th); });
          const body = table.createTBody();
          result.rows.forEach((row) => { const tr = body.insertRow(); row.forEach((value) => { tr.insertCell().textContent = String(value); }); });
          panel.append(title, table);
          if (result.truncated) { const more = document.createElement('p'); more.textContent = '…'; more.setAttribute('aria-label', 'More rows not shown'); panel.append(more); }
          output.append(panel);
        }
      };
      worker.postMessage({ count: Number(input.value) });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  if (typeof document$ !== 'undefined') document$.subscribe(mount);
})();
