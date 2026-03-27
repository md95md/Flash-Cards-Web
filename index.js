import { loadDecks, saveDeck, deleteDeckFromDB } from './firebase.js';
import { translations } from './lang.js';

let lang = 'en';
export function t(key) {
  return translations[lang][key] || key;
}

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'es', label: 'ES' },
];
let langIndex = 0;

function cycleLang() {
  langIndex = (langIndex + 1) % langs.length;
  const current = langs[langIndex];
  lang = current.code;
  document.getElementById('lang-label').textContent = current.label;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  const active = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (active === 'study') renderStudyDecks();
  if (active === 'decks') renderDecks();
  if (active === 'stats') renderStats();
}
window.cycleLang = cycleLang;

// ─── State ────────────────────────────────────────────────────────────────────

let decks = [];
let selectedDeckId = null;
let selectedCardIdx = null;
let editingCardIdx = null;
let currentStudyDeckId = null;
let currentReviewMode = false;
let isFlipped = false;
let cardSequence = [];
let cardSequenceIndex = 0;

// ─── Init ─────────────────────────────────────────────────────────────────────

loadDecks().then(data => {
  decks = data;
  renderStudyDecks();
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'stats') renderStats();
  if (tab === 'decks') renderDecks();
  if (tab === 'study') renderStudyDecks();
}

// ─── Deck list ────────────────────────────────────────────────────────────────

function renderDecks() {
  const list = document.getElementById('decks-list');
  list.innerHTML = '';

  decks.forEach(deck => {
    const div = document.createElement('div');
    div.className = 'deck-card' + (selectedDeckId === deck.id ? ' selected' : '');
    div.onclick = () => selectDeck(deck.id);

    const count = document.createElement('div');
    count.className = 'deck-count';
    count.textContent = deck.cards.length;

    const name = document.createElement('div');
    name.className = 'deck-name';
    name.textContent = deck.name;

    const progress = document.createElement('div');
    progress.className = 'deck-progress';
    progress.textContent = deck.cards.filter(c => c.correct > 0).length + ' ' + t('learned_count');

    div.append(count, name, progress);
    list.appendChild(div);
  });

  renderDeckControls();
}

function selectDeck(id) {
  selectedDeckId = selectedDeckId === id ? null : id;
  selectedCardIdx = null;
  editingCardIdx = null;
  renderDecks();
}

function renderDeckControls() {
  const controls = document.getElementById('deck-controls');
  const noDeck = document.getElementById('no-deck-selected');
  const deleteDeckBtn = document.getElementById('delete-deck-btn');

  if (!selectedDeckId) {
    controls.style.display = 'none';
    noDeck.style.display = 'block';
    deleteDeckBtn.style.display = 'none';
    return;
  }

  controls.style.display = 'block';
  noDeck.style.display = 'none';
  deleteDeckBtn.style.display = 'block';

  const deck = decks.find(d => d.id === selectedDeckId);
  const toolbar = document.getElementById('card-toolbar');
  toolbar.innerHTML = '';

  if (selectedCardIdx !== null && selectedCardIdx < deck.cards.length) {
    const editBtn = document.createElement('button');
    editBtn.textContent = t('edit_card_btn');
    editBtn.onclick = showEditCardForm;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = t('delete_card_btn');
    delBtn.onclick = deleteSelectedCard;

    toolbar.append(editBtn, delBtn);
  } else {
    selectedCardIdx = null;
    const addBtn = document.createElement('button');
    addBtn.textContent = t('add_card_btn');
    addBtn.onclick = showAddCardForm;
    toolbar.appendChild(addBtn);
  }

  renderCardsList(deck);
}

function renderCardsList(deck) {
  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'cards-list-wrapper';

  const heading = document.createElement('h4');
  heading.textContent = t('cards_in_deck');
  wrapper.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  deck.cards.forEach((card, idx) => {
    const item = document.createElement('div');
    item.className = 'card-list-item' + (selectedCardIdx === idx ? ' card-selected' : '');
    item.onclick = () => selectCard(idx);

    const text = document.createElement('span');
    const q = document.createElement('strong');
    q.textContent = card.question;
    text.append(q, ' — ' + card.answer);
    item.appendChild(text);
    grid.appendChild(item);
  });

  wrapper.appendChild(grid);
  cardsList.appendChild(wrapper);
}

// ─── Card selection / edit / delete ──────────────────────────────────────────

function selectCard(idx) {
  selectedCardIdx = selectedCardIdx === idx ? null : idx;
  editingCardIdx = null;
  document.getElementById('add-card-form').style.display = 'none';
  renderDeckControls();
}

function deleteSelectedCard() {
  if (selectedCardIdx === null) return;
  const deck = decks.find(d => d.id === selectedDeckId);
  deck.cards.splice(selectedCardIdx, 1);
  selectedCardIdx = null;
  saveDeck(deck);
  renderDeckControls();
}

function showEditCardForm() {
  if (selectedCardIdx === null) return;
  const deck = decks.find(d => d.id === selectedDeckId);
  const card = deck.cards[selectedCardIdx];
  editingCardIdx = selectedCardIdx;

  document.getElementById('questionInput').value = card.question;
  document.getElementById('answerInput').value = card.answer;
  document.getElementById('card-form-title').textContent = t('edit_card_btn');

  const submitBtn = document.getElementById('card-form-submit');
  submitBtn.textContent = t('save');
  submitBtn.onclick = saveEditCard;

  document.getElementById('add-card-form').style.display = 'block';
}

function saveEditCard() {
  const question = document.getElementById('questionInput').value.trim();
  const answer = document.getElementById('answerInput').value.trim();

  if (!question || !answer) {
    alert(t('enter_question_answer'));
    return;
  }

  const deck = decks.find(d => d.id === selectedDeckId);
  deck.cards[editingCardIdx].question = question;
  deck.cards[editingCardIdx].answer = answer;

  editingCardIdx = null;
  selectedCardIdx = null;
  saveDeck(deck);
  hideAddCardForm();
  renderDeckControls();
}

// ─── Deck create / delete ─────────────────────────────────────────────────────

function showCreateDeckForm() {
  document.getElementById('create-deck-form').style.display = 'block';
}

function hideDeckForm() {
  document.getElementById('create-deck-form').style.display = 'none';
  document.getElementById('deckNameInput').value = '';
  document.getElementById('deckDescInput').value = '';
}

function createDeck() {
  const name = document.getElementById('deckNameInput').value.trim();
  const desc = document.getElementById('deckDescInput').value.trim();

  if (!name) {
    alert(t('deck_name'));
    return;
  }

  const newDeck = { id: Date.now(), name, description: desc, cards: [] };
  decks.push(newDeck);
  saveDeck(newDeck);
  renderDecks();
  hideDeckForm();
}

let confirmCallback = null;

function deleteDeck() {
  const dialog = document.getElementById('confirm-dialog');
  dialog.style.display = 'flex';
  confirmCallback = () => {
    const id = selectedDeckId;
    decks = decks.filter(d => d.id !== id);
    selectedDeckId = null;
    deleteDeckFromDB(id);
    renderDecks();
  };
}

function confirmYes() {
  document.getElementById('confirm-dialog').style.display = 'none';
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
}

function confirmNo() {
  document.getElementById('confirm-dialog').style.display = 'none';
  confirmCallback = null;
}

// ─── Card form ────────────────────────────────────────────────────────────────

function showAddCardForm() {
  if (!selectedDeckId) {
    alert(t('select_deck'));
    return;
  }
  editingCardIdx = null;
  document.getElementById('questionInput').value = '';
  document.getElementById('answerInput').value = '';
  document.getElementById('card-form-title').textContent = t('add_card_btn');

  const submitBtn = document.getElementById('card-form-submit');
  submitBtn.textContent = t('add_card_btn');
  submitBtn.onclick = addCard;

  document.getElementById('add-card-form').style.display = 'block';
}

function hideAddCardForm() {
  document.getElementById('add-card-form').style.display = 'none';
  document.getElementById('questionInput').value = '';
  document.getElementById('answerInput').value = '';
}

function addCard() {
  const question = document.getElementById('questionInput').value.trim();
  const answer = document.getElementById('answerInput').value.trim();

  if (!question || !answer) {
    alert('Введите вопрос и ответ');
    return;
  }

  const deck = decks.find(d => d.id === selectedDeckId);
  deck.cards.push({ id: Date.now(), question, answer, correct: 0, total: 0 });

  saveDeck(deck);
  hideAddCardForm();
  renderDeckControls();
}

// ─── Study mode ───────────────────────────────────────────────────────────────

function buildCardSequence(deckId) {
  const deck = decks.find(d => d.id === deckId);
  cardSequence = [];

  for (let i = 0; i < deck.cards.length; i++) {
    const card = deck.cards[i];
    if (currentReviewMode) {
      if (card.correct > 0) cardSequence.push(i);
    } else {
      if (card.correct === 0) cardSequence.push(i);
    }
  }

  if (cardSequence.length === 0) {
    cardSequence = deck.cards.map((_, i) => i);
  }

  for (let i = cardSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardSequence[i], cardSequence[j]] = [cardSequence[j], cardSequence[i]];
  }
}

function renderStudyDecks() {
  const container = document.getElementById('study-content');
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'study-decks-grid';

  decks.forEach(deck => {
    const hasCards = deck.cards.length > 0;
    const allLearned = hasCards && deck.cards.every(c => c.correct > 0);

    const item = document.createElement('div');
    item.className = 'deck-item';

    const info = document.createElement('div');
    info.className = 'deck-item-info';

    const title = document.createElement('div');
    title.className = 'deck-item-title';
    title.textContent = deck.name;

    const stats = document.createElement('div');
    stats.className = 'deck-item-stats';
    stats.textContent = deck.cards.length + ' ' + t('cards_count');

    info.append(title, stats);

    const actions = document.createElement('div');
    actions.className = 'deck-actions';

    if (!hasCards) {
      const noCards = document.createElement('span');
      noCards.className = 'no-cards-label';
      noCards.textContent = t('no_cards');
      actions.appendChild(noCards);
    } else {
      if (!allLearned) {
        const learnBtn = document.createElement('button');
        learnBtn.className = 'btn-primary';
        learnBtn.textContent = 'Учить';
        learnBtn.onclick = () => startStudy(deck.id);
        actions.appendChild(learnBtn);
      } else {
        const doneBtn = document.createElement('button');
        doneBtn.textContent = t('deck_complete_btn');
        actions.appendChild(doneBtn);
      }

      const reviewBtn = document.createElement('button');
      reviewBtn.className = 'btn-primary';
      reviewBtn.textContent = '↺';
      reviewBtn.onclick = () => startStudy(deck.id, true);
      actions.appendChild(reviewBtn);
    }

    item.append(info, actions);
    grid.appendChild(item);
  });

  container.appendChild(grid);
}

function startStudy(deckId, reviewMode = false) {
  currentStudyDeckId = deckId;
  currentReviewMode = reviewMode;

  const deck = decks.find(d => d.id === deckId);
  if (!deck || deck.cards.length === 0) {
    alert(t('no_cards'));
    return;
  }

  buildCardSequence(deckId);
  cardSequenceIndex = 0;
  isFlipped = false;
  renderStudyMode();
}

function renderStudyMode() {
  const container = document.getElementById('study-content');
  container.innerHTML = '';

  const deck = decks.find(d => d.id === currentStudyDeckId);

  if (!deck || deck.cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('no_cards_in_deck');
    container.appendChild(empty);
    return;
  }

  if (cardSequenceIndex >= cardSequence.length) {
    const panel = document.createElement('div');
    panel.className = 'panel-center';

    const h2 = document.createElement('h2');
    h2.textContent = t('deck_complete_btn');

    const p = document.createElement('p');
    p.textContent = t('deck_done_sub');

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-primary';
    backBtn.textContent = t('back');
    backBtn.onclick = () => switchTab('study');

    panel.append(h2, p, backBtn);
    container.appendChild(panel);
    return;
  }

  const currentCardIdx = cardSequence[cardSequenceIndex];
  const currentCard = deck.cards[currentCardIdx];
  const learnedCount = deck.cards.filter(c => c.correct > 0).length;
  const totalCount = deck.cards.length;
  const progress = Math.round((learnedCount / totalCount) * 100);

  // Header
  const header = document.createElement('div');
  header.className = 'study-header';

  const headerTop = document.createElement('div');
  headerTop.className = 'study-header-top';

  const titleEl = document.createElement('div');
  titleEl.className = 'study-title';
  titleEl.textContent = deck.name;

  const pct = document.createElement('div');
  pct.className = 'progress-percent';
  pct.textContent = progress + '%';

  headerTop.append(titleEl, pct);

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.width = progress + '%';
  progressBar.appendChild(progressFill);

  header.append(headerTop, progressBar);

  // Flashcard
  const cardContainer = document.createElement('div');
  cardContainer.className = 'card-container';

  const flashcard = document.createElement('div');
  flashcard.className = 'flashcard' + (isFlipped ? ' flipped' : '');
  flashcard.onclick = toggleFlip;

  const front = document.createElement('div');
  front.className = 'flashcard-content';
  const frontLabel = document.createElement('div');
  frontLabel.className = 'card-label';
  frontLabel.textContent = t('question');
  const frontText = document.createElement('div');
  frontText.className = 'card-text';
  frontText.textContent = currentCard.question;
  front.append(frontLabel, frontText);

  const back = document.createElement('div');
  back.className = 'flashcard-content flashcard-back';
  const backLabel = document.createElement('div');
  backLabel.className = 'card-label';
  backLabel.textContent = t('answer');
  const backText = document.createElement('div');
  backText.className = 'card-text';
  backText.textContent = currentCard.answer;
  back.append(backLabel, backText);

  flashcard.append(front, back);
  cardContainer.appendChild(flashcard);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'controls';

  const wrongBtn = document.createElement('button');
wrongBtn.textContent = t('dont_know');
  wrongBtn.onclick = markWrong;

  const correctBtn = document.createElement('button');
  correctBtn.className = 'btn-primary';
correctBtn.textContent = t('know');
  correctBtn.onclick = markCorrect;

  controls.append(wrongBtn, correctBtn);

  const exitWrap = document.createElement('div');
  exitWrap.className = 'exit-wrap';
  const exitBtn = document.createElement('button');
  exitBtn.textContent = t('exit');
  exitBtn.onclick = exitStudy;
  exitWrap.appendChild(exitBtn);

  container.append(header, cardContainer, controls, exitWrap);
}

function toggleFlip() {
  isFlipped = !isFlipped;
  renderStudyMode();
}

function markCorrect() {
  const idx = cardSequence[cardSequenceIndex];
  const deck = decks.find(d => d.id === currentStudyDeckId);
  deck.cards[idx].correct++;
  deck.cards[idx].total++;
  saveDeck(deck);
  nextCard();
}

function markWrong() {
  const idx = cardSequence[cardSequenceIndex];
  const deck = decks.find(d => d.id === currentStudyDeckId);
  deck.cards[idx].total++;
  saveDeck(deck);
  cardSequence.push(idx);
  nextCard();
}

function nextCard() {
  cardSequenceIndex++;
  isFlipped = false;
  renderStudyMode();
}

function exitStudy() {
  switchTab('study');
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function renderStats() {
  const container = document.getElementById('stats-content');
  container.innerHTML = '';

  const deckList = document.createElement('div');
 deckList.className = 'decks-grid';

  decks.forEach(deck => {
    const learned = deck.cards.filter(c => c.correct > 0).length;
    const total = deck.cards.length;
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'deck-card';

    const name = document.createElement('div');
    name.className = 'deck-name';
    name.textContent = deck.name;

    const percent = document.createElement('div');
    percent.className = 'stat-deck-percent';
    percent.textContent = pct + '%';

    const count = document.createElement('div');
    count.className = 'stat-deck-count';
    count.textContent = learned + '/' + total + ' ' + t('learned_count');

    card.append(name, percent, count);
    deckList.appendChild(card);
  });

  container.appendChild(deckList);
}

// ─── Expose to window (required for onclick in HTML with type="module") ───────

window.switchTab = switchTab;
window.showCreateDeckForm = showCreateDeckForm;
window.hideDeckForm = hideDeckForm;
window.createDeck = createDeck;
window.deleteDeck = deleteDeck;
window.showAddCardForm = showAddCardForm;
window.hideAddCardForm = hideAddCardForm;
window.addCard = addCard;
window.confirmYes = confirmYes;
window.confirmNo = confirmNo;