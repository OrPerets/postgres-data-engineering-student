/* Local Lab 04 drafts. This editor does not execute Python. */
(function () {
  'use strict';
  const STORAGE_KEY = 'lab04-browser-draft-v1';
  function parseDraft(value) {
    try {
      const draft = JSON.parse(value);
      if (!draft || typeof draft.code !== 'string' || !draft.notes || typeof draft.notes !== 'object' || Array.isArray(draft.notes)) return null;
      if (Object.entries(draft.notes).some(([id, value]) => !/^(?:[1-9]|10|11)$/.test(id) || typeof value !== 'string')) return null;
      const notes = {};
      for (let id = 1; id <= 11; id++) if (typeof draft.notes[id] === 'string') notes[id] = draft.notes[id];
      return { code: draft.code, notes };
    } catch (_) { return null; }
  }
  function notesText(questions, notes) {
    return questions.map(q => `Question ${q.id}: ${q.question}\n\n${notes[q.id] || ''}`).join('\n\n---\n\n') + '\n';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseDraft, notesText };
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  const materialsUrl = new URL('../assets/lab04-browser/materials.json', script.src);
  materialsUrl.search = new URL(script.src).search;
  function node(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = node('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function init() {
    const root = document.getElementById('lab04-browser-workspace');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true'; root.classList.add('lab04-browser');
    const status = node('p', 'lab04-browser__status', 'Loading the starter file and assignment…');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); root.append(status);
    let material;
    try {
      const response = await fetch(materialsUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load materials');
      material = await response.json();
      if (typeof material.starter !== 'string' || !Array.isArray(material.questions) || material.questions.length !== 11 ||
          material.questions.some((q, i) => q.id !== i + 1 || typeof q.question !== 'string' || typeof q.hint !== 'string')) throw new Error('Invalid materials');
    } catch (_) {
      status.textContent = 'The browser editor could not load. Reload this page or use the Codespace workspace below.';
      return;
    }
    let draft = null, storageAvailable = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        draft = parseDraft(saved);
        if (!draft) { storageAvailable = false; status.textContent = 'A saved draft could not be read and has not been overwritten. The starter file is shown; save any new work by downloading it.'; }
      }
    } catch (_) { storageAvailable = false; }
    if (!draft) draft = { code: material.starter, notes: {} };
    const intro = node('p', 'lab04-browser__intro', 'Write your Python file and notes here. This browser editor does not run Python or tests; download your work and use the Codespace instructions below to execute it. Browser and Codespace drafts do not sync.');
    root.append(intro);
    const controls = node('div', 'lab04-browser__actions');
    const codeDownload = node('button', '', 'Download Python'); codeDownload.type = 'button';
    const notesDownload = node('button', '', 'Download notes'); notesDownload.type = 'button';
    controls.append(codeDownload, notesDownload); root.append(controls);
    const label = node('label', 'lab04-browser__label', 'Your student_tasks.py'); label.htmlFor = 'lab04-browser-code';
    const code = node('textarea', 'lab04-browser__code'); code.id = 'lab04-browser-code'; code.spellcheck = false; code.autocapitalize = 'off'; code.value = draft.code;
    root.append(label, code);
    const details = node('details', 'lab04-browser__notes');
    const summary = node('summary', '', 'Task notes and hints'); details.append(summary);
    details.append(node('p', '', 'Keep your trace and explanations with each task. These notes are a draft; include the required report when you submit.'));
    for (const q of material.questions) {
      const task = node('section', 'lab04-browser__task');
      const heading = node('h3', '', `Question ${q.id}`); const question = node('p', '', q.question);
      const hint = node('details', 'lab04-browser__hint'); hint.append(node('summary', '', 'Show hint'), node('p', '', q.hint || 'Review the assignment and the MapReduce example.'));
      const noteLabel = node('label', 'lab04-browser__label', `Notes for question ${q.id}`); noteLabel.htmlFor = `lab04-browser-note-${q.id}`;
      const note = node('textarea', 'lab04-browser__note'); note.id = noteLabel.htmlFor; note.value = draft.notes[q.id] || '';
      note.addEventListener('input', () => { draft.notes[q.id] = note.value; save(); });
      task.append(heading, question, hint, noteLabel, note); details.append(task);
    }
    root.append(details);
    function save() {
      if (!storageAvailable) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); status.textContent = 'Draft saved in this browser on this device. Download a backup.'; }
      catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your Python and notes now to keep them.'; }
    }
    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY) {
        storageAvailable = false;
        status.textContent = 'The browser draft changed in another tab. Download this tab’s work before reloading; autosave has stopped here.';
      }
    });
    code.addEventListener('input', () => { draft.code = code.value; save(); });
    codeDownload.addEventListener('click', () => download('student_tasks.py', code.value, 'text/x-python;charset=utf-8'));
    notesDownload.addEventListener('click', () => download('lab04-notes.txt', notesText(material.questions, draft.notes), 'text/plain;charset=utf-8'));
    if (storageAvailable) status.textContent = 'Drafts save in this browser on this device. Download a backup.';
    else if (!status.textContent.includes('could not be read')) status.textContent = 'Browser storage is unavailable. Download your Python and notes to keep them.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
