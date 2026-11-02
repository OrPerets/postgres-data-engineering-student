(function () {
  'use strict';
  const source = document.currentScript;
  if (!source || !source.src) return;
  const workerUrl = new URL('lab01-practice-worker.js', source.src);
  workerUrl.search = new URL(source.src).search;
  function mount() {
    const root = document.querySelector('[data-useful-sql]');
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    root.querySelectorAll('.highlight').forEach((block, index) => {
      const code = block.querySelector('pre code');
      if (!code) return;
      const area = document.createElement('div'); area.className = 'useful-runner';
      const run = document.createElement('button'); run.type = 'button'; run.textContent = 'Run query';
      run.setAttribute('aria-label', `Run example ${index + 1}`);
      const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const output = document.createElement('div'); output.className = 'useful-results';
      area.append(run, status, output); block.after(area);
      let worker;
      run.addEventListener('click', () => {
        output.replaceChildren(); run.disabled = true; status.textContent = 'Starting browser PostgreSQL…';
        try { worker = new Worker(workerUrl, { type: 'module' }); }
        catch (_) { run.disabled = false; status.textContent = 'Could not start the browser database.'; return; }
        const timer = setTimeout(() => finish('The query took too long. Please try again.'), 60000);
        function finish(message) { clearTimeout(timer); worker.terminate(); run.disabled = false; status.textContent = message; }
        worker.onerror = () => finish('Could not start the browser database. Please try again.');
        worker.onmessage = ({ data }) => {
          if (data.initialized) { status.textContent = 'Running query…'; return; }
          if (data.error) { finish(`Could not run: ${data.error}`); return; }
          if (!data.results) return;
          for (const result of data.results) {
            const table = document.createElement('table');
            const header = table.createTHead().insertRow();
            result.fields.forEach((field) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = field; header.append(th); });
            const body = table.createTBody();
            result.rows.forEach((row) => { const tr = body.insertRow(); row.forEach((value) => { tr.insertCell().textContent = value == null ? 'NULL' : String(value); }); });
            output.append(table);
          }
          const result = data.results[0];
          finish(result.truncated ? 'Showing the first 100 rows.' : `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} returned.`);
        };
        worker.postMessage({ id: 1, sql: code.textContent });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  if (typeof document$ !== 'undefined') document$.subscribe(mount);
})();
