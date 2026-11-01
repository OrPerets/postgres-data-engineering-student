/* A writable, disposable browser database; never a real Primary or Replica. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const workerUrl = new URL('lab02-browser-worker.js', script.src);
  workerUrl.search = new URL(script.src).search;
  const questionsUrl = new URL('../assets/lab02-browser/questions.json', script.src);
  questionsUrl.search = new URL(script.src).search;
  const draftPrefix = 'lab02-browser-answer-v1-';
  const maxSql = 50000;
  let worker = null;
  let pending = null;
  let ready = false;
  let nextId = 0;
  let queue = Promise.resolve();
  let queued = 0;
  let databaseGeneration = 0;

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function stopDatabase() {
    if (worker) worker.terminate();
    worker = null;
    ready = false;
    databaseGeneration += 1;
  }
  function execute(sql) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        try { worker = new Worker(workerUrl, { type: 'module' }); }
        catch (_) { reject(new Error('Could not start the browser database. Check browser settings and try again.')); return; }
      }
      const id = ++nextId;
      const timedOut = () => {
        const wasReady = ready;
        stopDatabase();
        pending = null;
        reject(new Error(wasReady ? 'The query took too long and was stopped. The browser database will start fresh on your next run.' : 'The browser database did not start in time. Check your connection and try again.'));
      };
      pending = { id, resolve, reject, timer: setTimeout(timedOut, ready ? 20000 : 90000) };
      worker.onmessage = event => {
        if (!pending || event.data.id !== pending.id) return;
        if (event.data.initialized) {
          ready = true;
          clearTimeout(pending.timer);
          pending.timer = setTimeout(timedOut, 20000);
          return;
        }
        const current = pending;
        pending = null;
        clearTimeout(current.timer);
        if (event.data.error) current.reject(new Error(event.data.error));
        else if (!Array.isArray(event.data.results)) current.reject(new Error('The database returned an unexpected response.'));
        else current.resolve(event.data.results);
      };
      worker.onerror = () => {
        if (!pending) return;
        const current = pending;
        pending = null;
        clearTimeout(current.timer);
        stopDatabase();
        current.reject(new Error('The browser database stopped unexpectedly. It will start fresh on your next run.'));
      };
      worker.postMessage({ id, sql });
    });
  }
  function queueQuery(sql, resetButton) {
    const expectedGeneration = databaseGeneration;
    queued += 1;
    resetButton.disabled = true;
    const run = queue.catch(() => {}).then(() => {
      if (expectedGeneration !== databaseGeneration) {
        throw new Error('The browser database was reset after an earlier query stopped. This queued query was not run; review and run it again.');
      }
      return execute(sql);
    });
    queue = run;
    return run.finally(() => {
      queued -= 1;
      resetButton.disabled = queued !== 0;
    });
  }
  function cell(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  function renderResults(output, results, id) {
    output.replaceChildren();
    output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label');
    if (!results.length) { output.textContent = 'Query completed.'; return; }
    results.forEach((result, index) => {
      const group = el('div', 'lab02-browser__result-group');
      if (results.length > 1) group.append(el('p', '', `Statement ${index + 1}`));
      if (!Array.isArray(result.fields) || !result.fields.length) {
        const count = Number.isInteger(result.affectedRows) ? ` (${result.affectedRows} rows affected)` : '';
        group.append(el('p', '', `Statement completed${count}.`));
      } else {
        const table = el('table');
        const header = table.createTHead().insertRow();
        result.fields.forEach(name => { const th = el('th', '', name); th.scope = 'col'; header.append(th); });
        const body = table.createTBody();
        (result.rows || []).forEach(row => { const tr = body.insertRow(); row.forEach(value => { tr.insertCell().textContent = cell(value); }); });
        group.append(table, el('p', '', result.truncated ? 'Showing the first 200 rows.' : `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} returned.`));
        output.tabIndex = 0;
        output.setAttribute('role', 'region');
        output.setAttribute('aria-label', `Query results for ${id}`);
      }
      output.append(group);
    });
  }
  function initRealWorkspace() {
    const root = document.querySelector('[data-lab02-real-workspace]');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const input = root.querySelector('#lab02-workspace-url');
    const button = root.querySelector('[data-embed-workspace]');
    const status = root.querySelector('[data-embed-status]');
    const frame = root.querySelector('[data-workspace-frame]');
    const link = root.querySelector('[data-embed-link]');
    button.addEventListener('click', () => {
      let url;
      try { url = new URL(input.value.trim()); } catch (_) { url = null; }
      const allowed = url && url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-8766\.app\.github\.dev$/i.test(url.hostname) &&
        url.pathname === '/' && !url.search && !url.hash;
      if (!allowed) {
        frame.hidden = true; frame.removeAttribute('src'); link.hidden = true; link.removeAttribute('href');
        status.textContent = 'Enter the HTTPS root URL of your private Codespaces port 8766, ending in -8766.app.github.dev.';
        return;
      }
      link.href = url.href; link.hidden = false;
      frame.src = url.href; frame.hidden = false;
      status.textContent = 'Attempting to open your workspace below. If it is blocked or asks you to sign in, use the new-tab link.';
    });
  }
  async function init() {
    initRealWorkspace();
    const root = document.querySelector('[data-lab02-browser-workspace]');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const state = root.querySelector('[data-workspace-status]');
    let questions;
    try {
      const response = await fetch(questionsUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      questions = await response.json();
      if (!Array.isArray(questions) || questions.length !== 20 || questions.some(q => !/^[ABCD][1-9]$/.test(q.id) || typeof q.question !== 'string' || typeof q.hint !== 'string' || !Number.isInteger(q.points) || q.points <= 0)) throw new Error('Invalid questions');
    } catch (_) {
      state.textContent = 'Could not load the browser workspace. Use the Codespace worksheet and hints below, or reload this page.';
      return;
    }
    state.textContent = 'The browser database starts when you run your first query.';
    const jump = el('nav', 'lab02-browser__jump');
    jump.setAttribute('aria-label', 'Jump to assignment section');
    jump.append(el('span', '', 'Jump to:'));
    for (const [id, label] of [['a1', 'A · Partitioning'], ['b1', 'B · Replication'], ['c1', 'C · Window functions'], ['d1', 'D · Integration']]) {
      const link = el('a', '', label); link.href = `#lab02-question-${id}`; jump.append(link);
    }
    root.append(jump);
    const controls = el('div', 'lab02-browser__controls');
    const download = el('button', '', 'Download answers'); download.type = 'button';
    const reset = el('button', 'lab02-browser__reset', 'Reset browser database'); reset.type = 'button';
    const resetStatus = el('p', 'lab02-browser__reset-status'); resetStatus.setAttribute('role', 'status'); resetStatus.setAttribute('aria-live', 'polite');
    controls.append(download, reset); root.append(controls, resetStatus);
    reset.addEventListener('click', () => {
      if (queued) return;
      if (!window.confirm('Reset the browser database? Database changes in this browser will be lost. Your SQL drafts will be kept.')) return;
      stopDatabase();
      resetStatus.textContent = 'Browser database reset. It will start fresh on your next query; your drafts were kept.';
      root.querySelectorAll('[data-result]').forEach(output => { output.replaceChildren(); output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label'); });
    });
    const reference = el('details', 'lab02-browser__reference');
    reference.append(el('summary', '', 'Browser tables and columns'));
    reference.append(el('p', '', 'sales_regular and sales_partitioned each begin with the same smaller sample. Both contain sale_id (bigint), sale_date (date), customer_id (integer), and amount (numeric). The partitioned table has yearly children sales_2024, sales_2025, and sales_2026. Changes to one table do not automatically update the other.'));
    root.append(reference);
    const entries = [];
    let storageAvailable = true;
    questions.forEach(question => {
      const item = el('section', 'lab02-browser__question');
      item.dataset.question = question.id;
      item.id = `lab02-question-${question.id.toLowerCase()}`;
      const title = el('h3', '', `Question ${question.id} · ${question.points} points`);
      item.append(title, el('p', 'lab02-browser__prompt', question.question));
      const explanation = question.id === 'C7' || question.id === 'D2';
      const replicaOnly = /^B[1-5]$/.test(question.id);
      if (replicaOnly) item.append(el('p', 'lab02-browser__scope', 'Requires the real Primary/Replica setup. You can draft SQL here, then run it in your Codespace.'));
      if (question.id === 'B5') item.append(el('p', 'lab02-browser__scope', 'In the Replica terminal, confirm pg_is_in_recovery() is true, start a transaction, attempt the write separately, capture the error, and ROLLBACK. Do not retry on Primary.'));
      if (/^C[1-7]$/.test(question.id)) item.append(el('p', 'lab02-browser__scope', 'Part C: use sales_partitioned, show all requested columns, and use SUM(amount) for monetary aggregations.'));
      if (question.id === 'D1') item.append(el('p', 'lab02-browser__scope', 'Practice the query in the browser; the required comparison on both servers must use the real Codespace setup.'));
      if (explanation) item.append(el('p', 'lab02-browser__scope', 'This is a written explanation; keep it with your report.'));
      const hint = el('details', 'lab02-browser__hint');
      hint.append(el('summary', '', `Hint for ${question.id}`), el('p', '', question.hint));
      item.append(hint);
      const editor = el('div', 'lab02-browser__editor');
      const label = el('label', '', explanation ? `Your explanation for ${question.id}` : `Your SQL for ${question.id}`);
      const input = el('textarea'); input.id = `lab02-sql-${question.id.toLowerCase()}`; input.rows = 6; input.spellcheck = false; input.maxLength = maxSql;
      input.placeholder = explanation ? 'Write your explanation here' : 'Write your SQL here'; label.htmlFor = input.id;
      const actions = el('div', 'lab02-browser__editor-actions');
      const status = el('p', 'lab02-browser__status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const output = el('div', 'lab02-browser__result'); output.dataset.result = '';
      try { input.value = localStorage.getItem(draftPrefix + question.id) || ''; }
      catch (_) { storageAvailable = false; }
      input.addEventListener('input', () => {
        try { localStorage.setItem(draftPrefix + question.id, input.value); }
        catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your work before leaving.'; }
      });
      if (!explanation && !replicaOnly) {
        const run = el('button', 'lab02-browser__run', 'Run query'); run.type = 'button'; run.dataset.run = '';
        run.addEventListener('click', () => {
          const selected = input.value.slice(input.selectionStart, input.selectionEnd).trim();
          const sql = selected || input.value.trim();
          if (!sql) { status.textContent = 'Write or select a SQL statement first.'; return; }
          if (sql.length > maxSql) { status.textContent = 'Please use at most 50,000 characters per run.'; return; }
          run.disabled = true;
          status.textContent = ready ? 'Running query…' : 'Starting the browser database and running your query…';
          output.replaceChildren(); output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label');
          queueQuery(sql, reset).then(results => {
            renderResults(output, results, question.id);
            status.textContent = storageAvailable ? 'Query complete.' : 'Query complete. Browser storage is unavailable; download your work.';
          }).catch(error => { status.textContent = `Could not run: ${error.message}`; })
            .finally(() => { run.disabled = false; });
        });
        actions.append(run);
      }
      editor.append(label, input, actions, status, output); item.append(editor); root.append(item);
      entries.push({ id: question.id, input, explanation });
    });
    if (!storageAvailable) state.textContent = 'Browser storage is unavailable. Download your answers before leaving.';
    const fallback = document.querySelector('[data-lab02-static-hints]');
    if (fallback) fallback.hidden = true;
    download.addEventListener('click', () => {
      const text = entries.map(({ id, input, explanation }) => {
        const answer = input.value;
        return `-- Question ${id}\n${explanation ? answer.split('\n').map(line => `-- ${line}`).join('\n') : `${answer}\n;`}\n`;
      }).join('\n');
      const url = URL.createObjectURL(new Blob([text], { type: 'text/sql;charset=utf-8' }));
      const anchor = el('a'); anchor.href = url; anchor.download = 'lab02-browser-answers.sql'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
