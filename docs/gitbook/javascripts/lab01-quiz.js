/* A formative browser-only check; this does not grade the assignment. */
(function () {
  "use strict";

  const questions = [
    {
      topic: "JOIN multiplicity",
      prompt: "One customer has two orders, and each order has three items. How many rows result from joining that customer to both orders and their items?",
      choices: ["2 rows", "3 rows", "6 rows"],
      answer: 2,
      explanation: "Each of the two orders matches three item rows: 2 × 3 = 6. Counting joined rows as orders would overcount the orders."
    },
    {
      topic: "LEFT JOIN and filtering",
      prompt: "Customers are LEFT JOINed to orders. What happens to a customer with no orders when WHERE orders.status = 'completed' is applied afterward?",
      choices: ["The customer remains with NULL order fields", "The customer is removed", "The customer becomes a completed order"],
      answer: 1,
      explanation: "The unmatched order fields are NULL. The WHERE comparison is not true for NULL, so the row is filtered out. A join condition or conditional aggregation may be appropriate depending on the question."
    },
    {
      topic: "NULL and NOT IN",
      prompt: "A non-NULL city is not Haifa. What happens to it in WHERE city NOT IN ('Haifa', NULL)?",
      choices: ["The WHERE condition is true", "The WHERE condition is unknown, so the row is filtered out", "NULL is automatically ignored"],
      answer: 1,
      explanation: "The comparison with NULL is unknown. Since the city is not Haifa, the NOT IN result is also unknown, and WHERE keeps only true rows. NOT EXISTS is often a clearer alternative."
    },
    {
      topic: "Orders and revenue",
      prompt: "A completed order has one item with a 100% discount. For a completed-order count and net revenue, what does it contribute?",
      choices: ["One completed order and zero revenue", "Zero completed orders and zero revenue", "One completed order and full-price revenue"],
      answer: 0,
      explanation: "The order's status is completed, so it counts as one order. A 100% discount makes its net revenue zero."
    },
    {
      topic: "Window frames",
      prompt: "Two rows share the same date and have values 10 and 20. For a cumulative SUM ordered only by date, both frames run from UNBOUNDED PRECEDING through CURRENT ROW. How do ROWS and RANGE differ?",
      choices: ["Both frames must return 10 then 30", "RANGE gives both tied rows 30; ROWS can give a first row 10 or 20, then 30", "ROWS gives both rows 30; RANGE always gives 10 then 30"],
      answer: 1,
      explanation: "With UNBOUNDED PRECEDING through CURRENT ROW, RANGE includes all peers with the same ordering value, so both tied rows total 30. ROWS advances by physical rows; without a tie-breaker, the first tied row is not deterministic."
    }
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function start() {
    const root = document.getElementById("lab01-practice-quiz");
    if (!root || root.dataset.quizReady === "true") return;
    root.dataset.quizReady = "true";
    root.classList.add("lab01-quiz");
    let current = 0;
    let checked = false;

    function render(moveFocus) {
      root.replaceChildren();
      if (current >= questions.length) {
        const title = element("h3", "lab01-quiz__title", "Practice complete");
        title.tabIndex = -1;
        root.append(title, element("p", "lab01-quiz__intro", "You have worked through all five questions. This practice is not graded or saved."));
        const restart = element("button", "lab01-quiz__button", "Try the questions again");
        restart.type = "button";
        restart.addEventListener("click", function () { current = 0; checked = false; render(true); });
        root.append(restart);
        if (moveFocus) title.focus();
        return;
      }

      const question = questions[current];
      const progress = element("p", "lab01-quiz__progress", `Question ${current + 1} of ${questions.length} · ${question.topic}`);
      const fieldset = element("fieldset", "lab01-quiz__fieldset");
      const legend = element("legend", "lab01-quiz__legend", question.prompt);
      legend.tabIndex = -1;
      fieldset.append(legend);
      const inputs = [];
      question.choices.forEach(function (choice, index) {
        const label = element("label", "lab01-quiz__option");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "lab01-quiz-choice";
        input.value = String(index);
        const text = element("span", "", choice);
        label.append(input, text);
        fieldset.append(label);
        inputs.push(input);
      });
      const feedback = element("div", "lab01-quiz__feedback");
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      feedback.setAttribute("aria-atomic", "true");
      const actions = element("div", "lab01-quiz__actions");
      const check = element("button", "lab01-quiz__button", "Check answer");
      check.type = "button";
      const next = element("button", "lab01-quiz__button lab01-quiz__button--secondary", current === questions.length - 1 ? "Finish practice" : "Next question");
      next.type = "button";
      next.disabled = true;
      const restart = element("button", "lab01-quiz__button lab01-quiz__button--text", "Start over");
      restart.type = "button";

      check.addEventListener("click", function () {
        const selected = inputs.find(function (input) { return input.checked; });
        if (!selected) {
          feedback.className = "lab01-quiz__feedback lab01-quiz__feedback--notice";
          feedback.textContent = "Choose an answer first.";
          return;
        }
        const correct = Number(selected.value) === question.answer;
        feedback.className = "lab01-quiz__feedback " + (correct ? "lab01-quiz__feedback--correct" : "lab01-quiz__feedback--review");
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
            feedback.className = "lab01-quiz__feedback";
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
