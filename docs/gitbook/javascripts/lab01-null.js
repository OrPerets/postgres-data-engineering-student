/* Three-valued logic for a fixed nonempty teaching set; no database calls. */
(function () {
  'use strict';
  const TRUE = 'TRUE', FALSE = 'FALSE', UNKNOWN = 'UNKNOWN';
  function compareNotEqual(left, right) {
    return left === null || right === null ? UNKNOWN : left === right ? FALSE : TRUE;
  }
  function evaluate(city, includeNull) {
    if (![null, 'Haifa', 'Eilat'].includes(city) || typeof includeNull !== 'boolean') throw new Error('Invalid example');
    const returnedCities = includeNull ? ['Haifa', 'Tel Aviv', null] : ['Haifa', 'Tel Aviv'];
    const comparisons = returnedCities.map(value => ({ value, result: compareNotEqual(city, value) }));
    const notIn = comparisons.some(c => c.result === FALSE) ? FALSE : comparisons.some(c => c.result === UNKNOWN) ? UNKNOWN : TRUE;
    const existsMatch = city !== null && returnedCities.some(value => value !== null && value === city);
    const notExists = existsMatch ? FALSE : TRUE;
    const guarded = city !== null && !existsMatch ? TRUE : FALSE;
    return { city, returnedCities, comparisons, notIn, notExists, guarded };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { evaluate };
  if (typeof document === 'undefined') return;
  function init() {
    const root = document.getElementById('lab01-null-explorer');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true'; root.classList.add('lab01-null');
    root.innerHTML = `
      <p class="lab01-null__eyebrow">INTERACTIVE · SQL THREE-VALUED LOGIC</p>
      <h3>Why does NOT IN exclude a city?</h3>
      <p>The fixed returned-city set contains Haifa, Tel Aviv and NULL in the lab's synthetic data. Predict the result before revealing it. Removing NULL is a hypothetical comparison, not a change to the data.</p>
      <div class="lab01-null__controls">
        <label for="lab01-null-city">Outer customer's city<select id="lab01-null-city"><option value="Eilat">Eilat</option><option value="Haifa">Haifa</option><option value="null">NULL (unknown)</option></select></label>
        <label for="lab01-null-set">Returned-city set<select id="lab01-null-set"><option value="present">Haifa, Tel Aviv, NULL</option><option value="absent">Haifa, Tel Aviv (NULL removed)</option></select></label>
      </div>
      <p>Predict: is <code>city NOT IN (returned cities)</code> TRUE, FALSE, or UNKNOWN? Will <code>WHERE</code> keep the row?</p>
      <button type="button" id="lab01-null-reveal" aria-expanded="false" aria-controls="lab01-null-result">Reveal comparison</button>
      <div id="lab01-null-result" hidden>
        <p class="lab01-null__equation">For this nonempty set, <code>NOT IN</code> combines the following <code>&lt;&gt;</code> comparisons with AND:</p>
        <div class="lab01-null__table-wrap" role="region" aria-label="Individual comparisons" tabindex="0"><table><caption>Comparison with each returned city</caption><thead><tr><th scope="col">Comparison</th><th scope="col">Result</th></tr></thead><tbody></tbody></table></div>
        <p class="lab01-null__summary" role="status" aria-live="polite" aria-atomic="true"></p>
        <p>Filter descriptions below are pseudocode. Use a correlated subquery for <code>NOT EXISTS</code> in SQL. Scroll horizontally to see all table columns if needed.</p>
        <div class="lab01-null__table-wrap" role="region" aria-label="Filter comparison" tabindex="0"><table class="lab01-null__alternatives"><caption>Compare filters for this one outer city</caption><thead><tr><th scope="col">Filter</th><th scope="col">Predicate result</th><th scope="col">WHERE keeps row?</th></tr></thead><tbody></tbody></table></div>
        <p class="lab01-null__explain"></p>
      </div>
      <p class="lab01-null__note">Browser simulation, not a PostgreSQL query. The set is nonempty in both options. WHERE retains only TRUE; FALSE and UNKNOWN are excluded.</p>`;
    const city = root.querySelector('#lab01-null-city'), set = root.querySelector('#lab01-null-set');
    const reveal = root.querySelector('#lab01-null-reveal'), result = root.querySelector('#lab01-null-result');
    const comparisonBody = root.querySelector('.lab01-null__table-wrap tbody'), alternatives = root.querySelector('.lab01-null__alternatives tbody');
    const summary = root.querySelector('.lab01-null__summary'), explain = root.querySelector('.lab01-null__explain');
    let shown = false;
    const display = value => value === null ? 'NULL' : "'" + value + "'";
    function cell(tr, text, rowHead) { const td = document.createElement(rowHead ? 'th' : 'td'); if (rowHead) td.scope = 'row'; td.textContent = text; tr.appendChild(td); }
    function render() {
      const value = city.value === 'null' ? null : city.value, calc = evaluate(value, set.value === 'present');
      comparisonBody.replaceChildren();
      for (const c of calc.comparisons) { const tr = document.createElement('tr'); cell(tr, `${display(value)} <> ${display(c.value)}`, true); cell(tr, c.result, false); comparisonBody.appendChild(tr); }
      summary.textContent = `NOT IN result: ${calc.notIn}. WHERE ${calc.notIn === TRUE ? 'keeps' : 'excludes'} this row.`;
      alternatives.replaceChildren();
      for (const [name, truth] of [['city NOT IN (returned cities)', calc.notIn], ['NOT EXISTS (returned city = city)', calc.notExists], ['city IS NOT NULL AND NOT EXISTS (...)', calc.guarded]]) {
        const tr = document.createElement('tr'); cell(tr, name, true); cell(tr, truth, false); cell(tr, truth === TRUE ? 'Yes' : 'No', false); alternatives.appendChild(tr);
      }
      explain.textContent = value === null ? 'Equality to NULL is never TRUE, so the correlated subquery finds no equal city: unguarded NOT EXISTS is TRUE. The known-city guard excludes the unknown outer city.' : 'NOT EXISTS asks whether any returned city equals this known city. A returned NULL does not equal it; whether the guard is needed depends on the requirement for unknown outer cities.';
      result.hidden = !shown; reveal.textContent = shown ? 'Hide comparison' : 'Reveal comparison'; reveal.setAttribute('aria-expanded', String(shown));
    }
    for (const control of [city, set]) control.addEventListener('change', () => { shown = false; render(); });
    reveal.addEventListener('click', () => { shown = !shown; render(); }); render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
