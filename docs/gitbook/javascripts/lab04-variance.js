/* A browser-only illustration of population variance with mergeable raw moments. */
(function () {
  'use strict';
  const presets = {
    separated: [[1, 2], [3, 4]],
    constant: [[1, 1], [3, 3]],
    empty: [[], []]
  };
  function partial(values) {
    if (!Array.isArray(values) || values.some(x => !Number.isFinite(x))) throw new Error('Expected finite numbers');
    return { count: values.length, sum: values.reduce((a, x) => a + x, 0), squares: values.reduce((a, x) => a + x * x, 0) };
  }
  function merge(a, b) { return { count: a.count + b.count, sum: a.sum + b.sum, squares: a.squares + b.squares }; }
  function variance(state) { return state.count === 0 ? null : state.squares / state.count - (state.sum / state.count) ** 2; }
  function compute(groups) {
    if (!Array.isArray(groups) || groups.length !== 2) throw new Error('Expected two worker groups');
    const partials = groups.map(partial), combined = merge(partials[0], partials[1]);
    return { partials, combined, localVariances: partials.map(variance), globalVariance: variance(combined) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { partial, merge, variance, compute, presets };
  if (typeof document === 'undefined') return;
  function init() {
    const root = document.getElementById('lab04-variance-explorer');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true'; root.classList.add('lab04-variance');
    root.innerHTML = `
      <p class="lab04-variance__eyebrow">INTERACTIVE · POPULATION VARIANCE</p>
      <h4>Does local spread describe the global spread?</h4>
      <p>Predict the global population variance, then reveal each worker's mergeable state. Changing the input hides the answer.</p>
      <label for="lab04-variance-scenario">Worker inputs</label>
      <select id="lab04-variance-scenario"><option value="separated">A: [1, 2] · B: [3, 4]</option><option value="constant">A: [1, 1] · B: [3, 3]</option><option value="empty">A: [] · B: [] (empty input)</option></select>
      <div class="lab04-variance__dots" aria-label="Values for each worker"></div>
      <button type="button" id="lab04-variance-reveal" aria-expanded="false" aria-controls="lab04-variance-result">Reveal calculation</button>
      <div id="lab04-variance-result" hidden>
        <p>State order: <code>(count, sum, sum of squares)</code>. Scroll the table horizontally if needed.</p>
        <div class="lab04-variance__table" role="region" aria-label="Worker and merged variance states" tabindex="0"><table><caption>Worker and merged states</caption><thead><tr><th scope="col">Group</th><th scope="col">State</th><th scope="col">Population variance</th></tr></thead><tbody></tbody></table></div>
        <div class="lab04-variance__result" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
      <p class="lab04-variance__note">Illustrative browser simulation; no distributed job runs. This raw-moment formula can suffer floating-point cancellation when large values are close together; it is not universally numerically stable.</p>`;
    const select = root.querySelector('#lab04-variance-scenario'), reveal = root.querySelector('#lab04-variance-reveal');
    const result = root.querySelector('#lab04-variance-result'), dots = root.querySelector('.lab04-variance__dots');
    const tbody = root.querySelector('tbody'), summary = root.querySelector('.lab04-variance__result');
    let shown = false;
    const number = x => x === null ? 'undefined (None)' : String(x);
    function render() {
      const groups = presets[select.value], data = compute(groups);
      dots.replaceChildren(); tbody.replaceChildren();
      groups.forEach((values, i) => {
        const line = document.createElement('p');
        const title = document.createElement('strong'); title.textContent = `Worker ${i ? 'B' : 'A'}: `; line.append(title);
        if (!values.length) line.append(document.createTextNode('no observations'));
        values.forEach(x => { const dot = document.createElement('span'); dot.className = 'lab04-variance__dot'; dot.textContent = String(x); line.append(dot); });
        dots.append(line);
      });
      const rows = [['Worker A', data.partials[0], data.localVariances[0]], ['Worker B', data.partials[1], data.localVariances[1]], ['Merged', data.combined, data.globalVariance]];
      rows.forEach(([name, state, value]) => {
        const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = name; tr.append(th);
        for (const text of [`(${state.count}, ${state.sum}, ${state.squares})`, number(value)]) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
        tbody.append(tr);
      });
      const c = data.combined;
      summary.textContent = c.count === 0
        ? 'The merged count is zero. Population variance is undefined; the lab returns None rather than dividing by zero.'
        : `Merged population variance: ${c.squares}/${c.count} − (${c.sum}/${c.count})² = ${number(data.globalVariance)}. The local variances do not by themselves capture the spread between worker means.`;
      result.hidden = !shown; reveal.setAttribute('aria-expanded', String(shown)); reveal.textContent = shown ? 'Hide calculation' : 'Reveal calculation';
    }
    select.addEventListener('change', () => { shown = false; render(); });
    reveal.addEventListener('click', () => { shown = !shown; render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
