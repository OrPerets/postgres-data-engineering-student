/* Browser-only, deterministic examples: these are not distributed jobs. */
(function () {
  'use strict';
  const presets = Object.freeze({
    unequal: [[1], [3, 5, 7]],
    equal: [[1, 3], [5, 7]],
    coincidence: [[1], [1, 1, 1]]
  });

  function compareMeans(groups) {
    if (!Array.isArray(groups) || groups.length !== 2 || groups.some(g => !Array.isArray(g) || g.length === 0 || g.some(v => !Number.isFinite(v)))) {
      throw new Error('Expected two nonempty groups of finite numbers');
    }
    const partials = groups.map(values => {
      const sum = values.reduce((a, b) => a + b, 0);
      return { sum, count: values.length, mean: sum / values.length };
    });
    const sum = partials[0].sum + partials[1].sum;
    const count = partials[0].count + partials[1].count;
    return { partials, sum, count, naive: (partials[0].mean + partials[1].mean) / 2, weighted: sum / count };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { compareMeans, presets };
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab04-mean-explorer');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    root.classList.add('lab04-mean');
    root.innerHTML = `
      <p class="lab04-mean__eyebrow">INTERACTIVE · MAPREDUCE</p>
      <h3>Can we average the averages?</h3>
      <p>Choose a split and predict both results before revealing them. Each worker has at least one value in these examples.</p>
      <label for="lab04-mean-scenario">Worker inputs</label>
      <select id="lab04-mean-scenario"><option value="unequal">Unequal sizes: [1] and [3, 5, 7]</option><option value="equal">Equal sizes: [1, 3] and [5, 7]</option><option value="coincidence">Unequal sizes, same local mean: [1] and [1, 1, 1]</option></select>
      <p class="lab04-mean__prediction">Predict: will the unweighted mean of worker means equal the mean of all observations? Explain why.</p>
      <button type="button" id="lab04-mean-reveal" aria-expanded="false" aria-controls="lab04-mean-result">Reveal comparison</button>
      <div id="lab04-mean-result" hidden>
        <div class="lab04-mean__weights" aria-label="Comparison of worker weights">
          <p><strong>Weight of each worker</strong></p>
          <p>Unweighted worker means</p>
          <div class="lab04-mean__bar"><span class="lab04-mean__a" style="width:50%">A: 50%</span><span class="lab04-mean__b" style="width:50%">B: 50%</span></div>
          <p>True mean of observations</p>
          <div class="lab04-mean__bar"><span class="lab04-mean__a" id="lab04-mean-weight-a"></span><span class="lab04-mean__b" id="lab04-mean-weight-b"></span></div>
        </div>
        <div class="lab04-mean__table-wrap" role="region" aria-label="Worker contributions" tabindex="0">
          <table><caption>Local values and partial states</caption><thead><tr><th scope="col">Worker</th><th scope="col">Values</th><th scope="col">Sum</th><th scope="col">Count</th><th scope="col">Local mean</th><th scope="col">Weight in true mean</th></tr></thead><tbody></tbody></table>
        </div>
        <div class="lab04-mean__result" role="status" aria-live="polite"><p class="lab04-mean__naive"></p><p class="lab04-mean__weighted"></p><p class="lab04-mean__explain"></p></div>
      </div>
      <p class="lab04-mean__note">Browser simulation of small illustrative data; no distributed job is run. Empty groups are not included in these examples.</p>`;
    const select = root.querySelector('#lab04-mean-scenario');
    const button = root.querySelector('#lab04-mean-reveal');
    const result = root.querySelector('#lab04-mean-result');
    const body = root.querySelector('tbody');
    const naive = root.querySelector('.lab04-mean__naive');
    const weighted = root.querySelector('.lab04-mean__weighted');
    const explain = root.querySelector('.lab04-mean__explain');
    const weightA = root.querySelector('#lab04-mean-weight-a');
    const weightB = root.querySelector('#lab04-mean-weight-b');
    const format = n => Number.isInteger(n) ? String(n) : `${n.toFixed(2)} (rounded)`;
    let revealed = false;
    function render() {
      const groups = presets[select.value];
      const stats = compareMeans(groups);
      const pctA = 100 * stats.partials[0].count / stats.count;
      const pctB = 100 * stats.partials[1].count / stats.count;
      weightA.style.width = `${pctA}%`; weightA.textContent = `A: ${format(pctA)}%`;
      weightB.style.width = `${pctB}%`; weightB.textContent = `B: ${format(pctB)}%`;
      body.replaceChildren();
      stats.partials.forEach((p, i) => {
        const tr = document.createElement('tr');
        const heading = document.createElement('th'); heading.scope = 'row'; heading.textContent = i === 0 ? 'A' : 'B'; tr.append(heading);
        for (const v of [`[${groups[i].join(', ')}]`, p.sum, p.count, format(p.mean), `${p.count}/${stats.count}`]) {
          const td = document.createElement('td'); td.textContent = String(v); tr.append(td);
        }
        body.append(tr);
      });
      naive.textContent = `Unweighted worker means: (${format(stats.partials[0].mean)} + ${format(stats.partials[1].mean)}) / 2 = ${format(stats.naive)}`;
      weighted.textContent = `Merged (sum, count): (${stats.partials[0].sum} + ${stats.partials[1].sum}) / (${stats.partials[0].count} + ${stats.partials[1].count}) = ${stats.sum} / ${stats.count} = ${format(stats.weighted)}`;
      explain.textContent = select.value === 'unequal'
        ? 'The worker means get equal weight in the first calculation, although worker B has three times as many observations.'
        : select.value === 'equal'
          ? 'The results agree here because the workers have equal counts, so equal worker weights match equal observation weights.'
          : 'The results also agree here despite unequal counts because both local means are equal. Agreement in one example does not make averaging means safe in general.';
      result.hidden = !revealed;
      button.textContent = revealed ? 'Hide comparison' : 'Reveal comparison';
      button.setAttribute('aria-expanded', String(revealed));
    }
    select.addEventListener('change', () => { revealed = false; render(); });
    button.addEventListener('click', () => { revealed = !revealed; render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
