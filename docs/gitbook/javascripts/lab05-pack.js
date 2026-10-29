/* Local PageRank demonstration and formative quiz: no data is transmitted. */
(function () {
  'use strict';

  const nodes = ['A', 'B', 'C', 'D'];
  const graph = { A: ['B', 'C'], B: ['C'], C: ['A'], D: [] };
  const damping = 0.85;

  // The distributed mass from a dangling node is inside the damping factor.
  function step(ranks) {
    const incoming = { A: 0, B: 0, C: 0, D: 0 };
    let dangling = 0;
    for (const node of nodes) {
      if (graph[node].length === 0) dangling += ranks[node];
      else for (const target of graph[node]) incoming[target] += ranks[node] / graph[node].length;
    }
    const next = {};
    for (const node of nodes) next[node] = (1 - damping) / nodes.length + damping * (incoming[node] + dangling / nodes.length);
    return { incoming, dangling, next };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { step };
  if (typeof document === 'undefined') return;

  function initExplorer() {
    const root = document.getElementById('lab05-pagerank-explorer');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    root.classList.add('lab05-explorer');
    root.innerHTML = `
      <h3>Follow one rank update</h3>
      <p class="lab05-explorer__graph"><strong>Graph:</strong> A → B, C &nbsp; · &nbsp; B → C &nbsp; · &nbsp; C → A &nbsp; · &nbsp; D → none</p>
      <p>Every page starts at 0.25; damping <strong>d = 0.85</strong>. Predict the next ranks before you step.</p>
      <p class="lab05-explorer__iteration"></p>
      <div class="lab05-explorer__table-wrap" role="region" aria-label="PageRank table" tabindex="0">
        <table><caption>Rank per page at the current iteration</caption><thead><tr><th scope="col">Page</th><th scope="col">Rank</th><th scope="col">Outlinks</th></tr></thead><tbody></tbody></table>
      </div>
      <p class="lab05-explorer__status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="lab05-explorer__actions"><button type="button" data-action="next">Next iteration</button><button type="button" data-action="reset">Reset</button></div>
      <p class="lab05-explorer__formula"><code>new rank = (1-d)/4 + d × (incoming + dangling mass/4)</code></p>
      <p>Redistributed dangling mass is multiplied by <strong>d</strong>, as are the incoming link contributions. Values are rounded only for display; calculations use full precision.</p>
      <p>This deterministic browser example illustrates the logical calculation on one device; it does not measure a real distributed cluster.</p>`;
    let ranks = Object.fromEntries(nodes.map(node => [node, 0.25]));
    let iteration = 0;
    let previousChange = null;
    const tbody = root.querySelector('tbody');
    const iterationLabel = root.querySelector('.lab05-explorer__iteration');
    const status = root.querySelector('.lab05-explorer__status');
    function render() {
      tbody.replaceChildren();
      for (const node of nodes) {
        const row = document.createElement('tr');
        for (const text of [node, ranks[node].toFixed(6), graph[node].length ? graph[node].join(', ') : 'none (dangling)']) {
          const cell = document.createElement('td');
          cell.textContent = text;
          row.append(cell);
        }
        tbody.append(row);
      }
      iterationLabel.textContent = `Iteration ${iteration}`;
      const total = nodes.reduce((sum, node) => sum + ranks[node], 0);
      status.textContent = `Total rank: ${total.toFixed(6)}. Dangling mass: ${ranks.D.toFixed(6)}.` +
        (previousChange === null ? ' Starting ranks are uniform.' : ` L1 change from previous iteration: ${previousChange.toFixed(6)}.`);
    }
    root.querySelector('[data-action="next"]').addEventListener('click', function () {
      const result = step(ranks);
      previousChange = nodes.reduce((sum, node) => sum + Math.abs(result.next[node] - ranks[node]), 0);
      ranks = result.next;
      iteration += 1;
      render();
    });
    root.querySelector('[data-action="reset"]').addEventListener('click', function () {
      ranks = Object.fromEntries(nodes.map(node => [node, 0.25]));
      iteration = 0;
      previousChange = null;
      render();
    });
    render();
  }

  const questions = [
    { topic: 'Rank propagation', prompt: 'A page with rank 0.30 has three outlinks. How much rank does it send along each link before damping?', choices: ['0.10', '0.30', '0.90'], answer: 0, explanation: 'The page divides its rank equally among its three outlinks: 0.30 / 3 = 0.10 per link.' },
    { topic: 'Dangling pages', prompt: 'What is a dangling page in this model?', choices: ['A page that has no incoming links', 'A page that has no outgoing links', 'A page whose rank is always zero'], answer: 1, explanation: 'A dangling page has no outgoing links. Its current rank mass must be handled separately in this model.' },
    { topic: 'Damping', prompt: 'In the update used here, which terms are multiplied by the damping factor d?', choices: ['Only incoming contributions', 'Incoming contributions and redistributed dangling mass', 'Only the teleportation term'], answer: 1, explanation: 'Both incoming contributions and redistributed dangling mass are inside the factor d. The separate teleportation term is (1-d)/N.' },
    { topic: 'Conservation', prompt: 'What should the sum of ranks be after an iteration, allowing for floating-point rounding?', choices: ['Approximately 1', 'Exactly the number of edges', 'Always 0.85'], answer: 0, explanation: 'With the stated update and a normalized initial vector, rank mass sums to approximately 1. Minor rounding differences are normal.' },
    { topic: 'Convergence', prompt: 'What does the L1 change between iterations measure?', choices: ['The number of nodes in the graph', 'The sum of absolute per-page rank changes', 'The amount of network traffic'], answer: 1, explanation: 'L1 change adds the absolute differences between each page’s old and new rank. It is a convergence signal, not a network or runtime measurement.' }
  ];
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function initQuiz() {
    const root = document.getElementById('lab05-practice-quiz');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    root.classList.add('lab05-quiz');
    let current = 0;
    let checked = false;
    function render(moveFocus) {
      root.replaceChildren();
      if (current === questions.length) {
        const title = element('h3', '', 'Practice complete'); title.tabIndex = -1;
        const restart = element('button', 'lab05-quiz__button', 'Try the questions again'); restart.type = 'button';
        restart.addEventListener('click', () => { current = 0; checked = false; render(true); });
        root.append(title, element('p', '', 'You have worked through all five questions. This practice is not graded or saved.'), restart);
        if (moveFocus) title.focus();
        return;
      }
      const question = questions[current];
      const progress = element('p', 'lab05-quiz__progress', `Question ${current + 1} of ${questions.length} · ${question.topic}`);
      const fieldset = element('fieldset', 'lab05-quiz__fieldset');
      const legend = element('legend', 'lab05-quiz__legend', question.prompt); legend.tabIndex = -1; fieldset.append(legend);
      const inputs = [];
      question.choices.forEach((choice, index) => {
        const label = element('label', 'lab05-quiz__option');
        const input = document.createElement('input'); input.type = 'radio'; input.name = 'lab05-quiz-choice'; input.value = String(index);
        label.append(input, element('span', '', choice)); fieldset.append(label); inputs.push(input);
      });
      const feedback = element('div', 'lab05-quiz__feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
      const actions = element('div', 'lab05-quiz__actions');
      const check = element('button', 'lab05-quiz__button', 'Check answer'); check.type = 'button';
      const next = element('button', 'lab05-quiz__button lab05-quiz__button--secondary', current === questions.length - 1 ? 'Finish practice' : 'Next question'); next.type = 'button'; next.disabled = true;
      const restart = element('button', 'lab05-quiz__button lab05-quiz__button--secondary', 'Start over'); restart.type = 'button';
      check.addEventListener('click', () => {
        const selected = inputs.find(input => input.checked);
        if (!selected) { feedback.className = 'lab05-quiz__feedback lab05-quiz__feedback--notice'; feedback.textContent = 'Choose an answer first.'; return; }
        const correct = Number(selected.value) === question.answer;
        feedback.className = 'lab05-quiz__feedback ' + (correct ? 'lab05-quiz__feedback--correct' : 'lab05-quiz__feedback--review');
        feedback.textContent = (correct ? 'Correct. ' : 'Not quite. ') + question.explanation;
        checked = true; next.disabled = false;
      });
      inputs.forEach(input => input.addEventListener('change', () => { if (checked) { checked = false; next.disabled = true; feedback.textContent = ''; feedback.className = 'lab05-quiz__feedback'; } }));
      next.addEventListener('click', () => { current += 1; checked = false; render(true); });
      restart.addEventListener('click', () => { current = 0; checked = false; render(true); });
      actions.append(check, next, restart); root.append(progress, fieldset, feedback, actions);
      if (moveFocus) legend.focus();
    }
    render(false);
  }
  function init() { initExplorer(); initQuiz(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
