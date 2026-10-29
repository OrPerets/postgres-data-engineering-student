/* Browser-only exploration of the lecture's TF-IDF convention. */
(function () {
  'use strict';
  const corpus = {
    D1: 'data science uses data.',
    D2: 'data engineering builds pipelines.',
    D3: 'science uses experiments.',
    D4: 'engineering uses data pipelines.'
  };
  function tokens(text) { return text.toLowerCase().match(/[a-z0-9]+/g) || []; }
  function score(documentId, term) {
    if (!Object.hasOwn(corpus, documentId)) throw new Error('Unknown document');
    if (!/^[a-z0-9]+$/.test(term)) throw new Error('Choose a normalized term');
    const docTokens = tokens(corpus[documentId]);
    const count = docTokens.filter(token => token === term).length;
    const df = Object.values(corpus).filter(text => tokens(text).includes(term)).length;
    const tf = count / docTokens.length;
    const idf = Math.log((Object.keys(corpus).length + 1) / (df + 1));
    return { count, length: docTokens.length, df, n: Object.keys(corpus).length, tf, idf, value: tf * idf };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { score };
  if (typeof document === 'undefined') return;
  const questions = [
    { q:'A term appears three times in a document of six tokens. What is its normalized TF?', options:['3','0.5','6'], answer:1, why:'TF is the term count divided by document length: 3 / 6 = 0.5.' },
    { q:'A term appears four times in one document and once in another. What is its document frequency?', options:['5','4','2'], answer:2, why:'DF counts distinct documents containing the term, not occurrences.' },
    { q:'With the lab formula ln((N+1)/(df+1)), what is IDF when a term appears in every document?', options:['0','1','N'], answer:0, why:'When df = N, the ratio is 1 and ln(1) = 0. This convention does not add 1 to IDF.' },
    { q:'Why can adding a new document affect existing TF-IDF scores?', options:['It cannot affect existing scores','N and document frequencies may change','Only punctuation changes'], answer:1, why:'IDF uses corpus-wide N and DF, so existing document scores may require recalculation.' },
    { q:'What does the logical MapReduce demonstration establish?', options:['A multi-machine speedup','How records and grouping stages relate','The measured network shuffle cost'], answer:1, why:'The demonstration simulates logical grouping locally; it does not measure a multi-machine cluster or network shuffle.' }
  ];
  function init() {
    const root = document.getElementById('lab06-practice');
    if (!root || root.dataset.ready) return;
    root.dataset.ready = 'true';
    root.innerHTML = `<div class="lab06-panel"><label for="lab06-document">Document</label><select id="lab06-document"><option>D1</option><option>D2</option><option>D3</option><option>D4</option></select><label for="lab06-term">Term</label><select id="lab06-term"><option>data</option><option>science</option><option>engineering</option><option>uses</option><option>experiments</option><option>pipelines</option><option>builds</option></select><p class="lab06-text"></p><p class="lab06-result" role="status" aria-live="polite"></p><p>Absent terms have TF = 0 in this illustration; the lab emits scores only for terms present in a document.</p></div><section class="lab06-quiz" aria-labelledby="lab06-quiz-title"><h2 id="lab06-quiz-title">Check your understanding</h2><p>Five practice questions. Your answers are not saved or submitted.</p><div class="lab06-question"></div></section>`;
    const doc = root.querySelector('#lab06-document'), term = root.querySelector('#lab06-term');
    function renderScore() {
      const v = score(doc.value, term.value);
      root.querySelector('.lab06-text').textContent = `${doc.value}: ${corpus[doc.value]}`;
      root.querySelector('.lab06-result').textContent = `${term.value} in ${doc.value}: count ${v.count}, length ${v.length}, TF ${v.tf.toFixed(4)}; DF ${v.df} of ${v.n}, IDF ln((${v.n}+1)/(${v.df}+1)) = ${v.idf.toFixed(4)}; TF-IDF = ${v.value.toFixed(4)}.`;
    }
    doc.addEventListener('change', renderScore); term.addEventListener('change', renderScore); renderScore();
    const box = root.querySelector('.lab06-question'); let index = 0;
    function renderQuiz(focus) {
      box.replaceChildren();
      if (index === questions.length) {
        const message = document.createElement('p'); message.textContent = 'Practice complete. No answers were saved.'; message.tabIndex = -1;
        const restart = document.createElement('button'); restart.type='button'; restart.textContent='Try again'; restart.addEventListener('click', () => { index=0; renderQuiz(true); }); box.append(message,restart); if (focus) message.focus(); return;
      }
      const q = questions[index], fs = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = `Question ${index+1} of 5: ${q.q}`; legend.tabIndex=-1; fs.append(legend);
      q.options.forEach((option,i) => { const label=document.createElement('label'), input=document.createElement('input'); input.type='radio'; input.name='lab06-answer'; input.value=String(i); label.append(input,document.createTextNode(' '+option)); fs.append(label); });
      const feedback=document.createElement('p'); feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite');
      const check=document.createElement('button'); check.type='button'; check.textContent='Check answer';
      const next=document.createElement('button'); next.type='button'; next.textContent=index===4?'Finish practice':'Next question'; next.disabled=true;
      check.addEventListener('click', () => { const selected=fs.querySelector('input:checked'); if (!selected) { feedback.textContent='Choose an answer first.'; return; } feedback.textContent=(Number(selected.value)===q.answer?'Correct. ':'Not quite. ')+q.why; next.disabled=false; });
      fs.addEventListener('change', () => { feedback.textContent=''; next.disabled=true; });
      next.addEventListener('click', () => { index++; renderQuiz(true); }); box.append(fs,feedback,check,next); if (focus) legend.focus();
    }
    renderQuiz(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
}());
