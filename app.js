(() => {
  'use strict';

  const DATA = window.EXAM_DATA;
  const mode = document.body.dataset.mode === 'teacher' ? 'teacher' : 'student';
  const isTeacher = mode === 'teacher';
  const letters = ['A', 'B', 'C', 'D'];
  const state = {
    activePart: 0,
    highlighter: false,
    dictionary: false,
    fontSize: readNumber(`vstep:${mode}:fontSize`, 18),
    highlights: readSet(`vstep:${mode}:highlights`),
    spokenWord: ''
  };

  const VI_DICTIONARY = {
    job:'công việc', employment:'việc làm', position:'vị trí công việc', application:'đơn ứng tuyển', cv:'sơ yếu lý lịch; CV',
    deadline:'hạn chót', overtime:'làm thêm giờ', promotion:'thăng chức', responsibility:'trách nhiệm', department:'bộ phận',
    flexible:'linh hoạt', salary:'lương', colleague:'đồng nghiệp', colleagues:'các đồng nghiệp', career:'sự nghiệp',
    advancement:'sự thăng tiến', interview:'phỏng vấn', qualified:'đủ năng lực; đủ điều kiện', experience:'kinh nghiệm',
    impression:'ấn tượng', manager:'quản lý', schedule:'lịch làm việc', team:'nhóm', arrangement:'sự sắp xếp; phương án',
    workload:'khối lượng công việc', priority:'ưu tiên', priorities:'các ưu tiên', feedback:'phản hồi', satisfaction:'sự hài lòng',
    respected:'được tôn trọng', conditions:'điều kiện', security:'sự ổn định; an toàn', stable:'ổn định', employer:'nhà tuyển dụng',
    employee:'nhân viên', employees:'nhân viên', professional:'chuyên môn; nghề nghiệp', performance:'hiệu suất', review:'đánh giá',
    goal:'mục tiêu', goals:'các mục tiêu', retain:'giữ chân', resign:'nghỉ việc', accountant:'kế toán', agency:'đại lý; cơ quan',
    architect:'kiến trúc sư', assistant:'trợ lý', athlete:'vận động viên', author:'tác giả', babysitter:'người trông trẻ', baker:'thợ làm bánh',
    advertisement:'mẫu quảng cáo', advertise:'quảng cáo', apply:'nộp đơn', employ:'tuyển dụng', manage:'quản lý', pay:'trả lương; trả tiền',
    promote:'thăng chức; quảng bá', quit:'bỏ việc', unemployed:'thất nghiệp', earnings:'thu nhập', boss:'sếp', retire:'nghỉ hưu',
    resignation:'sự từ chức', bakery:'tiệm bánh', banker:'nhân viên ngân hàng', advertising:'sự quảng cáo', establish:'thành lập',
    export:'xuất khẩu', fire:'sa thải', form:'thành lập; tạo thành', head:'lãnh đạo; đứng đầu', hire:'thuê', import:'nhập khẩu',
    manufacture:'sản xuất', operate:'vận hành', reject:'từ chối', chief:'trưởng; chính', commercial:'thuộc thương mại', industrial:'thuộc công nghiệp',
    manual:'lao động chân tay', skilled:'có kỹ năng', retired:'đã nghỉ hưu', vacant:'bị bỏ trống', workforce:'lực lượng lao động',
    headhunter:'người tuyển dụng cấp cao', burnout:'sự kiệt sức do công việc', entrepreneur:'doanh nhân', evidence:'chứng cứ', script:'kịch bản bài nghe'
  };

  const examRoot = document.getElementById('examRoot');
  const highlightToggle = document.getElementById('highlightToggle');
  const dictionaryToggle = document.getElementById('dictionaryToggle');
  const fontValue = document.getElementById('fontValue');
  const dictionaryPanel = document.getElementById('dictionaryPanel');
  const dictionaryWord = document.getElementById('dictionaryWord');
  const dictionaryMeaning = document.getElementById('dictionaryMeaning');
  const dictionarySpeak = document.getElementById('dictionarySpeak');
  const workspaceBar = document.querySelector('.workspace-bar');
  const toast = document.getElementById('toast');
  let toastTimer;

  function readNumber(key, fallback) {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value >= 16 && value <= 26 ? value : fallback;
    } catch (_) { return fallback; }
  }
  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (_) { return new Set(); }
  }
  function save(key, value) {
    try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
    catch (_) { /* Preferences remain available for this visit. */ }
  }
  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function appendWords(container, text, baseId, offset = 0) {
    const wordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
    let cursor = 0;
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
      container.append(document.createTextNode(text.slice(cursor, match.index)));
      const span = make('span', 'word', match[0]);
      span.dataset.token = `${mode}:${baseId}:${offset + match.index}`;
      if (state.highlights.has(span.dataset.token)) span.classList.add('user-highlight');
      container.append(span);
      cursor = match.index + match[0].length;
    }
    container.append(document.createTextNode(text.slice(cursor)));
  }

  function evidenceRegex(phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]").replace(/\s+/g, '\\s+');
    return new RegExp(escaped, 'i');
  }

  function appendScriptText(container, text, baseId, evidenceList) {
    const ranges = [];
    if (isTeacher) {
      evidenceList.forEach((entry) => {
        if (!entry.text) return;
        const match = evidenceRegex(entry.text).exec(text);
        if (match) ranges.push({ start: match.index, end: match.index + match[0].length, ...entry });
      });
    }
    ranges.sort((a, b) => a.start - b.start);
    let cursor = 0;
    ranges.forEach((range) => {
      if (range.start < cursor) return;
      appendWords(container, text.slice(cursor, range.start), `${baseId}:plain`, cursor);
      const mark = make('mark', `evidence-mark evidence-slot-${range.slot}`);
      mark.dataset.question = String(range.number);
      appendWords(mark, text.slice(range.start, range.end), `${baseId}:evidence:${range.number}`, range.start);
      container.append(mark);
      cursor = range.end;
    });
    appendWords(container, text.slice(cursor), `${baseId}:plain`, cursor);
  }

  function buildQuestion(question, group) {
    const item = make('section', 'question-item');
    item.dataset.question = String(question.number);
    const stem = make('h3', 'question-stem');
    stem.append(make('span', 'question-number', question.number));
    appendWords(stem, question.stem, `${group.id}:q${question.number}:stem`);
    item.append(stem);
    const options = make('div', 'option-list');
    question.options.forEach((option, index) => {
      const label = make('label', 'option-row');
      label.dataset.letter = letters[index];
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${mode}-question-${question.number}`;
      input.value = letters[index];
      input.setAttribute('aria-label', `${option}`);
      label.append(input);
      label.append(make('span', 'option-letter', `${letters[index]}.`));
      const text = make('span', 'option-text');
      appendWords(text, option, `${group.id}:q${question.number}:option${letters[index]}`);
      label.append(text);
      options.append(label);
    });
    item.append(options);
    return item;
  }

  function buildScript(group) {
    const column = make('aside', 'script-column');
    column.hidden = true;
    column.setAttribute('aria-label', `Script ${group.code}`);
    column.append(make('div', 'script-header', `Script · ${group.code}`));
    const evidence = group.questions.map((q, slot) => ({ number: q.number, text: q.evidence || '', slot }));
    group.script.forEach((block, index) => {
      const paragraph = make('p', 'script-block');
      if (block.speaker) paragraph.append(make('span', 'speaker-label', `${block.speaker}: `));
      appendScriptText(paragraph, block.text, `${group.id}:script:${index}`, evidence);
      column.append(paragraph);
    });
    return column;
  }

  function rangeLabel(group) {
    const first = group.questions[0].number;
    const last = group.questions.at(-1).number;
    if (group.type === 'warmup') return `${group.questions.length} items`;
    if (group.type === 'paraphrase') return first === last ? `Paraphrase ${String(first).replace('P','')}` : `Paraphrases ${String(first).replace('P','')}–${String(last).replace('P','')}`;
    return first === last ? `Question ${first}` : `Questions ${first}–${last}`;
  }

  function buildGroup(group) {
    const classes = [`group-card`, `part-${group.part}-card`, `${group.type || 'listening'}-card`];
    if ((group.part === 2 || group.part === 3) && group.type === 'listening') classes.push('sticky-listening-card');
    const card = make('article', classes.join(' '));
    card.dataset.group = group.id;

    const top = make('header', 'group-top');
    const titleBox = make('div', 'group-title-box');
    titleBox.append(make('span', 'group-kicker', rangeLabel(group)), make('h2', 'group-title', group.title));
    if (group.intro) titleBox.append(make('p', group.type === 'warmup' ? 'warmup-intro' : 'group-intro', group.intro));

    if (group.type === 'listening') {
      const audio = document.createElement('audio');
      audio.className = 'audio-player';
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = group.audio;
      audio.setAttribute('aria-label', `Audio ${rangeLabel(group)}`);
      top.append(titleBox, audio);
    } else {
      top.classList.add(group.type === 'warmup' ? 'warmup-top' : 'paraphrase-top');
      top.append(titleBox);
    }
    card.append(top);

    const workspace = make('div', 'group-workspace');
    const questionColumn = make('div', 'question-column');
    group.questions.forEach((question) => questionColumn.append(buildQuestion(question, group)));
    workspace.append(questionColumn);
    if (group.type === 'listening') workspace.append(buildScript(group));
    card.append(workspace);

    const actions = make('footer', 'group-actions');
    const check = make('button', `action-button ${isTeacher ? 'key-button' : 'check-button'}`, isTeacher ? 'Key' : 'Check');
    check.type = 'button';
    check.dataset.action = isTeacher ? 'key' : 'check';
    if (isTeacher) check.setAttribute('aria-pressed', 'false');
    actions.append(check);

    if (group.type === 'listening') {
      const script = make('button', 'action-button script-button', 'Script');
      script.type = 'button'; script.dataset.action = 'script'; script.setAttribute('aria-pressed', 'false');
      actions.append(script);
      if (isTeacher) {
        const evidenceButton = make('button', 'action-button evidence-button', 'Evidence');
        evidenceButton.type = 'button'; evidenceButton.dataset.action = 'evidence'; evidenceButton.setAttribute('aria-pressed', 'false');
        actions.append(evidenceButton);
      }
    }

    const reset = make('button', 'action-button reset-button', 'Reset');
    reset.type = 'button'; reset.dataset.action = 'reset';
    const result = make('output', 'group-result');
    result.setAttribute('aria-live', 'polite');
    actions.append(reset, result);
    card.append(actions);
    return card;
  }

  function buildChallengeBanner(part) {
    const banner = make('div', 'challenge-banner');
    banner.setAttribute('role', 'separator');
    const badge = make('span', 'challenge-badge', 'B2');
    const copy = make('div', 'challenge-copy');
    copy.append(make('strong', '', 'Paraphrase Challenge'), make('span', '', `Fast Finishers · End of Part ${part}`));
    banner.append(badge, copy);
    return banner;
  }

  function renderExam() {
    [0, 1, 2, 3].forEach((part) => {
      const panel = make('section', 'part-panel');
      panel.dataset.partPanel = String(part);
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = part !== state.activePart;
      const labels = { 0: 'Warm-up · Vocabulary Review', 1: 'Part 1 · Short Conversations', 2: 'Part 2 · Conversations', 3: 'Part 3 · Talks' };
      panel.append(make('h2', 'part-heading', labels[part]));
      const groups = DATA.groups.filter((group) => group.part === part);
      if (part === 0) {
        groups.forEach((group) => panel.append(buildGroup(group)));
      } else {
        const listening = groups.filter((group) => group.type !== 'paraphrase');
        const challenges = groups.filter((group) => group.type === 'paraphrase');
        listening.forEach((group) => panel.append(buildGroup(group)));
        if (challenges.length) {
          panel.append(buildChallengeBanner(part));
          challenges.forEach((group) => panel.append(buildGroup(group)));
        }
      }
      examRoot.append(panel);
    });
  }

  function switchPart(part) {
    state.activePart = part;
    document.querySelectorAll('.part-tab').forEach((tab) => {
      const active = Number(tab.dataset.part) === part;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.part-panel').forEach((panel) => { panel.hidden = Number(panel.dataset.partPanel) !== part; });
    document.querySelectorAll('audio').forEach((audio) => audio.pause());
    requestAnimationFrame(syncStickyLayoutHeights);
    window.scrollTo({ top: document.querySelector('.workspace-bar').offsetTop, behavior: 'smooth' });
  }

  function findGroupData(card) { return DATA.groups.find((group) => group.id === card.dataset.group); }

  function checkGroup(card) {
    const group = findGroupData(card);
    let correct = 0;
    let answered = 0;
    group.questions.forEach((question) => {
      const section = card.querySelector(`[data-question="${question.number}"]`);
      const selected = section.querySelector('input:checked');
      section.classList.toggle('answer-missing', !selected);
      section.querySelectorAll('.option-row').forEach((row) => row.classList.remove('answer-correct', 'answer-wrong'));
      if (!selected) return;
      answered += 1;
      const selectedRow = selected.closest('.option-row');
      if (selected.value === question.answer) {
        correct += 1;
        selectedRow.classList.add('answer-correct');
      } else {
        selectedRow.classList.add('answer-wrong');
      }
    });
    const result = card.querySelector('.group-result');
    result.value = answered === group.questions.length ? `${correct}/${group.questions.length} correct` : `${answered}/${group.questions.length} answered · ${correct} correct`;
    showToast(answered === group.questions.length ? `Kết quả: ${correct}/${group.questions.length}` : `Còn ${group.questions.length - answered} câu chưa trả lời`);
  }

  function revealKey(card) {
    const group = findGroupData(card);
    card.querySelectorAll('.answer-correct, .answer-wrong, .answer-missing').forEach((element) => element.classList.remove('answer-correct', 'answer-wrong', 'answer-missing'));
    group.questions.forEach((question) => {
      const section = card.querySelector(`.question-item[data-question="${question.number}"]`);
      section.querySelector(`[data-letter="${question.answer}"]`).classList.add('answer-correct');
    });
    const keyButton = card.querySelector('.key-button');
    keyButton.setAttribute('aria-pressed', 'true');
    card.querySelector('.group-result').value = group.questions.map((question) => `${question.number}${question.answer}`).join(' · ');
    showToast('Đã hiển thị đáp án');
  }

  function toggleScript(card, forceOpen = null) {
    const column = card.querySelector('.script-column');
    const button = card.querySelector('.script-button');
    if (!column || !button) return;
    const open = forceOpen === null ? column.hidden : forceOpen;
    column.hidden = !open;
    card.classList.toggle('script-open', open);
    button.setAttribute('aria-pressed', String(open));
    requestAnimationFrame(() => syncCardTopHeight(card));
  }

  function toggleEvidence(card) {
    const button = card.querySelector('.evidence-button');
    if (!button) return;
    const on = !card.classList.contains('evidence-on');
    card.classList.toggle('evidence-on', on);
    button.setAttribute('aria-pressed', String(on));
    if (on) toggleScript(card, true);
  }

  function resetGroup(card) {
    card.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
    card.querySelectorAll('.answer-correct, .answer-wrong, .answer-missing').forEach((element) => element.classList.remove('answer-correct', 'answer-wrong', 'answer-missing'));
    card.querySelector('.group-result').value = '';
    const keyButton = card.querySelector('.key-button');
    if (keyButton) keyButton.setAttribute('aria-pressed', 'false');
    showToast('Đã đặt lại nhóm câu hỏi');
  }

  function syncCardTopHeight(card) {
    if (!card.classList.contains('sticky-listening-card')) return;
    const top = card.querySelector('.group-top');
    card.style.setProperty('--group-top-height', `${Math.ceil(top.getBoundingClientRect().height)}px`);
  }
  function syncStickyLayoutHeights() {
    document.documentElement.style.setProperty('--workspace-bar-height', `${Math.ceil(workspaceBar.getBoundingClientRect().height)}px`);
    document.querySelectorAll('.sticky-listening-card').forEach(syncCardTopHeight);
  }

  function toggleTool(kind) {
    const isHighlight = kind === 'highlight';
    const next = isHighlight ? !state.highlighter : !state.dictionary;
    if (isHighlight) {
      state.highlighter = next;
      document.body.classList.toggle('highlight-mode', next);
      highlightToggle.setAttribute('aria-pressed', String(next));
    } else {
      state.dictionary = next;
      document.body.classList.toggle('dictionary-mode', next);
      dictionaryToggle.setAttribute('aria-pressed', String(next));
      if (!next) dictionaryPanel.hidden = true;
    }
  }

  function normalizeWord(word) { return word.toLowerCase().replace(/’/g, "'").replace(/'s$/, ''); }
  function localMeaning(word) {
    const normalized = normalizeWord(word);
    if (VI_DICTIONARY[normalized]) return VI_DICTIONARY[normalized];
    const variants = [];
    if (normalized.endsWith('ies')) variants.push(`${normalized.slice(0, -3)}y`);
    if (normalized.endsWith('ing')) variants.push(normalized.slice(0, -3), `${normalized.slice(0, -3)}e`);
    if (normalized.endsWith('ed')) variants.push(normalized.slice(0, -2), `${normalized.slice(0, -1)}`);
    if (normalized.endsWith('es')) variants.push(normalized.slice(0, -2));
    if (normalized.endsWith('s')) variants.push(normalized.slice(0, -1));
    return variants.map((variant) => VI_DICTIONARY[variant]).find(Boolean) || '';
  }

  async function openDictionary(word) {
    state.spokenWord = word;
    dictionaryPanel.hidden = false;
    dictionaryWord.textContent = word;
    const local = localMeaning(word);
    if (local) { dictionaryMeaning.textContent = local; return; }
    const cacheKey = `vstep:dictionary:${normalizeWord(word)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { dictionaryMeaning.textContent = cached; return; }
    } catch (_) { /* Continue with online lookup. */ }
    dictionaryMeaning.textContent = 'Đang tra nghĩa…';
    try {
      const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('dictionary');
      const payload = await response.json();
      const meaning = payload?.responseData?.translatedText?.trim();
      if (!meaning) throw new Error('dictionary');
      dictionaryMeaning.textContent = meaning;
      try { sessionStorage.setItem(cacheKey, meaning); } catch (_) { /* Ignore cache limits. */ }
    } catch (_) { dictionaryMeaning.textContent = 'Không thể kết nối từ điển lúc này.'; }
  }

  function speak(word) {
    if (!word || !('speechSynthesis' in window)) { showToast('Trình duyệt chưa hỗ trợ phát âm'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US'; utterance.rate = .82; window.speechSynthesis.speak(utterance);
  }

  function changeFont(delta) {
    state.fontSize = Math.min(26, Math.max(16, state.fontSize + delta));
    document.documentElement.style.setProperty('--content-size', `${state.fontSize}px`);
    fontValue.value = String(state.fontSize);
    save(`vstep:${mode}:fontSize`, String(state.fontSize));
  }
  function showToast(message) {
    toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  renderExam();
  changeFont(0);
  syncStickyLayoutHeights();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(syncStickyLayoutHeights);
    ro.observe(workspaceBar);
    document.querySelectorAll('.sticky-listening-card .group-top').forEach((top) => ro.observe(top));
  }
  window.addEventListener('resize', syncStickyLayoutHeights);

  document.querySelector('.part-tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('.part-tab');
    if (tab) switchPart(Number(tab.dataset.part));
  });

  examRoot.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) {
      const card = action.closest('.group-card');
      if (action.dataset.action === 'check') checkGroup(card);
      if (action.dataset.action === 'key') revealKey(card);
      if (action.dataset.action === 'script') toggleScript(card);
      if (action.dataset.action === 'evidence') toggleEvidence(card);
      if (action.dataset.action === 'reset') resetGroup(card);
      return;
    }
    const word = event.target.closest('.word');
    if (!word) return;
    if (state.highlighter) {
      word.classList.toggle('user-highlight');
      if (word.classList.contains('user-highlight')) state.highlights.add(word.dataset.token);
      else state.highlights.delete(word.dataset.token);
      save(`vstep:${mode}:highlights`, [...state.highlights]);
    }
    if (state.dictionary) openDictionary(word.textContent);
  });

  highlightToggle.addEventListener('click', () => toggleTool('highlight'));
  dictionaryToggle.addEventListener('click', () => toggleTool('dictionary'));
  document.getElementById('fontDecrease').addEventListener('click', () => changeFont(-1));
  document.getElementById('fontIncrease').addEventListener('click', () => changeFont(1));
  document.getElementById('dictionaryClose').addEventListener('click', () => { dictionaryPanel.hidden = true; });
  dictionarySpeak.addEventListener('click', () => speak(state.spokenWord));

  examRoot.addEventListener('play', (event) => {
    if (!(event.target instanceof HTMLAudioElement)) return;
    document.querySelectorAll('audio').forEach((audio) => { if (audio !== event.target) audio.pause(); });
  }, true);

  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') dictionaryPanel.hidden = true; });
})();
