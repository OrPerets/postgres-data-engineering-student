/* A formative browser-only check; this does not grade the assignment. */
(function () {
  "use strict";

  const questions = [
    {
      topic: "Partition pruning",
      prompt: "A table has yearly date partitions for 2024, 2025 and 2026. With partition pruning enabled, which partition can contain rows for date >= 2025-01-01 and date < 2026-01-01?",
      choices: ["Only the 2025 partition", "All three partitions must be scanned", "Only the 2024 partition"],
      answer: 0,
      explanation: "The predicate covers the half-open interval from the start of 2025 to the start of 2026, so only the 2025 partition can match. Whether and when pruning occurs depends on the query and plan; verify with EXPLAIN."
    },
    {
      topic: "Asynchronous replication",
      prompt: "A write has just committed on the primary. What can a read on an asynchronously replicated standby show immediately afterward?",
      choices: ["It must always include the new write", "It may still show the earlier state until replay catches up", "It always rejects every read"],
      answer: 1,
      explanation: "The standby can lag behind the committed primary while WAL is transmitted and replayed. There is no fixed delay guaranteed by this example; measure or monitor replay when freshness matters."
    },
    {
      topic: "Replica and backup",
      prompt: "Why is a streaming replica not a replacement for a backup?",
      choices: ["Replicas can never be read", "Changes such as accidental deletes can also be replicated", "Backups require a running replica"],
      answer: 1,
      explanation: "A replica follows changes from the primary, so an unwanted change can reach it too. A separate backup and recovery procedure are needed to restore an earlier state."
    },
    {
      topic: "Ranking tied values",
      prompt: "Four amounts are 100, 90, 90 and 80. What are their RANK() values when ordered by amount descending?",
      choices: ["1, 2, 2, 4", "1, 2, 2, 3", "1, 2, 3, 4"],
      answer: 0,
      explanation: "RANK gives equal values equal rank and leaves a gap after the tie: 1, 2, 2, 4. DENSE_RANK would give 1, 2, 2, 3; ROW_NUMBER assigns distinct positions."
    },
    {
      topic: "Two meanings of partition",
      prompt: "What does PARTITION BY customer_id inside a window function do?",
      choices: ["It permanently creates physical PostgreSQL table partitions", "It groups result rows for the window calculation", "It copies the table to a replica"],
      answer: 1,
      explanation: "Window PARTITION BY defines groups used for a calculation, such as a running total per customer. It does not change how the table is physically partitioned or replicate data."
    }
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function start() {
    const root = document.getElementById("lab02-practice-quiz");
    if (!root || root.dataset.quizReady === "true") return;
    root.dataset.quizReady = "true";
    root.classList.add("lab02-quiz");
    let current = 0;
    let checked = false;

    function render(moveFocus) {
      root.replaceChildren();
      if (current >= questions.length) {
        const title = element("h3", "lab02-quiz__title", "Practice complete");
        title.tabIndex = -1;
        root.append(title, element("p", "lab02-quiz__intro", "You have worked through all five questions. This practice is not graded or saved."));
        const restart = element("button", "lab02-quiz__button", "Try the questions again");
        restart.type = "button";
        restart.addEventListener("click", function () { current = 0; checked = false; render(true); });
        root.append(restart);
        if (moveFocus) title.focus();
        return;
      }

      const question = questions[current];
      const progress = element("p", "lab02-quiz__progress", `Question ${current + 1} of ${questions.length} · ${question.topic}`);
      const fieldset = element("fieldset", "lab02-quiz__fieldset");
      const legend = element("legend", "lab02-quiz__legend", question.prompt);
      legend.tabIndex = -1;
      fieldset.append(legend);
      const inputs = [];
      question.choices.forEach(function (choice, index) {
        const label = element("label", "lab02-quiz__option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "lab02-quiz-choice";
        input.value = String(index);
        const text = element("span", "", choice);
        label.append(input, text);
        fieldset.append(label);
        inputs.push(input);
      });
      const feedback = element("div", "lab02-quiz__feedback");
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      feedback.setAttribute("aria-atomic", "true");
      const actions = element("div", "lab02-quiz__actions");
      const check = element("button", "lab02-quiz__button", "Check answer");
      check.type = "button";
      const next = element("button", "lab02-quiz__button lab02-quiz__button--secondary", current === questions.length - 1 ? "Finish practice" : "Next question");
      next.type = "button";
      next.disabled = true;
      const restart = element("button", "lab02-quiz__button lab02-quiz__button--text", "Start over");
      restart.type = "button";

      check.addEventListener("click", function () {
        const selected = inputs.find(function (input) { return input.checked; });
        if (!selected) {
          feedback.className = "lab02-quiz__feedback lab02-quiz__feedback--notice";
          feedback.textContent = "Choose an answer first.";
          return;
        }
        const correct = Number(selected.value) === question.answer;
        feedback.className = "lab02-quiz__feedback " + (correct ? "lab02-quiz__feedback--correct" : "lab02-quiz__feedback--review");
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
            feedback.className = "lab02-quiz__feedback";
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
