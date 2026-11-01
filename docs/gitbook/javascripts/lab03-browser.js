/* A writable, disposable browser warehouse; separate from Codespaces. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const workerUrl = new URL('lab03-browser-worker.js', script.src);
  workerUrl.search = new URL(script.src).search;
  const questionsUrl = new URL('../assets/lab03-browser/questions.json', script.src);
  questionsUrl.search = new URL(script.src).search;
  const draftPrefix = 'lab03-browser-answer-v1-';
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
  function execute(request) {
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
      worker.postMessage({ id, ...request });
    });
  }
  function queueQuery(request, resetButton, reloadButton) {
    const expectedGeneration = databaseGeneration;
    queued += 1;
    resetButton.disabled = true; reloadButton.disabled = true;
    const run = queue.catch(() => {}).then(() => {
      if (expectedGeneration !== databaseGeneration) {
        throw new Error('The browser database was reset after an earlier query stopped. This queued query was not run; review and run it again.');
      }
      return execute(request);
    });
    queue = run;
    return run.finally(() => {
      queued -= 1;
      resetButton.disabled = queued !== 0; reloadButton.disabled = queued !== 0;
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
      const group = el('div', 'lab03-browser__result-group');
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
    const root = document.querySelector('[data-lab03-real-workspace]');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const input = root.querySelector('#lab03-workspace-url');
    const button = root.querySelector('[data-embed-workspace]');
    const status = root.querySelector('[data-embed-status]');
    const frame = root.querySelector('[data-workspace-frame]');
    const link = root.querySelector('[data-embed-link]');
    button.addEventListener('click', () => {
      let url;
      try { url = new URL(input.value.trim()); } catch (_) { url = null; }
      const allowed = url && url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-8767\.app\.github\.dev$/i.test(url.hostname) &&
        url.pathname === '/' && !url.search && !url.hash;
      if (!allowed) {
        frame.hidden = true; frame.removeAttribute('src'); link.hidden = true; link.removeAttribute('href');
        status.textContent = 'Enter the HTTPS root URL of your private Codespaces port 8767, ending in -8767.app.github.dev.';
        return;
      }
      link.href = url.href; link.hidden = false;
      frame.src = url.href; frame.hidden = false;
      status.textContent = 'Attempting to open your workspace below. If it is blocked or asks you to sign in, use the new-tab link.';
    });
  }
  async function init() {
    initRealWorkspace();
    const root = document.querySelector('[data-lab03-browser-workspace]');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    const state = root.querySelector('[data-workspace-status]');
    let questions;
    try {
      const response = await fetch(questionsUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      questions = await response.json();
      if (!Array.isArray(questions) || questions.length !== 18 || questions.some((q, index) => q.id !== String(index + 1) || typeof q.question !== 'string' || typeof q.hint !== 'string')) throw new Error('Invalid questions');
    } catch (_) {
      state.textContent = 'Could not load the browser workspace. Use the Codespace worksheet and hints below, or reload this page.';
      return;
    }
    state.textContent = 'The browser database starts when you run your first query.';
    const jump = el('nav', 'lab03-browser__jump');
    jump.setAttribute('aria-label', 'Jump to assignment section');
    jump.append(el('span', '', 'Jump to:'));
    for (const [id, label] of [['1', 'A · Source and staging (25%)'], ['6', 'B · Dimensional modeling (30%)'], ['11', 'C · Analytics (30%)'], ['16', 'D · Reliability (15%)']]) {
      const link = el('a', '', label); link.href = `#lab03-question-${id}`; jump.append(link);
    }
    root.append(jump);
    const controls = el('div', 'lab03-browser__controls');
    const download = el('button', '', 'Download answers'); download.type = 'button';
    const reset = el('button', 'lab03-browser__reset', 'Reset browser database'); reset.type = 'button';
    const reload = el('button', 'lab03-browser__reload', 'Rerun fixed-batch load'); reload.type = 'button';
    const resetStatus = el('p', 'lab03-browser__reset-status'); resetStatus.setAttribute('role', 'status'); resetStatus.setAttribute('aria-live', 'polite');
    controls.append(download, reload, reset); root.append(controls, resetStatus);
    reset.addEventListener('click', () => {
      if (queued) return;
      if (!window.confirm('Reset the browser database? Database changes in this browser will be lost. Your SQL drafts will be kept.')) return;
      stopDatabase();
      resetStatus.textContent = 'Browser database reset. It will start fresh on your next query; your drafts were kept.';
      root.querySelectorAll('[data-result]').forEach(output => { output.replaceChildren(); output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label'); });
      root.querySelectorAll('.lab03-browser__schema-result').forEach(output => { output.replaceChildren(); output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label'); });
      root.querySelectorAll('.lab03-browser__schema-status').forEach(status => { status.textContent = ''; });
    });
    reload.addEventListener('click', () => {
      if (queued) return;
      if (!window.confirm('Rerun the supplied warehouse load in this browser database? It may add data, but existing fact rows are not updated.')) return;
      resetStatus.textContent = 'Running the supplied warehouse load…';
      queueQuery({ action: 'reload-warehouse' }, reset, reload).then(() => {
        resetStatus.textContent = 'Load completed. Compare fact rows before and after; existing facts are not updated by this fixed-batch load.';
      }).catch(error => { resetStatus.textContent = `Could not rerun the load: ${error.message}`; });
    });
    const reference = el('details', 'lab03-browser__reference');
    reference.append(el('summary', '', 'Browser tables and columns'));
    const referencePanel = el('div', 'lab03-browser__reference-panel');
    referencePanel.append(el('p', '', 'SRC_SCHEMA contains snowflake_raw and dataiku_raw. STAGE_SCHEMA contains snowflake_clean, dataiku_clean, and usage views. DWH_SCHEMA contains fact_usage, reporting_scope, and dimensions dim_source, dim_date, dim_user, dim_entity, and dim_model. The two sources have different cost meanings; NULL means unknown, not zero.'));
    const schemaButton = el('button', '', 'Load columns'); schemaButton.type = 'button';
    const schemaStatus = el('p', 'lab03-browser__schema-status'); schemaStatus.setAttribute('role', 'status'); schemaStatus.setAttribute('aria-live', 'polite');
    const schemaOutput = el('div', 'lab03-browser__schema-result');
    referencePanel.append(schemaButton, schemaStatus, schemaOutput);
    reference.append(referencePanel);
    const entries = [];
    let storageAvailable = true;
    questions.forEach(question => {
      const item = el('section', 'lab03-browser__question');
      item.dataset.question = question.id;
      item.id = `lab03-question-${question.id.toLowerCase()}`;
      const title = el('h3', '', `Question ${question.id}`);
      item.append(title, el('p', 'lab03-browser__prompt', question.question));
      const reportOnly = ['6', '7', '17', '18'].includes(question.id);
      if (question.id === '7') item.append(el('p', 'lab03-browser__scope', 'Include your star-schema diagram in the report; use the notes below for your explanation.'));
      if (question.id === '10' || question.id === '16') item.append(el('p', 'lab03-browser__scope', 'Use Rerun fixed-batch load above and compare your own observations. The load skips existing facts; it does not update corrections. Test an unsafe insert only in this disposable browser database or another isolated setup.'));
      const hint = el('details', 'lab03-browser__hint');
      hint.append(el('summary', '', `Hint for ${question.id}`), el('p', '', question.hint));
      item.append(hint);
      const editor = el('div', 'lab03-browser__editor');
      const label = el('label', '', reportOnly ? `Your report notes for question ${question.id}` : `Your SQL for question ${question.id}`);
      const input = el('textarea'); input.id = `lab03-sql-${question.id}`; input.rows = 6; input.spellcheck = false; input.maxLength = maxSql;
      input.placeholder = reportOnly ? 'Write your report notes here' : 'Write your SQL here'; label.htmlFor = input.id;
      const actions = el('div', 'lab03-browser__editor-actions');
      const status = el('p', 'lab03-browser__status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const output = el('div', 'lab03-browser__result'); output.dataset.result = '';
      try { input.value = localStorage.getItem(draftPrefix + question.id) || ''; }
      catch (_) { storageAvailable = false; }
      input.addEventListener('input', () => {
        try { localStorage.setItem(draftPrefix + question.id, input.value); }
        catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your work before leaving.'; }
      });
      if (!reportOnly) {
        const run = el('button', 'lab03-browser__run', 'Run query'); run.type = 'button'; run.dataset.run = '';
        run.addEventListener('click', () => {
          const selected = input.value.slice(input.selectionStart, input.selectionEnd).trim();
          const sql = selected || input.value.trim();
          if (!sql) { status.textContent = 'Write or select a SQL statement first.'; return; }
          if (sql.length > maxSql) { status.textContent = 'Please use at most 50,000 characters per run.'; return; }
          run.disabled = true;
          status.textContent = ready ? 'Running query…' : 'Starting the browser database and running your query…';
          output.replaceChildren(); output.removeAttribute('role'); output.removeAttribute('tabindex'); output.removeAttribute('aria-label');
          queueQuery({ sql }, reset, reload).then(results => {
            renderResults(output, results, question.id);
            status.textContent = storageAvailable ? 'Query complete.' : 'Query complete. Browser storage is unavailable; download your work.';
          }).catch(error => { status.textContent = `Could not run: ${error.message}`; })
            .finally(() => { run.disabled = false; });
        });
        actions.append(run);
      }
      const localReference = reference.cloneNode(true);
      localReference.classList.add('lab03-browser__local-reference');
      localReference.querySelector('summary').setAttribute('aria-label', `Browser tables and columns for question ${question.id}`);
      const loadColumns = localReference.querySelector('button');
      const columnsStatus = localReference.querySelector('.lab03-browser__schema-status');
      const columnsOutput = localReference.querySelector('.lab03-browser__schema-result');
      loadColumns.setAttribute('aria-label', `Load browser schema columns for question ${question.id}`);
      loadColumns.addEventListener('click', () => {
        loadColumns.disabled = true;
        columnsStatus.textContent = ready ? 'Loading columns…' : 'Starting the browser database and loading columns…';
        columnsOutput.replaceChildren();
        const sql = "SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema IN ('src_schema','stage_schema','dwh_schema') ORDER BY table_schema, table_name, ordinal_position";
        queueQuery({ sql }, reset, reload).then(results => {
          renderResults(columnsOutput, results, `schema for question ${question.id}`);
          columnsStatus.textContent = 'Showing columns in the current browser database.';
        }).catch(error => { columnsStatus.textContent = `Could not load columns: ${error.message}`; })
          .finally(() => { loadColumns.disabled = false; });
      });
      actions.append(localReference);
      editor.append(label, input, actions, status, output);
      let notes = null;
      if (!reportOnly) {
        const notesDetails = el('details', 'lab03-browser__notes');
        notesDetails.append(el('summary', '', `Report notes for question ${question.id}`));
        const notesLabel = el('label', '', `Your report notes for question ${question.id}`);
        notes = el('textarea'); notes.id = `lab03-notes-${question.id}`; notes.rows = 3; notes.spellcheck = false; notes.maxLength = maxSql; notesLabel.htmlFor = notes.id;
        try { notes.value = localStorage.getItem(draftPrefix + question.id + '-notes') || ''; } catch (_) { storageAvailable = false; }
        notes.addEventListener('input', () => { try { localStorage.setItem(draftPrefix + question.id + '-notes', notes.value); } catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your work before leaving.'; } });
        notesDetails.append(notesLabel, notes); editor.append(notesDetails);
      }
      item.append(editor); root.append(item);
      entries.push({ id: question.id, input, reportOnly, notes });
    });
    if (!storageAvailable) state.textContent = 'Browser storage is unavailable. Download your answers before leaving.';
    const fallback = document.querySelector('[data-lab03-static-hints]');
    if (fallback) fallback.hidden = true;
    download.addEventListener('click', () => {
      const commentLines = value => value.split('\n').map(line => `-- ${line}`).join('\n');
      const text = entries.map(({ id, input, reportOnly, notes }) => {
        const sql = reportOnly ? '' : `${input.value}\n;\n`;
        const report = reportOnly ? input.value : notes.value;
        return `-- Question ${id}\n${sql}-- Report notes\n${commentLines(report)}\n`;
      }).join('\n');
      const url = URL.createObjectURL(new Blob([text], { type: 'text/sql;charset=utf-8' }));
      const anchor = el('a'); anchor.href = url; anchor.download = 'lab03-browser-answers.sql'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
