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
  function sqlTokens(sql) {
    const pattern = /--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:''|[^'])*(?:'|$)|"(?:""|[^"])*(?:"|$)|\b(?:select|from|where|and|or|not|in|is|null|as|join|left|right|inner|outer|full|on|using|group|by|order|having|limit|offset|with|recursive|union|all|distinct|case|when|then|else|end|exists|between|like|ilike|asc|desc|nulls|first|last|over|partition|rows|range|unbounded|preceding|following|current|row|filter|within|true|false|date|interval|cast)\b|\b\d+(?:\.\d+)?\b/gi;
    const tokens = [];
    let pos = 0;
    for (const match of sql.matchAll(pattern)) {
      if (match.index > pos) tokens.push({ text: sql.slice(pos, match.index), kind: '' });
      const text = match[0];
      const kind = text.startsWith('--') || text.startsWith('/*') ? 'comment' : text[0] === "'" || text[0] === '"' ? 'string' : /^\d/.test(text) ? 'number' : 'keyword';
      tokens.push({ text, kind });
      pos = match.index + text.length;
    }
    if (pos < sql.length) tokens.push({ text: sql.slice(pos), kind: '' });
    return tokens;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { formatDownload, sampleQuery, sqlTokens };
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const workerUrl = new URL('lab01-practice-worker.js', script.src);
  workerUrl.search = new URL(script.src).search;
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

  function exampleCell(value, field) {
    if (field === 'order_date' && value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if ((field === 'revenue' || field === 'running_total') && typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) {
      // Keep PostgreSQL's exact digits, removing only insignificant zeroes.
      return value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
    }
    return cell(value);
  }

  function render(target, results, formatCell = cell) {
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
          row.forEach((value, column) => { tr.insertCell().textContent = formatCell(value, result.fields[column]); });
        });
        group.appendChild(table);
        const count = document.createElement('p');
        count.textContent = result.truncated ? 'Showing the first 100 rows.' : `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} returned.`;
        group.appendChild(count);
      }
      target.appendChild(group);
    });
  }

  function mountExamples() {
    // Worked examples share the read-only engine, but never read or save the
    // numbered exercise drafts. Each example has its own controls and output.
    document.querySelectorAll('[data-journey-example]').forEach((example) => {
      if (example.dataset.exampleMounted) return;
      const input = example.querySelector('[data-example-sql]');
      const button = example.querySelector('[data-run-example]');
      const status = example.querySelector('[data-example-status]');
      const output = example.querySelector('[data-example-result]');
      if (!input || !button || !status || !output) return;
      example.dataset.exampleMounted = 'true';
      button.disabled = false;
      button.addEventListener('click', () => {
        const sql = input.value.trim();
        if (!sql) { status.textContent = 'Write or select a SQL statement first.'; return; }
        if (sql.length > maxSql) { status.textContent = 'Please use at most 50,000 characters per run.'; return; }
        button.disabled = true;
        status.textContent = ready ? 'Running the worked example…' : 'Starting the browser database and running the worked example…';
        output.replaceChildren();
        output.setAttribute('aria-busy', 'true');
        const run = queue.catch(() => {}).then(() => execute(sql));
        queue = run;
        run.then((results) => {
          render(output, results, exampleCell);
          if (output.querySelector('table')) {
            output.tabIndex = 0;
            output.setAttribute('role', 'region');
            output.setAttribute('aria-label', 'Worked example query results');
          }
          status.textContent = 'Query complete. These results were calculated by the browser PostgreSQL database.';
        }).catch((error) => { status.textContent = `Could not run: ${error.message}`; })
          .finally(() => { button.disabled = false; output.setAttribute('aria-busy', 'false'); });
      });
    });
  }

  function mount() {
    mountExamples();
    const root = document.querySelector('[data-lab01-practice]');
    if (!root || root.dataset.practiceMounted) return;
    root.dataset.practiceMounted = 'true';
    const sections = [...root.querySelectorAll('[data-question]')];
    const referenceTemplate = root.querySelector('.lab01-reference');
    if (referenceTemplate) {
      sections.forEach((section) => {
        const actions = section.querySelector('.lab01-editor-actions');
        if (!actions) return;
        const disclosure = document.createElement('details');
        disclosure.className = 'lab01-local-schema';
        disclosure.setAttribute('data-local-schema', '');
        const summary = document.createElement('summary');
        summary.textContent = 'Tables & schema';
        summary.setAttribute('aria-label', `Tables and schema for question ${section.dataset.question}`);
        const reference = referenceTemplate.cloneNode(true);
        reference.removeAttribute('aria-labelledby');
        reference.setAttribute('aria-label', `Tables and schema for question ${section.dataset.question}`);
        reference.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        const instruction = document.createElement('p');
        instruction.textContent = 'Select a column name to insert it into your SQL.';
        reference.querySelector('.lab01-reference-legend').after(instruction);
        const feedback = document.createElement('p');
        feedback.className = 'lab01-column-feedback';
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
        reference.appendChild(feedback);
        reference.querySelectorAll('[data-reference-table]').forEach((table) => {
          const name = table.dataset.referenceTable;
          table.querySelector('summary').setAttribute('aria-label', `${name} table`);
          table.querySelector('[data-sample]').setAttribute('aria-label', `Sample rows from ${name}`);
          table.querySelector('[data-view-all]').setAttribute('aria-label', `View all rows from ${name}`);
          table.querySelectorAll('li > code').forEach((column) => {
            const insert = document.createElement('button');
            insert.type = 'button';
            insert.className = 'lab01-insert-column';
            insert.textContent = column.textContent;
            insert.setAttribute('aria-label', `Insert ${column.textContent} from ${name}`);
            insert.addEventListener('click', () => {
              const input = section.querySelector('[data-sql]');
              input.setRangeText(column.textContent, input.selectionStart, input.selectionEnd, 'end');
              input.dispatchEvent(new Event('input', { bubbles: true }));
              feedback.textContent = `Inserted ${column.textContent}.`;
              input.focus();
            });
            column.replaceWith(insert);
          });
        });
        disclosure.append(summary, reference);
        actions.appendChild(disclosure);
      });
      // Preserve existing links to the old reference at the first disclosure.
      const oldTitle = referenceTemplate.querySelector('#lab01-reference-title');
      const firstSummary = root.querySelector('[data-local-schema] > summary');
      if (oldTitle && firstSummary) {
        oldTitle.removeAttribute('id');
        firstSummary.id = 'lab01-reference-title';
      }
      // Keep the static copy as a no-JavaScript fallback. The per-question
      // references are created before hiding it, so the schema remains usable.
      referenceTemplate.hidden = true;
    }
    let storageAvailable = true;
    sections.forEach((section) => {
      const number = section.dataset.question;
      // Keep existing browser drafts attached to their original question.
      const storageNumber = section.dataset.storageQuestion || number;
      const input = section.querySelector('[data-sql]');
      const button = section.querySelector('[data-run]');
      const output = section.querySelector('[data-result]');
      const status = section.querySelector('[data-status]');
      if (!input || !button || !output || !status) return;
      section.querySelectorAll('.lab01-answer .highlight').forEach((block) => {
        const code = block.querySelector('pre code');
        if (!code) return;
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'lab01-copy-answer';
        copy.textContent = 'Copy SQL';
        copy.setAttribute('aria-label', `Copy answer SQL for question ${number}`);
        const feedback = document.createElement('span');
        feedback.className = 'lab01-copy-feedback';
        feedback.setAttribute('role', 'status');
        block.classList.add('lab01-has-answer-copy');
        block.before(copy, feedback);
        copy.addEventListener('click', async () => {
          const text = code.textContent;
          try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(text);
            feedback.textContent = 'Copied';
          } catch (_) {
            // If clipboard access is denied, select the SQL for manual copying.
            const range = document.createRange();
            range.selectNodeContents(code);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            feedback.textContent = 'SQL selected — press Ctrl+C or ⌘C to copy.';
          }
        });
      });
      try { input.value = localStorage.getItem(storagePrefix + storageNumber) || ''; }
      catch (_) { storageAvailable = false; status.textContent = 'Browser storage is unavailable. Download your work before leaving.'; }
      const editorWrap = document.createElement('div');
      editorWrap.className = 'lab01-sql-input';
      const highlight = document.createElement('pre');
      highlight.className = 'lab01-sql-highlight';
      highlight.setAttribute('aria-hidden', 'true');
      input.before(editorWrap);
      editorWrap.append(highlight, input);
      function updateHighlight() {
        const fragment = document.createDocumentFragment();
        sqlTokens(input.value).forEach(({ text, kind }) => {
          if (!kind) { fragment.append(document.createTextNode(text)); return; }
          const span = document.createElement('span');
          span.className = `sql-${kind}`;
          span.textContent = text;
          fragment.append(span);
        });
        fragment.append(document.createTextNode('\n'));
        highlight.replaceChildren(fragment);
        highlight.scrollTop = input.scrollTop;
        highlight.scrollLeft = input.scrollLeft;
      }
      input.addEventListener('scroll', () => { highlight.scrollTop = input.scrollTop; highlight.scrollLeft = input.scrollLeft; });
      input.addEventListener('input', updateHighlight);
      updateHighlight();
      input.addEventListener('input', () => {
        try { localStorage.setItem(storagePrefix + storageNumber, input.value); }
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
        output.removeAttribute('tabindex');
        output.removeAttribute('role');
        output.removeAttribute('aria-label');
        const run = queue.catch(() => {}).then(() => execute(sql));
        queue = run;
        run.then((results) => {
          render(output, results);
          if (output.querySelector('table')) {
            output.tabIndex = 0;
            output.setAttribute('role', 'region');
            output.setAttribute('aria-label', `Query results for question ${number}`);
          }
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
    const download = document.querySelector('[data-practice-export]');
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
