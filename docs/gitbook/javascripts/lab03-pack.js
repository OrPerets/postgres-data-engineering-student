/* Browser-only Lab 03 practice. These examples do not query PostgreSQL. */
(function () {
  'use strict';
  const observations = {
    sf: {
      label: 'Snowflake · sf-sample-v1 / row 1', source: 'SNOWFLAKE',
      rawCost: "'9.785'", rawTokens: "'1634458'", user: '100726',
      typedCost: '9.785', typedTokens: '1634458', quality: 'STATUS_UNAVAILABLE',
      semantics: 'Reported USD cost. The observation’s query grain is unverified.'
    },
    dk: {
      label: 'Dataiku · dk-sample-v1 / row 1', source: 'DATAIKU',
      rawCost: "'0.008205'", rawTokens: "'2307'", user: 'user1@example.org',
      typedCost: '0.008205', typedTokens: '2307', quality: 'ENVIRONMENT_UNAVAILABLE, STATUS_UNAVAILABLE',
      semantics: 'Estimated USD cost. This observation is not a certified agent run.'
    },
    missing: {
      label: 'Dataiku · dk-sample-v1 / row 4', source: 'DATAIKU',
      rawCost: "'' (empty text)", rawTokens: "'' (empty text)", user: 'user2@example.org',
      typedCost: 'NULL', typedTokens: 'NULL', quality: 'MISSING_COST, MISSING_TOTAL_TOKENS, ENVIRONMENT_UNAVAILABLE, STATUS_UNAVAILABLE',
      semantics: 'Estimated USD cost is missing; its value is unknown, not zero.'
    }
  };
  const questions = [
    {
      topic: 'Source and staging',
      prompt: 'What is the role of the staging objects in this workshop?',
      choices: ['They are typed views over the raw tables', 'They are independently copied historical snapshots', 'They make source data complete'], answer: 0,
      explanation: 'The staging objects are views. They standardize fields and calculate quality indicators over raw tables; they do not guarantee completeness.'
    },
    {
      topic: 'Missing cost',
      prompt: 'An observation has a blank cost field. What is the appropriate interpretation after the workshop’s conversion?',
      choices: ['A confirmed zero cost', 'An unknown cost represented by NULL', 'An observation that never existed'], answer: 1,
      explanation: 'Blank cost becomes NULL. It represents an unknown value; the observation itself still exists.'
    },
    {
      topic: 'Combining sources',
      prompt: 'What does UNION ALL do when the two cleaned feeds are combined?',
      choices: ['Appends both feeds while preserving their rows', 'Matches users who have identical names', 'Automatically removes duplicates'], answer: 0,
      explanation: 'UNION ALL appends rows without matching identities or removing duplicates. Source-specific meaning is retained.'
    },
    {
      topic: 'Fact grain',
      prompt: 'In this workshop, what does one fact row represent?',
      choices: ['One reported source observation, identified by batch and row number', 'One verified real-world person across both systems', 'One guaranteed complete day of activity'], answer: 0,
      explanation: 'Each fact row corresponds to a supplied source observation identified by batch_id and row_no. The sample does not establish shared identity or complete coverage.'
    },
    {
      topic: 'Repeatable loads',
      prompt: 'What does the fixed-batch ON CONFLICT DO NOTHING load guarantee for an existing fact key?',
      choices: ['The existing fact is automatically updated with source corrections', 'A conflicting fact is not inserted again', 'Deletes are automatically captured'], answer: 1,
      explanation: 'A conflicting key is skipped, avoiding a duplicate insert for that fixed batch. Corrections and deletes require a different change-handling design.'
    }
  ];
  function el(tag, cls, text) {
    const n = document.createElement(tag); if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text; return n;
  }
  // One selected source row, assuming dimension joins succeed. Costs are
  // strings so this fixed example never introduces floating-point rounding.
  function newLoadState() {
    return { source: { batch: 'dk-sample-v1', row: 1, cost: '0.008205' }, fact: null, runs: 0, inserted: 0, skipped: 0 };
  }
  function loadSelectedRow(state) {
    const match = state.fact && state.fact.batch === state.source.batch && state.fact.row === state.source.row;
    return { ...state, fact: match ? { ...state.fact } : { ...state.source }, runs: state.runs + 1,
      inserted: match ? 0 : 1, skipped: match ? 1 : 0 };
  }
  function correctSelectedSource(state) {
    return { ...state, source: { ...state.source, cost: '0.010000' } };
  }
  function expectedStagedCost(key) {
    if (!Object.prototype.hasOwnProperty.call(observations, key)) throw new Error('Unknown observation');
    return observations[key].typedCost === 'NULL' ? 'null' : 'number';
  }
  // UNION ALL appends observations; it does not remove matching rows.
  function appendedObservations(snowflake, dataiku) {
    return snowflake.concat(dataiku);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { newLoadState, loadSelectedRow, correctSelectedSource, expectedStagedCost, appendedObservations };
  if (typeof document === 'undefined') return;

  function setupPipelineExplorer() {
    const root = document.getElementById('lab03-pipeline-explorer');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true'; root.classList.add('lab03-pipeline');
    const sampleCount = appendedObservations([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]).length;
    root.innerHTML = `<p class="lab03-pipeline__eyebrow">INTERACTIVE · THE BIG PICTURE</p>
      <h3>From two feeds to a warehouse</h3>
      <p>Choose each layer to follow the path. These counts describe the supplied sample, not a live database.</p>
      <div class="lab03-pipeline__map" aria-label="Pipeline layers">
        <button type="button" data-layer="0" aria-pressed="true"><span>01</span><strong>Sources</strong><small>Two raw feeds</small></button>
        <button type="button" data-layer="1" aria-pressed="false"><span>02</span><strong>Stage</strong><small>Clean and append</small></button>
        <button type="button" data-layer="2" aria-pressed="false"><span>03</span><strong>Warehouse</strong><small>Dimensions and facts</small></button>
      </div>
      <div class="lab03-pipeline__panel" aria-live="polite" aria-atomic="true">
        <section data-panel="0"><h4>Two sources, two perspectives</h4>
          <div class="lab03-pipeline__feeds"><div><strong>Snowflake</strong><code>snowflake_raw</code><span>5 observations</span><small>Reported <code>cost_usd</code>: row 1 has text '9.785'.</small></div><div><strong>Dataiku</strong><code>dataiku_raw</code><span>5 observations</span><small>Estimated <code>estimated_cost_usd</code>: row 4 is blank.</small></div></div>
          <p>Each feed keeps its own fields and meanings. A reported cost and an estimated cost are not interchangeable.</p></section>
        <section data-panel="1" hidden><h4>Clean each feed, then append</h4>
          <div class="lab03-pipeline__feeds"><div><strong>Snowflake</strong><code>snowflake_clean</code><small><code>start_time</code> → <code>started_at</code>; text '9.785' → numeric 9.785.</small></div><div><strong>Dataiku</strong><code>dataiku_clean</code><small><code>event_time</code> → <code>started_at</code>; blank estimated cost → <code>NULL</code>.</small></div></div>
          <div class="lab03-pipeline__merge"><strong>UNION ALL → usage</strong><span>5 + 5 = ${sampleCount} observations</span><small>Append rows; do not join users or remove duplicates.</small></div>
          <p>These are views over the raw tables. A blank cost becomes <code>NULL</code> (unknown), not zero. A nonblank malformed number is flagged; quality flags preserve context.</p></section>
        <section data-panel="2" hidden><h4>Give each observation context</h4>
          <p>Five dimensions describe each fact:</p>
          <div class="lab03-pipeline__dimensions"><span>Source</span><span>Date</span><span>User</span><span>Entity</span><span>Model</span></div>
          <div class="lab03-pipeline__merge"><strong>fact_usage</strong><span>10 facts after a successful initial sample load</span><small>One supplied observation per <code>(batch_id, row_no)</code>.</small></div>
          <p>Dimension keys link the fact to its context. User, entity and model identifiers are scoped to their source; matching text does not prove shared identity. The sample does not establish complete coverage or execution status.</p></section>
      </div>
      <details class="lab03-pipeline__predict"><summary>Predict: what does UNION ALL do?</summary>
        <p>Both feeds have five observations. What happens when the views are combined?</p>
        <label for="lab03-pipeline-answer">Choose an answer</label>
        <select id="lab03-pipeline-answer"><option value="">Choose…</option><option value="10">It appends 10 rows</option><option value="5">It matches the feeds into 5 rows</option><option value="unique">It removes duplicate rows</option></select>
        <button type="button" data-check>Check answer</button><p class="lab03-pipeline__feedback" role="status" aria-live="polite"></p>
      </details>
      <p class="lab03-pipeline__note">This is a fixed browser illustration; it does not execute SQL. <a href="#trace-an-observation">Trace one observation through the layers →</a></p>`;
    const buttons = [...root.querySelectorAll('[data-layer]')];
    const panels = [...root.querySelectorAll('[data-panel]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const active = button.dataset.layer;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      panels.forEach(panel => { panel.hidden = panel.dataset.panel !== active; });
    }));
    const answer = root.querySelector('#lab03-pipeline-answer');
    const feedback = root.querySelector('.lab03-pipeline__feedback');
    answer.addEventListener('change', () => { feedback.textContent = ''; });
    root.querySelector('[data-check]').addEventListener('click', () => {
      if (!answer.value) feedback.textContent = 'Choose an answer first.';
      else if (answer.value === '10') feedback.textContent = 'Correct: UNION ALL appends the five rows from each feed, keeping all ten.';
      else feedback.textContent = 'Try again: UNION ALL appends rows from both feeds without matching or deduplicating them.';
    });
  }

  function setupLoadExplorer() {
    const root = document.getElementById('lab03-load-explorer');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true'; root.classList.add('lab03-load');
    root.innerHTML = `<p class="lab03-load__eyebrow">INTERACTIVE · FACT LOAD</p>
      <h3>Will a repeated load update a correction?</h3>
      <p>Predict first: when a source cost changes, will rerunning <code>ON CONFLICT (batch_id, row_no) DO NOTHING</code> update the matching fact?</p>
      <p>Follow one sample row; assume its dimension joins succeed. The initial cost is from the supplied synthetic data; the corrected value is hypothetical.</p>
      <div class="lab03-load__tables">
        <section><h4>Source / staging view</h4><table><caption>Selected source observation</caption><tbody class="lab03-load__source"></tbody></table></section>
        <section><h4>Warehouse fact</h4><table><caption>Selected fact observation</caption><tbody class="lab03-load__fact"></tbody></table></section>
      </div>
      <p class="lab03-load__count"></p>
      <div class="lab03-load__actions"><button type="button" data-action="load">Run load</button><button type="button" data-action="correct">Apply hypothetical correction</button><button type="button" data-action="reset">Reset</button></div>
      <p class="lab03-load__status" role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="lab03-load__note">This is a one-row browser simulation: it does not connect to PostgreSQL, run a distributed job, or implement change data capture or deletion. An unchanged fact count does not prove that source and fact values match.</p>`;
    let state = newLoadState();
    const source = root.querySelector('.lab03-load__source'), fact = root.querySelector('.lab03-load__fact');
    const count = root.querySelector('.lab03-load__count'), status = root.querySelector('.lab03-load__status');
    const correct = root.querySelector('[data-action="correct"]');
    function fill(body, row) {
      body.replaceChildren();
      if (!row) { const tr = el('tr'); const td = el('td', '', 'No fact loaded'); td.colSpan = 2; tr.append(td); body.append(tr); return; }
      for (const [name, value] of [['batch_id', row.batch], ['row_no', row.row], ['cost_usd', row.cost]]) {
        const tr = el('tr'), th = el('th', '', name), td = el('td', '', String(value)); th.scope = 'row'; tr.append(th, td); body.append(tr);
      }
    }
    function render(message) {
      fill(source, state.source); fill(fact, state.fact);
      count.textContent = `Selected fact rows: ${state.fact ? 1 : 0}. Load runs: ${state.runs}.`;
      correct.disabled = !state.fact || state.source.cost === '0.010000';
      status.textContent = message;
    }
    root.querySelector('[data-action="load"]').addEventListener('click', () => {
      state = loadSelectedRow(state);
      render(state.inserted ? 'Inserted 1 selected fact; skipped 0.' : `Inserted 0; skipped 1 existing composite key. ${state.source.cost !== state.fact.cost ? 'The fact still has the earlier cost, so source and fact differ.' : 'Source and fact costs match in this example.'}`);
    });
    correct.addEventListener('click', () => { state = correctSelectedSource(state); render('Hypothetical source correction applied. Predict the next load result before running it.'); });
    root.querySelector('[data-action="reset"]').addEventListener('click', () => { state = newLoadState(); render('Reset to the original source value and no selected fact.'); });
    render('No selected fact has been loaded. Run the first load, then rerun it.');
  }
  function setupExplorer() {
    const root = document.getElementById('lab03-observation-explorer');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true'; root.classList.add('lab03-trace');
    root.innerHTML = `<p class="lab03-trace__eyebrow">BROWSER SIMULATION · SOURCE TO FACT</p>
      <h3>Follow one observation</h3>
      <p>Choose a record, predict how its cost will be stored, then reveal each step.</p>
      <label for="lab03-observation">Sample observation</label>
      <select id="lab03-observation"><option value="sf">Snowflake · sf-sample-v1 / row 1</option><option value="dk">Dataiku · dk-sample-v1 / row 1</option><option value="missing">Dataiku · dk-sample-v1 / row 4 (missing cost)</option></select>
      <div class="lab03-trace__stages" aria-label="Observation across the three layers">
        <section><h3>1 / Source</h3><p class="lab03-trace__raw"></p></section>
        <section hidden><h3>2 / Staging view</h3><p class="lab03-trace__stage"></p></section>
        <section hidden><h3>3 / Warehouse fact</h3><p class="lab03-trace__fact"></p></section>
      </div>
      <div class="lab03-trace__prediction"><label for="lab03-cost-prediction">Predict: how will staging store this cost?</label>
        <select id="lab03-cost-prediction"><option value="">Choose an answer</option><option value="number">As a number</option><option value="null">As NULL (unknown)</option><option value="zero">As a confirmed zero</option><option value="text">As text</option></select>
        <button type="button" data-trace-check disabled>Check prediction</button>
        <p class="lab03-trace__feedback" role="status" aria-live="polite" aria-atomic="true"></p>
      </div>
      <div class="lab03-trace__actions"><button type="button" data-trace-previous disabled>Previous step</button><button type="button" data-trace-next>Reveal staging</button><button type="button" data-trace-reset>Start over</button></div>
      <p class="lab03-trace__progress" role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="lab03-trace__summary"></p>
      <p class="lab03-trace__note">This illustration does not query PostgreSQL. A known <strong>0</strong> is a measured zero; <strong>NULL</strong> is unknown. Dimension keys are generated by the database and are not assigned fixed numbers here. Snowflake reported costs and Dataiku estimated costs have different meanings.</p>`;
    const select = root.querySelector('select');
    const prediction = root.querySelector('#lab03-cost-prediction');
    const check = root.querySelector('[data-trace-check]');
    const feedback = root.querySelector('.lab03-trace__feedback');
    const previous = root.querySelector('[data-trace-previous]');
    const next = root.querySelector('[data-trace-next]');
    const cards = [...root.querySelectorAll('.lab03-trace__stages section')];
    const progress = root.querySelector('.lab03-trace__progress');
    let step = 0;
    function render() {
      const row = observations[select.value];
      root.querySelector('.lab03-trace__raw').textContent = `Source: ${row.source}. Raw cost: ${row.rawCost}; raw total tokens: ${row.rawTokens}. Source user: ${row.user}.`;
      root.querySelector('.lab03-trace__stage').textContent = `cost_usd: ${row.typedCost}; total_tokens: ${row.typedTokens}. Quality flags: ${row.quality}.`;
      root.querySelector('.lab03-trace__fact').textContent = `The source observation retains cost_usd ${row.typedCost} and total_tokens ${row.typedTokens}; dimension references are resolved for its source, date, user, entity and model.`;
      cards.forEach((card, index) => { card.hidden = index > step; });
      previous.disabled = step === 0;
      next.disabled = step === cards.length - 1;
      next.textContent = step === 0 ? 'Reveal staging' : step === 1 ? 'Reveal warehouse fact' : 'All steps shown';
      progress.textContent = `Step ${step + 1} of 3: ${['source', 'staging view', 'warehouse fact'][step]}.`;
      root.querySelector('.lab03-trace__summary').textContent = step === 2 ? `${row.label}. ${row.semantics}` : '';
    }
    function reset() { step = 0; prediction.value = ''; check.disabled = true; feedback.textContent = ''; render(); }
    select.addEventListener('change', reset);
    prediction.addEventListener('change', () => { check.disabled = !prediction.value; feedback.textContent = ''; });
    check.addEventListener('click', () => {
      const expected = expectedStagedCost(select.value);
      const explanation = expected === 'null' ? 'The blank cost becomes NULL, meaning unknown—not zero.' : 'The populated numeric text is converted to a number.';
      feedback.textContent = `${prediction.value === expected ? 'Correct.' : 'Not quite.'} ${explanation}`;
    });
    previous.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
    next.addEventListener('click', () => { step = Math.min(cards.length - 1, step + 1); render(); });
    root.querySelector('[data-trace-reset]').addEventListener('click', reset);
    render();
  }
  function setupQuiz() {
    const root = document.getElementById('lab03-practice-quiz');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true'; root.classList.add('lab03-quiz');
    let current = 0, checked = false;
    function render(focus) {
      root.replaceChildren();
      if (current >= questions.length) {
        const title = el('h3', 'lab03-quiz__title', 'Practice complete'); title.tabIndex = -1;
        root.append(title, el('p', '', 'You worked through all five questions. This practice is not graded or saved.'));
        const restart = el('button', 'lab03-quiz__button', 'Try again'); restart.type = 'button';
        restart.addEventListener('click', () => { current = 0; checked = false; render(true); }); root.append(restart);
        if (focus) title.focus(); return;
      }
      const q = questions[current];
      const progress = el('p', 'lab03-quiz__progress', `Question ${current + 1} of ${questions.length} · ${q.topic}`);
      const fieldset = el('fieldset', 'lab03-quiz__fieldset');
      const legend = el('legend', 'lab03-quiz__legend', q.prompt); legend.tabIndex = -1; fieldset.append(legend);
      const inputs = q.choices.map((choice, index) => {
        const label = el('label', 'lab03-quiz__option'); const input = document.createElement('input');
        input.type = 'radio'; input.name = 'lab03-quiz-choice'; input.value = String(index);
        label.append(input, el('span', '', choice)); fieldset.append(label); return input;
      });
      const feedback = el('div', 'lab03-quiz__feedback');
      feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
      const actions = el('div', 'lab03-quiz__actions');
      const check = el('button', 'lab03-quiz__button', 'Check answer'); check.type = 'button';
      const next = el('button', 'lab03-quiz__button lab03-quiz__button--secondary', current === questions.length - 1 ? 'Finish practice' : 'Next question'); next.type = 'button'; next.disabled = true;
      const reset = el('button', 'lab03-quiz__button lab03-quiz__button--secondary', 'Start over'); reset.type = 'button';
      check.addEventListener('click', () => {
        const selected = inputs.find(input => input.checked);
        if (!selected) { feedback.textContent = 'Choose an answer first.'; return; }
        const correct = Number(selected.value) === q.answer;
        feedback.className = 'lab03-quiz__feedback ' + (correct ? 'is-correct' : 'is-review');
        feedback.textContent = (correct ? 'Correct. ' : 'Not quite. ') + q.explanation; checked = true; next.disabled = false;
      });
      inputs.forEach(input => input.addEventListener('change', () => { if (checked) { checked = false; next.disabled = true; feedback.textContent = ''; feedback.className = 'lab03-quiz__feedback'; } }));
      next.addEventListener('click', () => { current += 1; checked = false; render(true); });
      reset.addEventListener('click', () => { current = 0; checked = false; render(true); });
      actions.append(check, next, reset); root.append(progress, fieldset, feedback, actions); if (focus) legend.focus();
    }
    render(false);
  }
  function init() { setupPipelineExplorer(); setupExplorer(); setupLoadExplorer(); setupQuiz(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
