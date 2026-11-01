/* Logical MapReduce character-count trace; no network or cluster. */
(function () {
  'use strict';
  function traceRecords(records, combine) {
    if (!Array.isArray(records) || records.length < 1 || records.length > 12 ||
        records.some(record => typeof record !== 'string' || !/^[A-Z]{1,30}$/.test(record)) ||
        records.join('').length > 120) {
      throw new Error('Use 1–12 records with uppercase letters A–Z, at most 30 letters each and 120 total.');
    }
    const mapped = records.map(record => Array.from(record, key => [key, 1]));
    const localGroups = mapped.map(group => {
      if (!combine) return group.slice();
      const sums = new Map();
      group.forEach(([key, count]) => sums.set(key, (sums.get(key) || 0) + count));
      return Array.from(sums);
    });
    const pairs = localGroups.flat();
    const grouped = new Map();
    pairs.forEach(([key, count]) => {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(count);
    });
    const keys = Array.from(grouped.keys()).sort();
    const counts = keys.map(key => [key, grouped.get(key).reduce((sum, value) => sum + value, 0)]);
    return { records, mapped, localGroups, pairs, grouped, keys, counts, combine };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { traceRecords };
  if (typeof document === 'undefined') return;

  function init() {
    const root = document.getElementById('lab04-mapreduce-explorer');
    if (!root || root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    root.classList.add('lab04-trace');
    root.innerHTML = `
      <p class="lab04-trace__eyebrow">BROWSER SIMULATION</p>
      <p>Enter one uppercase-letter record per line. A mapper emits one <code>(letter, 1)</code> for each character.</p>
      <label for="lab04-input">Input records</label>
      <textarea id="lab04-input" rows="3" spellcheck="false" maxlength="371">DATA\nDARK\nTASK</textarea>
      <label class="lab04-trace__checkbox"><input type="checkbox" id="lab04-combine"> Use a local sum combiner per record</label>
      <div class="lab04-trace__actions"><button type="button" id="lab04-run">Run trace</button></div>
      <p class="lab04-trace__error" role="alert"></p>
      <div class="lab04-trace__result" hidden>
        <ol class="lab04-trace__path" aria-label="Trace stages">
          <li>Input</li><li>Map</li><li>Combine</li><li>Shuffle</li><li>Reduce</li>
        </ol>
        <div class="lab04-trace__stage" role="status" aria-live="polite" aria-atomic="true"></div>
        <p class="lab04-trace__explanation"></p>
        <div class="lab04-trace__output" aria-label="Current MapReduce stage"></div>
        <p class="lab04-trace__metrics"></p>
        <div class="lab04-trace__actions"><button type="button" id="lab04-prev">Previous stage</button><button type="button" id="lab04-next">Next stage</button></div>
      </div>
      <p class="lab04-trace__note">This is a logical simulation in one browser. It does not execute Hadoop, run workers in parallel, or measure a network shuffle.</p>`;
    const input = root.querySelector('#lab04-input');
    const combine = root.querySelector('#lab04-combine');
    const error = root.querySelector('.lab04-trace__error');
    const result = root.querySelector('.lab04-trace__result');
    const stage = root.querySelector('.lab04-trace__stage');
    const output = root.querySelector('.lab04-trace__output');
    const explanation = root.querySelector('.lab04-trace__explanation');
    const path = [...root.querySelectorAll('.lab04-trace__path li')];
    const metrics = root.querySelector('.lab04-trace__metrics');
    const prev = root.querySelector('#lab04-prev');
    const next = root.querySelector('#lab04-next');
    let current = 0;
    let trace;
    const pair = ([key, value]) => `(${key}, ${value})`;
    function render() {
      const names = ['Input', 'Map', 'Combine', 'Shuffle', 'Reduce'];
      const descriptions = [
        'Each record is one local group in this example.',
        'Emit one (letter, 1) pair for every character, including repeated characters.',
        trace.combine ? 'Add values for each letter within each local group before the shuffle.' : 'The combiner is off, so every emitted pair goes to the shuffle unchanged.',
        'Gather values for the same letter. The lists below are the values presented to each key’s reducer.',
        'Add the values for each letter to get the final counts.'
      ];
      stage.textContent = `Stage ${current + 1} of ${names.length}: ${names[current]}`;
      explanation.textContent = descriptions[current];
      path.forEach((item, i) => { if (i === current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
      output.replaceChildren();
      const row = (label, value) => {
        const item = document.createElement('div'); item.className = 'lab04-trace__row';
        const title = document.createElement('strong'); title.textContent = label;
        const data = document.createElement('code'); data.textContent = value;
        item.append(title, data); output.append(item);
      };
      if (current === 0) trace.records.forEach((record, i) => row(`Record ${i + 1}`, record));
      if (current === 1) trace.mapped.forEach((pairs, i) => row(`Record ${i + 1}`, pairs.map(pair).join(' ')));
      if (current === 2) trace.localGroups.forEach((pairs, i) => row(`Record ${i + 1}`, pairs.map(pair).join(' ')));
      if (current === 3) trace.keys.forEach(key => row(`Key ${key}`, `[${trace.grouped.get(key).join(', ')}]`));
      if (current === 4) trace.counts.forEach(([key, count]) => row(`Key ${key}`, String(count)));
      metrics.textContent = `Mapper emitted ${trace.mapped.flat().length} pairs; ${trace.pairs.length} pairs entered the logical shuffle${trace.combine ? ' after local combination.' : ' without a combiner.'}`;
      prev.disabled = current === 0;
      next.disabled = current === names.length - 1;
    }
    function run() {
      const records = input.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      try {
        trace = traceRecords(records, combine.checked);
        error.textContent = '';
        current = 0;
        result.hidden = false;
        render();
      } catch (exc) {
        result.hidden = true;
        error.textContent = exc.message;
      }
    }
    root.querySelector('#lab04-run').addEventListener('click', run);
    prev.addEventListener('click', () => { if (current > 0) { current -= 1; render(); } });
    next.addEventListener('click', () => { if (current < 4) { current += 1; render(); } });
    // Applying edited input or a changed combiner always requires an explicit run.
    input.addEventListener('input', () => { result.hidden = true; });
    combine.addEventListener('change', () => { result.hidden = true; });
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());

/* A formative browser-only check; this does not grade the assignment. */
(function () {
  "use strict";

  const questions = [
    {
      topic: "Map emits occurrences",
      prompt: "A mapper counts letters in the record ABA. Which output correctly preserves occurrences?",
      choices: ["(A, 1), (B, 1)", "(A, 1), (B, 1), (A, 1)", "(ABA, 3)"],
      answer: 1,
      explanation: "Each occurrence emits its own pair. The two A characters each contribute one value."
    },
    {
      topic: "Shuffle grouping",
      prompt: "What is the shuffle stage's role in this character-count example?",
      choices: ["Group values emitted for the same key", "Discard repeated values", "Calculate a final answer for every input record"],
      answer: 0,
      explanation: "Shuffle groups values by key so a reducer can aggregate the values for that key. Grouping is a logical step in this browser example."
    },
    {
      topic: "Safe combiners",
      prompt: "Which local combination preserves the final sum of (C,1), (C,1), (C,1)?",
      choices: ["(C,1)", "(C,3)", "(C,0)"],
      answer: 1,
      explanation: "Combining three local ones into (C,3) preserves their sum. A combiner can reduce intermediate pairs, but cannot change the result."
    },
    {
      topic: "Mean and unequal splits",
      prompt: "One worker has [1] and another has [3, 5, 7]. Why is the unweighted average of their means not the overall mean?",
      choices: ["The two workers have different numbers of values", "Means cannot be calculated in distributed systems", "The second worker must always run first"],
      answer: 0,
      explanation: "Equal weight for the worker means ignores split size: the overall mean weights each observation equally. Preserve (sum, count) to combine safely."
    },
    {
      topic: "Reducers and skew",
      prompt: "In a correct character count, what does adding reducers change?",
      choices: ["The final count for each key must double", "The grouping of work can change, but the final counts stay the same", "A hot key is automatically balanced evenly among all reducers"],
      answer: 1,
      explanation: "Correct grouping keeps each key's final aggregate unchanged. A very common key can still concentrate work on one reducer; the number of reducers alone does not remove skew."
    }
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function start() {
    const root = document.getElementById("lab04-practice-quiz");
    if (!root || root.dataset.quizReady === "true") return;
    root.dataset.quizReady = "true";
    root.classList.add("lab04-quiz");
    let current = 0;
    let checked = false;

    function render(moveFocus) {
      root.replaceChildren();
      if (current >= questions.length) {
        const title = element("h3", "lab04-quiz__title", "Practice complete");
        title.tabIndex = -1;
        root.append(title, element("p", "lab04-quiz__intro", "You have worked through all five questions. This practice is not graded or saved."));
        const restart = element("button", "lab04-quiz__button", "Try the questions again");
        restart.type = "button";
        restart.addEventListener("click", function () { current = 0; checked = false; render(true); });
        root.append(restart);
        if (moveFocus) title.focus();
        return;
      }

      const question = questions[current];
      const progress = element("p", "lab04-quiz__progress", `Question ${current + 1} of ${questions.length} · ${question.topic}`);
      const fieldset = element("fieldset", "lab04-quiz__fieldset");
      const legend = element("legend", "lab04-quiz__legend", question.prompt);
      legend.tabIndex = -1;
      fieldset.append(legend);
      const inputs = [];
      question.choices.forEach(function (choice, index) {
        const label = element("label", "lab04-quiz__option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "lab04-quiz-choice";
        input.value = String(index);
        const text = element("span", "", choice);
        label.append(input, text);
        fieldset.append(label);
        inputs.push(input);
      });
      const feedback = element("div", "lab04-quiz__feedback");
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      feedback.setAttribute("aria-atomic", "true");
      const actions = element("div", "lab04-quiz__actions");
      const check = element("button", "lab04-quiz__button", "Check answer");
      check.type = "button";
      const next = element("button", "lab04-quiz__button lab04-quiz__button--secondary", current === questions.length - 1 ? "Finish practice" : "Next question");
      next.type = "button";
      next.disabled = true;
      const restart = element("button", "lab04-quiz__button lab04-quiz__button--text", "Start over");
      restart.type = "button";

      check.addEventListener("click", function () {
        const selected = inputs.find(function (input) { return input.checked; });
        if (!selected) {
          feedback.className = "lab04-quiz__feedback lab04-quiz__feedback--notice";
          feedback.textContent = "Choose an answer first.";
          return;
        }
        const correct = Number(selected.value) === question.answer;
        feedback.className = "lab04-quiz__feedback " + (correct ? "lab04-quiz__feedback--correct" : "lab04-quiz__feedback--review");
        feedback.textContent = (correct ? "Correct. " : "Not quite. ") + question.explanation;
        checked = true;
        next.disabled = false;
      });
      inputs.forEach(function (input) {
        input.addEventListener("change", function () {
          if (checked) {
            checked = false;
            next.disabled = true;
            feedback.textContent = "";
            feedback.className = "lab04-quiz__feedback";
          }
        });
      });
      next.addEventListener("click", function () { current += 1; checked = false; render(true); });
      restart.addEventListener("click", function () { current = 0; checked = false; render(true); });
      actions.append(check, next, restart);
      root.append(progress, fieldset, feedback, actions);
      if (moveFocus) legend.focus();
    }

    render(false);
  }

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
