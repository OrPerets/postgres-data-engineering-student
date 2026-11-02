(function () {
  'use strict';
  const source = document.currentScript;
  if (!source || !source.src) return;

function mountViewFlow() {
  const root = document.getElementById('sql-view-flow');
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = 'true';
  const toggle = root.querySelector('[data-view-complete]');
  const run = root.querySelector('[data-view-query]');
  const feedback = root.querySelector('[data-view-feedback]');
  const svg = root.querySelector('.view-scene');
  const ns = 'http://www.w3.org/2000/svg';
  let completed = false, queriedCompleted = false, busy = false, revision = 0;
  let width = 0;
  const frame = document.createElementNS(ns, 'g');
  svg.append(frame);

  function add(tag, attrs, text, parent = frame) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }
  function label(x, y, text, cls = '', anchor = 'start') {
    return add('text', { x, y, class: cls, 'text-anchor': anchor }, text);
  }
  function row(y, id, done, left, rowWidth) {
    add('rect', { x: left, y, width: rowWidth, height: 28, rx: 4, class: done ? 'view-row' : 'view-pending' });
    label(left + 12, y + 18, String(id), 'view-label');
    label(left + rowWidth - 12, y + 18, done ? '✓ completed' : '○ pending', '', 'end');
  }
  function draw() {
    width = Math.max(280, root.getBoundingClientRect().width);
    svg.setAttribute('viewBox', `0 0 ${width} 532`);
    frame.replaceChildren();
    const center = width / 2, boxWidth = Math.min(width - 36, 392), left = center - boxWidth / 2;
    const rowLeft = left + 16, rowWidth = boxWidth - 32;
    label(center, 20, 'orders · physical table', 'view-label', 'middle');
    add('path', { d: `M ${left} 48 A ${boxWidth / 2} 12 0 0 1 ${left + boxWidth} 48 V 192 A ${boxWidth / 2} 12 0 0 1 ${left} 192 Z`, class: 'view-shape' });
    add('ellipse', { cx: center, cy: 48, rx: boxWidth / 2, ry: 12, class: 'view-shape' });
    label(rowLeft + 12, 79, 'order_id', 'view-secondary');
    label(rowLeft + rowWidth - 12, 79, 'status', 'view-secondary', 'end');
    row(90, 101, true, rowLeft, rowWidth);
    row(123, 102, completed, rowLeft, rowWidth);
    row(156, 103, true, rowLeft, rowWidth);
    add('path', { d: `M ${center} 205 V 237 m -4 -5 l 4 5 4 -5`, class: 'view-path' });
    label(center, 258, 'completed_orders · view', 'view-label', 'middle');
    const gateLeft = center - Math.min(boxWidth, 330) / 2, gateRight = width - gateLeft;
    add('path', { d: `M ${gateLeft} 272 H ${gateRight} L ${center + 64} 332 H ${center - 64} Z`, fill: 'color-mix(in srgb, var(--view-accent) 8%, var(--view-paper))', stroke: 'var(--view-line)', 'stroke-width': 1.5 });
    label(center, 295, "status = 'completed'", 'view-label', 'middle');
    label(center, 318, 'no stored rows', 'view-secondary', 'middle');
    add('path', { d: `M ${center} 333 V 382 m -4 -5 l 4 5 4 -5`, class: 'view-path' });
    if (!completed) {
      const excludedX = left + boxWidth - 16;
      add('path', { d: `M ${center + 64} 324 H ${excludedX} V 344 m -4 0 l 8 8 m 0 -8 l -8 8`, class: 'view-path' });
      label(excludedX, 369, '102 excluded', 'view-secondary', 'end');
    }
    const returned = queriedCompleted ? [101, 102, 103] : [101, 103];
    label(center, 406, busy ? 'Reading the table…' : `Query result · ${returned.length} rows`, 'view-label', 'middle');
    returned.forEach((id, index) => row(422 + index * 33, id, true, rowLeft, rowWidth));
    if (!busy && completed !== queriedCompleted) {
      label(center, 526, 'Previous result · query again to update', 'view-secondary', 'middle');
    }
    svg.querySelector('desc').textContent = `The physical table holds orders 101 and 103 completed, and order 102 ${completed ? 'completed' : 'pending'}. The view stores the rule status equals completed. The last query returned ${returned.join(', ')}.${completed !== queriedCompleted ? ' The table has changed; query again for a fresh result.' : ''}`;
  }
  function save() {
    if (window.openai?.setWidgetState) {
      window.openai.setWidgetState({ modelContent: { order102: completed ? 'completed' : 'pending', lastResult: queriedCompleted ? [101, 102, 103] : [101, 103] }, privateContent: { completed, queriedCompleted } }).catch(() => {});
    }
  }
  function restore(state) {
    if (!state?.privateContent || busy) return;
    const nextCompleted = state.privateContent.completed === true;
    const nextQueried = state.privateContent.queriedCompleted === true;
    if (completed === nextCompleted && queriedCompleted === nextQueried) return;
    completed = nextCompleted;
    queriedCompleted = nextQueried;
    toggle.checked = completed;
    draw();
    feedback.textContent = completed !== queriedCompleted ? 'The table changed. Query the view for a fresh result.' : 'Change order 102, then query the view again.';
  }
  toggle.addEventListener('change', () => {
    completed = toggle.checked;
    draw();
    feedback.textContent = completed !== queriedCompleted ? 'Only the stored row changed. Query the view to get a fresh result.' : 'The table matches the last result. Query again to watch the filter.';
    save();
  });
  run.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const thisRun = ++revision;
    run.disabled = toggle.disabled = true;
    run.textContent = 'Querying…';
    feedback.textContent = 'Reading current rows and applying the saved rule…';
    draw();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      if (!reduced) {
        const particles = [101, 102, 103].map((id, index) => {
          const particle = add('g', { class: 'view-particle', 'aria-hidden': 'true' });
          add('rect', { x: -22, y: -13, width: 44, height: 26, rx: 5 }, undefined, particle);
          add('text', { x: 0, y: 4, 'text-anchor': 'middle' }, String(id), particle);
          const center = width / 2, startY = 104 + index * 33;
          const passes = id !== 102 || completed;
          const resultIndex = id === 103 && !completed ? 1 : index;
          const animation = particle.animate([
            { transform: `translate(${center}px, ${startY}px)`, opacity: 0, offset: 0 },
            { transform: `translate(${center}px, ${startY}px)`, opacity: 1, offset: .1 },
            { transform: `translate(${center}px, 245px)`, opacity: 1, offset: .35 },
            { transform: `translate(${center}px, ${passes ? 345 : 310}px)`, opacity: 1, offset: .65 },
            { transform: passes ? `translate(${center}px, ${436 + resultIndex * 33}px)` : `translate(${center + Math.min(width - 36, 392) / 2 - 16}px, 344px)`, opacity: passes ? 1 : 0, offset: 1 }
          ], { duration: 1400, delay: index * 320, fill: 'both', easing: 'ease-in-out' });
          return animation.finished.catch(() => {}).finally(() => particle.remove());
        });
        await Promise.all(particles);
      }
    } finally {
      if (thisRun === revision) {
        queriedCompleted = completed;
        busy = false;
        run.disabled = toggle.disabled = false;
        run.textContent = 'Query the view';
        draw();
        feedback.textContent = completed ? '102 now passes the same rule. The new result contains 101, 102 and 103.' : '102 is pending: filtered out of this result, still stored in the table.';
        save();
      }
    }
  });
  let observedWidth = 0;
  const observer = new ResizeObserver(() => {
    const nextWidth = root.getBoundingClientRect().width;
    if (!busy && Math.abs(nextWidth - observedWidth) > 1) { observedWidth = nextWidth; draw(); }
    if (!root.isConnected) observer.disconnect();
  });
  observer.observe(root);
  draw();
  restore(window.openai?.widgetState);
  window.addEventListener('openai:set_globals', event => restore(event.detail?.globals?.widgetState));
}

  function mount() {
    mountViewFlow();
    const root = document.querySelector('[data-useful-sql]');
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = 'true';
    const workerUrl = new URL(root.dataset.usefulSql === 'views' ? 'lab01-views-worker.js' : 'lab01-practice-worker.js', source.src);
    workerUrl.search = new URL(source.src).search;
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
            result.rows.forEach((row) => { const tr = body.insertRow(); row.forEach((value) => { tr.insertCell().textContent = value == null ? 'NULL' : value instanceof Date ? value.toISOString().slice(0, 10) : String(value); }); });
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
