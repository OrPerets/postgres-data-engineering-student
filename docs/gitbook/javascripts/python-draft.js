/* Browser drafts only: execution and tests happen in the separate Codespace. */
(function () {
  'use strict';
  function parseDraft(value, count) {
    try {
      const d = JSON.parse(value);
      if (!d || typeof d.code !== 'string' || typeof d.sql !== 'string' || !d.notes || typeof d.notes !== 'object' || Array.isArray(d.notes)) return null;
      if (Object.entries(d.notes).some(([k, v]) => !/^[1-9]\d*$/.test(k) || Number(k) > count || typeof v !== 'string')) return null;
      return { code: d.code, sql: d.sql, notes: d.notes };
    } catch (_) { return null; }
  }
  function notesText(questions, notes) {
    return questions.map(q => `Question ${q.id}: ${q.question}\n\n${notes[q.id] || ''}`).join('\n\n---\n\n') + '\n';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseDraft, notesText };
  if (typeof document === 'undefined') return;
  const script = document.currentScript;
  if (!script || !script.src) return;
  function node(tag, cls, text) { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; }
  function download(name, contents, type) {
    const url = URL.createObjectURL(new Blob([contents], {type}));
    const a = node('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function init(number) {
    const root = document.getElementById(`lab${number}-browser-workspace`);
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true'; root.classList.add('python-draft');
    const key = `lab${number}-browser-draft-v1`, count = number === '05' ? 14 : 13;
    const status = node('p', 'python-draft__status', 'Loading the starter file and assignment…');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); root.append(status);
    let material;
    try {
      const url = new URL(`../assets/lab${number}-browser/materials.json`, script.src);
      url.search = new URL(script.src).search;
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) throw new Error('Materials unavailable');
      material = await response.json();
      if (typeof material.starter !== 'string' || !Array.isArray(material.questions) || material.questions.length !== count || material.questions.some((q, i) => q.id !== i + 1 || typeof q.question !== 'string' || typeof q.hint !== 'string')) throw new Error('Invalid materials');
    } catch (_) { status.textContent = 'The browser editor could not load. Reload or use the Codespace workspace below.'; return; }
    let draft = null, storageAvailable = true;
    try { const saved = localStorage.getItem(key); if (saved !== null && !(draft = parseDraft(saved, count))) { storageAvailable = false; status.textContent = 'A saved draft could not be read and has not been overwritten. Download any new work.'; } }
    catch (_) { storageAvailable = false; }
    if (!draft) draft = {code: material.starter, sql: '', notes: {}};
    root.append(node('p', 'python-draft__intro', 'Write and save a draft here. This editor does not run Python, SQL, or tests. Transfer your work to a Codespace to execute it; the drafts do not sync.'));
    const actions = node('div', 'python-draft__actions'); root.append(actions);
    function button(label, run) { const b = node('button', '', label); b.type = 'button'; b.addEventListener('click', run); actions.append(b); }
    button('Download Python', () => download('student_tasks.py', draft.code, 'text/x-python;charset=utf-8'));
    if (number === '06') button('Download SQL', () => download('lab06-answer.sql', draft.sql, 'text/plain;charset=utf-8'));
    button('Download notes', () => download(`lab${number}-notes.txt`, notesText(material.questions, draft.notes), 'text/plain;charset=utf-8'));
    function editor(labelText, id, value, cls, update) {
      const label = node('label', 'python-draft__label', labelText); label.htmlFor = id;
      const area = node('textarea', cls); area.id = id; area.spellcheck = false; area.autocapitalize = 'off'; area.value = value;
      area.addEventListener('input', () => { update(area.value); save(); }); root.append(label, area);
    }
    editor('Your student_tasks.py', `lab${number}-draft-code`, draft.code, 'python-draft__code', value => { draft.code = value; });
    if (number === '06') editor('Your SQL for the PostgreSQL comparison', 'lab06-draft-sql', draft.sql, 'python-draft__sql', value => { draft.sql = value; });
    const details = node('details', 'python-draft__notes'); details.append(node('summary', '', 'Task notes and hints'));
    details.append(node('p', '', 'Keep your explanations with each task. Include all requested material in your report.'));
    for (const q of material.questions) {
      const task = node('section', 'python-draft__task'); task.append(node('h3', '', `Question ${q.id}`), node('p', '', q.question));
      const hint = node('details', 'python-draft__hint'); hint.append(node('summary', '', 'Show hint'), node('p', '', q.hint)); task.append(hint);
      const label = node('label', 'python-draft__label', `Notes for question ${q.id}`); label.htmlFor = `lab${number}-note-${q.id}`;
      const note = node('textarea', 'python-draft__note'); note.id = label.htmlFor; note.value = draft.notes[q.id] || '';
      note.addEventListener('input', () => { draft.notes[q.id] = note.value; save(); }); task.append(label, note); details.append(task);
    }
    root.append(details);
    function save() {
      if (!storageAvailable) return;
      try { localStorage.setItem(key, JSON.stringify(draft)); status.textContent = 'Draft saved in this browser on this device. Download a backup.'; }
      catch (_) { storageAvailable = false; status.textContent = 'Could not save in this browser. Download your work now.'; }
    }
    window.addEventListener('storage', e => { if (e.key === key) { storageAvailable = false; status.textContent = 'The draft changed in another tab. Download this tab’s work before reloading; autosave has stopped here.'; } });
    if (storageAvailable) status.textContent = 'Drafts save in this browser on this device. Download a backup.';
    else if (!status.textContent.includes('could not be read')) status.textContent = 'Browser storage is unavailable. Download your work to keep it.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { init('05'); init('06'); });
  else { init('05'); init('06'); }
}());
