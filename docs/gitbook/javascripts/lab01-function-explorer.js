/* Browser-only demonstrations of the lab's synthetic order data. */
(function () {
  'use strict';
  function init() {
    const families = window.Lab01FunctionFamilies || {};
    document.querySelectorAll('[data-window-family]').forEach(function (root) {
      if (root.dataset.ready === 'true') return;
      const family = families[root.dataset.windowFamily];
      if (!family || !family.functions.length) return;
      root.dataset.ready = 'true';
      root.classList.add('wf-explorer');
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', `${family.title} explorer`);
      root.innerHTML = `
        <div class="wf-explorer__header"><span class="wf-explorer__eyebrow">FUNCTION EXPLORER</span>
          <label class="wf-explorer__label">Choose a function<select></select></label></div>
        <p class="wf-explorer__explanation"></p>
        <pre class="wf-explorer__syntax"><code></code></pre>
        <div class="wf-explorer__stage">
          <div class="wf-explorer__stage-head"><strong>Follow the rows</strong><span class="wf-explorer__progress"></span></div>
          <p class="wf-explorer__hint">Each card is one completed order for customer 1; the number is its revenue. Choose a row or step through the example.</p>
          <div class="wf-explorer__rows" role="group" aria-label="Orders in this demonstration"></div>
          <p class="wf-explorer__connector" hidden></p>
          <div class="wf-explorer__controls" role="group" aria-label="Animation controls">
            <button type="button" data-action="previous">← Previous</button>
            <button type="button" data-action="next">Next →</button>
            <button type="button" data-action="play" aria-pressed="false">Play</button>
            <button type="button" data-action="reset">Reset</button>
          </div>
        </div>
        <div class="wf-explorer__result" role="status" aria-live="polite" aria-atomic="true"><strong></strong><p></p></div>
        <p class="wf-explorer__note">Browser simulation using the lab's synthetic orders; it does not execute SQL.</p>`;
      const selector = root.querySelector('select');
      selector.setAttribute('aria-label', `Choose a function in ${family.title}`);
      family.functions.forEach(function (fn) { const option = document.createElement('option'); option.value = fn.id; option.textContent = fn.name; selector.append(option); });
      const explanation = root.querySelector('.wf-explorer__explanation');
      const syntax = root.querySelector('code');
      const rows = root.querySelector('.wf-explorer__rows');
      const connector = root.querySelector('.wf-explorer__connector');
      const progress = root.querySelector('.wf-explorer__progress');
      const result = root.querySelector('.wf-explorer__result strong');
      const detail = root.querySelector('.wf-explorer__result p');
      const previous = root.querySelector('[data-action="previous"]');
      const next = root.querySelector('[data-action="next"]');
      const play = root.querySelector('[data-action="play"]');
      const reset = root.querySelector('[data-action="reset"]');
      let index = 0, timer = null;
      const selected = () => family.functions.find(fn => fn.id === selector.value);
      function stop() { if (timer !== null) clearInterval(timer); timer = null; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); }
      function render() {
        const fn = selected(), step = fn.steps[index];
        explanation.textContent = fn.explanation;
        syntax.textContent = fn.syntax;
        progress.textContent = `Row ${index + 1} of ${fn.steps.length}`;
        while (rows.children.length < step.rows.length) {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'wf-explorer__row';
          button.innerHTML = '<span class="wf-explorer__id"></span><strong class="wf-explorer__value"></strong><span class="wf-explorer__role"></span>';
          const rowIndex = rows.children.length;
          button.addEventListener('click', function () { stop(); index = rowIndex; render(); });
          rows.append(button);
        }
        while (rows.children.length > step.rows.length) rows.lastElementChild.remove();
        step.rows.forEach(function (row, i) {
          const button = rows.children[i], role = String(row.role || '');
          button.querySelector('.wf-explorer__id').textContent = `Order ${row.id}`;
          button.querySelector('.wf-explorer__value').textContent = String(row.value);
          const displayRole = family.id === 'aggregate' && i === index ? 'Current · in frame' : role;
          const position = ['ranking', 'distribution'].includes(family.id) ? `Position ${i + 1} · ` : '';
          button.querySelector('.wf-explorer__role').textContent = position + (row.annotation ? `${displayRole} · ${row.annotation}` : displayRole);
          button.setAttribute('aria-pressed', String(i === index));
          button.classList.toggle('is-current', i === index);
          button.classList.toggle('is-related', /contribut|source|previous|next|peer|in frame/i.test(displayRole));
          button.classList.toggle('is-source', /source|previous|next/i.test(displayRole));
          button.classList.toggle('is-bucket-one', row.annotation === 'Bucket 1');
          button.classList.toggle('is-bucket-two', row.annotation === 'Bucket 2');
        });
        const source = step.rows.find(row => /previous|next|source/i.test(String(row.role)));
        connector.hidden = !source || !['offsets', 'values'].includes(family.id);
        if (!connector.hidden) {
          const current = step.rows[index];
          if (family.id === 'values') connector.textContent = `Full frame → source: order ${source.id} · ${source.value}`;
          else if (/previous/i.test(source.role)) connector.textContent = `Order ${current.id} ← previous: order ${source.id} · ${source.value}`;
          else connector.textContent = `Order ${current.id} → next: order ${source.id} · ${source.value}`;
        }
        result.textContent = `${fn.name}: ${step.result}`;
        detail.textContent = step.detail;
        previous.disabled = index === 0;
        next.disabled = index === fn.steps.length - 1;
      }
      selector.addEventListener('change', function () { stop(); index = 0; render(); });
      previous.addEventListener('click', function () { stop(); if (index > 0) index--; render(); });
      next.addEventListener('click', function () { stop(); if (index < selected().steps.length - 1) index++; render(); });
      reset.addEventListener('click', function () { stop(); index = 0; render(); });
      play.addEventListener('click', function () {
        if (timer !== null) { stop(); return; }
        if (index === selected().steps.length - 1) index = 0;
        render(); play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
        timer = setInterval(function () { index++; render(); if (index >= selected().steps.length - 1) stop(); }, 2000);
      });
      render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true}); else init();
}());
