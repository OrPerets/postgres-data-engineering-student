/* Lab 01 practice: a separate, browser-local PostgreSQL sample database. */
(function () {
  'use strict';
  function formatDownload(answers) {
    return answers.map(({ number, sql }) => `-- Question ${number}\n${sql}\n;\n`).join('\n');
  }
  function sampleQuery(table, allRows = false) {
    const queries = {
      customers: 'SELECT * FROM customers ORDER BY customer_id',
      orders: 'SELECT * FROM orders ORDER BY order_id',
      order_items: 'SELECT * FROM order_items ORDER BY order_id, line_no',
    };
    return Object.prototype.hasOwnProperty.call(queries, table) ? queries[table] + (allRows ? '' : ' LIMIT 5') : null;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { formatDownload, sampleQuery };
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const workerUrl = new URL('lab01-practice-worker.js', script.src);
  const storagePrefix = 'lab01-practice-answer-v1-';
  const maxSql = 50000;
  let worker = null;
  let sequence = 0;
  let pending = null;
  let ready = false;
  let queue = Promise.resolve();

  function terminate() {
    if (worker) worker.terminate();
    worker = null;
    ready = false;
  }

  function execute(sql) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        try { worker = new Worker(workerUrl, { type: 'module' }); }
        catch (error) { reject(new Error('Could not start the browser database. Check your browser settings and try again.')); return; }
      }
      const id = ++sequence;
      const onTimeout = () => {
        const wasReady = ready;
        terminate();
        pending = null;
        reject(new Error(wasReady ? 'The query took too long and was stopped. The sample database will restart on your next run.' : 'The browser database did not start in time. Check your connection and try again.'));
      };
      const timeout = setTimeout(onTimeout, ready ? 12000 : 60000);
      pending = { id, resolve, reject, timeout };
      worker.onmessage = (event) => {
        if (!pending || event.data.id !== pending.id) return;
        if (event.data.initialized) {
          ready = true;
          clearTimeout(pending.timeout);
          pending.timeout = setTimeout(onTimeout, 12000);
          return;
        }
        const current = pending;
        pending = null;
        clearTimeout(current.timeout);
        ready = true;
        if (event.data.error) current.reject(new Error(event.data.error));
        else current.resolve(event.data.results);
      };
      worker.onerror = () => {
        if (!pending) return;
        const current = pending;
        pending = null;
        clearTimeout(current.timeout);
        terminate();
        current.reject(new Error('The browser database stopped unexpectedly. Try running your query again.'));
      };
      worker.postMessage({ id, sql });
    });
  }

  function cell(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function render(target, results) {
    target.replaceChildren();
    if (!results.length) { target.textContent = 'Query completed.'; return; }
    results.forEach((result, index) => {
      const group = document.createElement('div');
      if (results.length > 1) {
        const heading = document.createElement('p');
        heading.textContent = `Statement ${index + 1}`;
        group.appendChild(heading);
      }
      if (!result.fields.length) {
        const message = document.createElement('p');
        message.textContent = 'Statement completed.';
        group.appendChild(message);
      } else {
        const table = document.createElement('table');
        const header = table.createTHead().insertRow();
        result.fields.forEach((name) => {
          const th = document.createElement('th');
          th.scope = 'col';
          th.textContent = name;
          header.appendChild(th);
        });
        const body = table.createTBody();
        result.rows.forEach((row) => {
          const tr = body.insertRow();
          row.forEach((value) => { tr.insertCell().textContent = cell(value); });
        });
        group.appendChild(table);
        const count = document.createElement('p');
        count.textContent = result.truncated ? 'Showing the first 100 rows.' : `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} returned.`;
        group.appendChild(count);
      }
      target.appendChild(group);
    });
  }

  function mount() {
    const root = document.querySelector('[data-lab01-practice]');
    if (!root || root.dataset.practiceMounted) return;
    root.dataset.practiceMounted = 'true';
    const sections = [...root.querySelectorAll('[data-question]')];
    let storageAvailable = true;
    sections.forEach((section) => {
      const number = section.dataset.question;
      const input = section.querySelector('[data-sql]');
      const button = section.querySelector('[data-run]');
      const output = section.querySelector('[data-result]');
      const status = section.querySelector('[data-status]');
      if (!input || !button || !output || !status) return;
      try { input.value = localStorage.getItem(storagePrefix + number) || ''; }
      catch (_) { storageAvailable = false; status.textContent = 'Browser storage is unavailable. Download your work before leaving.'; }
      input.addEventListener('input', () => {
        try { localStorage.setItem(storagePrefix + number, input.value); }
        catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your work before leaving.'; }
      });
      button.addEventListener('click', () => {
        const selected = input.value.slice(input.selectionStart, input.selectionEnd).trim();
        const sql = selected || input.value.trim();
        if (!sql) { status.textContent = 'Write or select a SQL statement first.'; return; }
        if (sql.length > maxSql) { status.textContent = 'Please use at most 50,000 characters per run.'; return; }
        button.disabled = true;
        status.textContent = ready ? 'Running query…' : 'Starting the browser database and running your query…';
        output.replaceChildren();
        const run = queue.catch(() => {}).then(() => execute(sql));
        queue = run;
        run.then((results) => {
          render(output, results);
          status.textContent = storageAvailable ? 'Query complete.' : 'Query complete. Browser storage is unavailable; download your work.';
        }).catch((error) => { status.textContent = `Could not run: ${error.message}`; })
          .finally(() => { button.disabled = false; });
      });
    });
    root.querySelectorAll('[data-reference-table]').forEach((reference) => {
      const buttons = [...reference.querySelectorAll('[data-sample], [data-view-all]')];
      const status = reference.querySelector('[data-reference-status]');
      const output = reference.querySelector('[data-reference-result]');
      if (!buttons.length || !status || !output) return;
      buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const allRows = button.hasAttribute('data-view-all');
        const sql = sampleQuery(button.dataset.sample || button.dataset.viewAll, allRows);
        if (!sql) { status.textContent = 'This sample is not available.'; return; }
        buttons.forEach((control) => { control.disabled = true; });
        status.textContent = ready ? 'Loading sample rows…' : 'Starting the browser database and loading sample rows…';
        output.replaceChildren();
        const run = queue.catch(() => {}).then(() => execute(sql));
        queue = run;
        run.then((results) => {
          render(output, results);
          output.tabIndex = 0;
          output.setAttribute('role', 'region');
          output.setAttribute('aria-label', `Rows from ${reference.dataset.referenceTable}`);
          status.textContent = allRows ? 'Showing the lab table rows.' : 'Showing up to five rows from the lab sample data.';
        }).catch((error) => { status.textContent = `Could not load rows: ${error.message}`; })
          .finally(() => { buttons.forEach((control) => { control.disabled = false; }); });
      });
      });
    });
    const download = root.querySelector('[data-practice-export]');
    if (download) download.addEventListener('click', () => {
      const answers = sections.map((section) => {
        const input = section.querySelector('[data-sql]');
        return { number: section.dataset.question, sql: input ? input.value : '' };
      });
      const contents = formatDownload(answers);
      const url = URL.createObjectURL(new Blob([contents], { type: 'text/sql;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'lab01-practice-answers.sql';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  if (typeof document$ !== 'undefined') document$.subscribe(mount);
})();
