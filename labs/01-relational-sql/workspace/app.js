(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const elements = {
    list: $('question-list'), total: $('question-total'), title: $('question-title'),
    counter: $('question-counter'), question: $('question-text'), input: $('sql-input'),
    prev: $('previous-button'), next: $('next-button'), run: $('run-button'),
    save: $('save-button'), download: $('export-button'), status: $('save-status'),
    results: $('results'), loadError: $('load-error'), saveError: $('save-error'), hintContainer: $('hint-container'),
    hintToggle: $('hint-toggle'), hintText: $('hint-text')
  };
  let questions = [];
  let answers = {};
  let savedSnapshot = '{}';
  let revision = null;
  let currentIndex = 0;
  let busy = false;
  let saving = false;
  let viewVersion = 0;

  const snapshot = () => JSON.stringify(answers);
  const dirty = () => snapshot() !== savedSnapshot;
  const selected = () => questions[currentIndex];

  async function request(path, options) {
    let response;
    try {
      response = await fetch(path, options);
    } catch (_) {
      throw new Error('Cannot reach the workspace server. Check that it is running, then try again.');
    }
    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error('The workspace returned an unexpected response. Please try again.');
    }
    if (!response.ok || data.error) {
      const error = new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function updateStatus() {
    if (saving) elements.status.textContent = 'Saving answers…';
    else if (dirty()) elements.status.textContent = 'Unsaved changes';
    else elements.status.textContent = 'No unsaved changes';
  }

  function makeQuestionList() {
    elements.list.replaceChildren();
    questions.forEach((question, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const label = document.createElement('span');
      const number = document.createElement('span');
      const dot = document.createElement('span');
      button.type = 'button';
      button.dataset.index = String(index);
      number.className = 'question-number';
      number.textContent = String(question.id).padStart(2, '0');
      label.append(number, document.createTextNode('Question ' + question.id));
      dot.className = 'draft-dot';
      dot.setAttribute('aria-label', 'Has a draft');
      dot.textContent = '•';
      dot.hidden = !String(answers[String(question.id)] || '').trim();
      button.append(label, dot);
      button.addEventListener('click', () => openQuestion(index));
      li.append(button);
      elements.list.append(li);
    });
  }

  function emptyResults(message = 'Your results will appear here after you run a query.') {
    elements.results.replaceChildren();
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = message;
    elements.results.append(p);
  }

  function openQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentIndex = index;
    viewVersion += 1;
    const question = selected();
    elements.title.textContent = 'Question ' + question.id;
    elements.counter.textContent = `${index + 1} / ${questions.length}`;
    elements.question.textContent = question.question;
    const hint = typeof question.hint === 'string' ? question.hint.trim() : '';
    elements.hintContainer.hidden = !hint;
    elements.hintText.textContent = hint;
    elements.hintText.hidden = true;
    elements.hintToggle.setAttribute('aria-expanded', 'false');
    elements.hintToggle.textContent = 'Show hint +';
    elements.input.value = answers[String(question.id)] || '';
    elements.input.setAttribute('aria-label', `SQL answer for question ${question.id}`);
    elements.prev.disabled = index === 0;
    elements.next.disabled = index === questions.length - 1;
    elements.list.querySelectorAll('button').forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    emptyResults();
  }

  function updateDraftDot() {
    const button = elements.list.querySelector(`button[data-index="${currentIndex}"]`);
    if (button) button.querySelector('.draft-dot').hidden = !elements.input.value.trim();
  }

  function setMessage(message, error = false) {
    elements.results.replaceChildren();
    const p = document.createElement('p');
    p.className = error ? 'query-error' : 'empty-state';
    p.textContent = message;
    elements.results.append(p);
  }

  function showResults(data) {
    if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) throw new Error('The query returned an unexpected result.');
    elements.results.replaceChildren();
    if (!data.columns.length) {
      setMessage('Query completed. There are no result columns to display.');
      return;
    }
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    data.columns.forEach(column => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = String(column);
      headRow.append(th);
    });
    thead.append(headRow);
    const tbody = document.createElement('tbody');
    data.rows.forEach(row => {
      const tr = document.createElement('tr');
      if (!Array.isArray(row)) return;
      row.forEach(value => {
        const td = document.createElement('td');
        if (value === null) { td.className = 'null-value'; td.textContent = 'NULL'; }
        else td.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    const summary = document.createElement('p');
    summary.className = 'empty-state';
    summary.textContent = `${data.rows.length} ${data.rows.length === 1 ? 'row' : 'rows'} shown${data.truncated ? ' (results truncated)' : ''}.`;
    elements.results.append(table, summary);
  }

  async function runQuery() {
    if (busy || !questions.length) return;
    const {selectionStart, selectionEnd, value} = elements.input;
    const sql = (selectionEnd > selectionStart ? value.slice(selectionStart, selectionEnd) : value).trim();
    if (!sql) { setMessage('Write or select a SQL statement before running it.', true); return; }
    const startedOn = viewVersion;
    busy = true;
    elements.run.disabled = true;
    elements.run.textContent = 'Running…';
    setMessage('Running your query…');
    try {
      const data = await request('/api/query', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql})});
      if (startedOn === viewVersion) showResults(data);
    } catch (error) {
      if (startedOn === viewVersion) setMessage(error.message, true);
    } finally {
      busy = false;
      elements.run.disabled = false;
      elements.run.textContent = '▶ Run query';
    }
  }

  async function saveAnswers() {
    if (saving || !questions.length) return;
    const pending = snapshot();
    saving = true;
    elements.save.disabled = true;
    updateStatus();
    try {
      const saved = await request('/api/answers', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({answers:JSON.parse(pending), revision})});
      if (typeof saved.revision !== 'string') throw new Error('The server did not return a save revision. Download a copy before reloading.');
      revision = saved.revision;
      elements.saveError.hidden = true;
      savedSnapshot = pending;
      saving = false;
      elements.save.disabled = false;
      updateStatus();
    } catch (error) {
      saving = false;
      elements.save.disabled = false;
      elements.status.textContent = 'Save failed — your edits are still in this page';
      const guidance = error.status === 409
        ? 'Another tab or session changed the saved answers. Download your current answers before reloading; this save did not overwrite the other changes.'
        : `Could not save answers: ${error.message} Download a copy before closing this page.`;
      elements.saveError.textContent = guidance;
      elements.saveError.hidden = false;
    }
  }

  function downloadAnswers() {
    if (!questions.length) return;
    const parts = [
      '-- Lab 01: student SQL answers',
      '-- Downloaded from the guided workspace. Run selected statements as appropriate.',
      ''
    ];
    questions.forEach(question => {
      parts.push(`-- QUESTION ${String(question.id).padStart(2, '0')}`);
      question.question.split(/\r?\n/).forEach(line => parts.push('-- ' + line));
      parts.push('', answers[String(question.id)] || '-- No answer yet', '');
    });
    const blob = new Blob([parts.join('\n') + '\n'], {type:'application/sql;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lab01_student_answers.sql';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function initialize() {
    try {
      const [questionData, answerData] = await Promise.all([request('/api/questions'), request('/api/answers')]);
      if (!Array.isArray(questionData.questions) || !questionData.questions.length || !questionData.questions.every(q => Number.isInteger(q.id) && typeof q.question === 'string')) throw new Error('The question list could not be loaded.');
      if (!answerData.answers || typeof answerData.answers !== 'object' || Array.isArray(answerData.answers) || typeof answerData.revision !== 'string') throw new Error('Saved answers could not be loaded.');
      questions = questionData.questions;
      answers = answerData.answers;
      revision = answerData.revision;
      savedSnapshot = snapshot();
      elements.total.textContent = String(questions.length);
      elements.input.disabled = false;
      elements.run.disabled = false;
      elements.save.disabled = false;
      elements.download.disabled = false;
      makeQuestionList();
      openQuestion(0);
      updateStatus();
    } catch (error) {
      elements.loadError.textContent = `Unable to open the workspace: ${error.message} Check that the server is running, then reload this page.`;
      elements.loadError.hidden = false;
      elements.status.textContent = 'Workspace unavailable';
      elements.title.textContent = 'Workspace unavailable';
      elements.question.textContent = 'Your existing saved answers have not been changed.';
    }
  }

  elements.hintToggle.addEventListener('click', () => {
    const expanded = elements.hintToggle.getAttribute('aria-expanded') !== 'true';
    elements.hintToggle.setAttribute('aria-expanded', String(expanded));
    elements.hintText.hidden = !expanded;
    elements.hintToggle.textContent = expanded ? 'Hide hint −' : 'Show hint +';
  });
  elements.prev.addEventListener('click', () => openQuestion(currentIndex - 1));
  elements.next.addEventListener('click', () => openQuestion(currentIndex + 1));
  elements.run.addEventListener('click', runQuery);
  elements.save.addEventListener('click', saveAnswers);
  elements.download.addEventListener('click', downloadAnswers);
  elements.input.addEventListener('input', () => {
    if (!questions.length) return;
    const key = String(selected().id);
    if (elements.input.value) answers[key] = elements.input.value;
    else delete answers[key];
    updateDraftDot();
    updateStatus();
  });
  window.addEventListener('beforeunload', event => {
    if (dirty()) { event.preventDefault(); event.returnValue = ''; }
  });
  initialize();
})();
