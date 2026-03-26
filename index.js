let decks = JSON.parse(localStorage.getItem('flashcards_decks')) || [
  {
    id: 1,
    name: 'Английский язык',
    description: 'Базовый словарь',
    cards: [
      { id: 1, question: 'Привет', answer: 'Hello', correct: 0, total: 0 },
      { id: 2, question: 'Спасибо', answer: 'Thank you', correct: 0, total: 0 },
      { id: 3, question: 'Пожалуйста', answer: 'Please', correct: 0, total: 0 }
    ]
  },
  {
    id: 2,
    name: 'Математика',
    description: 'Формулы и теоремы',
    cards: [
      { id: 1, question: 'Площадь круга', answer: 'πr²', correct: 0, total: 0 }
    ]
  }
];

let selectedDeckId = null;
let selectedCardIdx = null;
let editingCardIdx = null;
let currentStudyDeckId = null;
let currentCardIndex = 0;
let isFlipped = false;
let cardSequence = [];
let cardSequenceIndex = 0;

function saveToLocalStorage() {
  localStorage.setItem('flashcards_decks', JSON.stringify(decks));
}

function switchTab(tab) {
  document.querySelectorAll('.content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
  
  if (tab === 'stats') renderStats();
  if (tab === 'decks') renderDecks();
  if (tab === 'study') renderStudyDecks();
}

function renderDecks() {
  const list = document.getElementById('decks-list');
  list.innerHTML = decks.map(deck => `
    <div class="deck-card ${selectedDeckId === deck.id ? 'selected' : ''}" onclick="selectDeck(${deck.id})">
      <div class="deck-count">${deck.cards.length}</div>
      <div class="deck-name">${deck.name}</div>
      <div class="deck-progress">${deck.cards.filter(c => c.correct > 0).length} выучено</div>
    </div>
  `).join('');
  
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
  
  if (!selectedDeckId) {
    controls.style.display = 'none';
    noDeck.style.display = 'block';
    document.getElementById('delete-deck-btn').style.display = 'none';
    return;
  }
  
  controls.style.display = 'block';
  noDeck.style.display = 'none';
  document.getElementById('delete-deck-btn').style.display = 'block';
  
  const deck = decks.find(d => d.id === selectedDeckId);

  // Toolbar: changes depending on whether a card is selected
  const toolbar = document.getElementById('card-toolbar');
  if (selectedCardIdx !== null && selectedCardIdx < deck.cards.length) {
    toolbar.innerHTML = `
      <button onclick="showEditCardForm()">Редактировать</button>
      <button class="btn-danger" onclick="deleteSelectedCard()">Удалить</button>
    `;
  } else {
    selectedCardIdx = null;
    toolbar.innerHTML = `
      <button onclick="showAddCardForm()">+ Добавить карточку</button>
    `;
  }

  const cardsList = document.getElementById('cards-list');
  cardsList.innerHTML = `
    <div style="border-top: 1px solid #e0e0e0; padding-top: 1rem;">
      <h4>Карточки в колоде:</h4>
      <div style="display: grid; gap: 0.5rem;">
        ${deck.cards.map((card, idx) => `
          <div class="card-list-item ${selectedCardIdx === idx ? 'card-selected' : ''}" onclick="selectCard(${idx})">
            <span><strong>${card.question}</strong> — ${card.answer}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

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
  saveToLocalStorage();
  renderDeckControls();
}

function showEditCardForm() {
  if (selectedCardIdx === null) return;
  const deck = decks.find(d => d.id === selectedDeckId);
  const card = deck.cards[selectedCardIdx];
  editingCardIdx = selectedCardIdx;

  document.getElementById('questionInput').value = card.question;
  document.getElementById('answerInput').value = card.answer;
  document.getElementById('card-form-title').textContent = 'Редактировать карточку';
  document.getElementById('card-form-submit').textContent = 'Сохранить';
  document.getElementById('card-form-submit').setAttribute('onclick', 'saveEditCard()');
  document.getElementById('add-card-form').style.display = 'block';
}

function saveEditCard() {
  const question = document.getElementById('questionInput').value.trim();
  const answer = document.getElementById('answerInput').value.trim();

  if (!question || !answer) {
    alert('Введите вопрос и ответ');
    return;
  }

  const deck = decks.find(d => d.id === selectedDeckId);
  deck.cards[editingCardIdx].question = question;
  deck.cards[editingCardIdx].answer = answer;

  editingCardIdx = null;
  selectedCardIdx = null;
  saveToLocalStorage();
  renderDeckControls();
  hideAddCardForm();
}

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
    alert('Введите название колоды');
    return;
  }
  
  const newDeck = {
    id: Date.now(),
    name,
    description: desc,
    cards: []
  };
  
  decks.push(newDeck);
  saveToLocalStorage();
  renderDecks();
  hideDeckForm();
}

function showAddCardForm() {
  if (!selectedDeckId) {
    alert('Выберите колоду');
    return;
  }
  editingCardIdx = null;
  document.getElementById('questionInput').value = '';
  document.getElementById('answerInput').value = '';
  document.getElementById('card-form-title').textContent = 'Добавить карточку';
  document.getElementById('card-form-submit').textContent = 'Добавить';
  document.getElementById('card-form-submit').setAttribute('onclick', 'addCard()');
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
  deck.cards.push({
    id: Date.now(),
    question,
    answer,
    correct: 0,
    total: 0
  });
  
  saveToLocalStorage();
  renderDeckControls();
  hideAddCardForm();
}

function deleteDeck() {
  if (confirm('Удалить колоду?')) {
    decks = decks.filter(d => d.id !== selectedDeckId);
    selectedDeckId = null;
    saveToLocalStorage();
    renderDecks();
  }
}

function buildCardSequence(deckId) {
  const deck = decks.find(d => d.id === deckId);
  cardSequence = [];
  
  for (let i = 0; i < deck.cards.length; i++) {
    if (deck.cards[i].correct === 0) {
      cardSequence.push(i);
    }
  }
  
  for (let i = cardSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardSequence[i], cardSequence[j]] = [cardSequence[j], cardSequence[i]];
  }
}

function renderStudyDecks() {
  let html = `<h2 style="margin-bottom: 1.5rem;">Выберите колоду для учёбы</h2>
    <div style="display: grid; gap: 0.75rem;">`;
  
  html += decks.map(deck => {
    const hasCards = deck.cards.length > 0;
    const allLearned = hasCards && deck.cards.every(c => c.correct > 0);
    let actionHTML;
    if (!hasCards) {
      actionHTML = '<span style="color: #8b8da3; font-size: 12px;">Нет карточек</span>';
    } else if (allLearned) {
      actionHTML = '<span style="color: #27ae60; font-size: 12px; font-weight: 500;">Колода выучена ✓</span>';
    } else {
      actionHTML = `<button class="btn-primary" onclick="startStudy(${deck.id})">Учить →</button>`;
    }
    return `
      <div class="deck-item">
        <div class="deck-item-info">
          <div class="deck-item-title">${deck.name}</div>
          <div class="deck-item-stats">${deck.cards.length} карточек</div>
        </div>
        ${actionHTML}
      </div>
    `;
  }).join('');
  
  html += '</div>';
  document.getElementById('study-content').innerHTML = html;
}

function startStudy(deckId) {
  currentStudyDeckId = deckId;
  const deck = decks.find(d => d.id === deckId);
  
  if (!deck) {
    alert('Колода не найдена');
    return;
  }
  
  if (deck.cards.length === 0) {
    alert('В этой колоде нет карточек');
    return;
  }
  
  buildCardSequence(deckId);
  cardSequenceIndex = 0;
  isFlipped = false;
  renderStudyMode();
}

function renderStudyMode() {
  const deck = decks.find(d => d.id === currentStudyDeckId);
  
  if (!deck || deck.cards.length === 0) {
    document.getElementById('study-content').innerHTML = '<div class="empty-state"><p>В этой колоде нет карточек</p></div>';
    return;
  }
  
  if (cardSequenceIndex >= cardSequence.length) {
    document.getElementById('study-content').innerHTML = `
      <div class="panel" style="text-align: center; padding: 2rem;">
        <h2 style="margin-bottom: 1rem;">Колода завершена!</h2>
        <p style="margin-bottom: 1.5rem; color: #555770;">Отлично! Вы прошли все карточки.</p>
        <button class="btn-primary" onclick="switchTab('study')">← Вернуться</button>
      </div>
    `;
    return;
  }
  
  const currentCardIdx = cardSequence[cardSequenceIndex];
  const currentCard = deck.cards[currentCardIdx];
  const learnedCount = deck.cards.filter(c => c.correct > 0).length;
  const totalCount = deck.cards.length;
  const progress = Math.round((learnedCount / totalCount) * 100);
  
  let studyHTML = `
    <div class="study-header">
      <div class="study-header-top">
        <div>
          <div class="study-title">${deck.name}</div>
        </div>
        <div class="progress-percent">${progress}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
    </div>
    
    <div class="card-container">
      <div class="flashcard ${isFlipped ? 'flipped' : ''}" onclick="toggleFlip()">
        <div class="flashcard-content">
          <div class="card-label">Вопрос</div>
          <div class="card-text">${currentCard.question}</div>
        </div>
        <div class="flashcard-content flashcard-back">
          <div class="card-label">Ответ</div>
          <div class="card-text">${currentCard.answer}</div>
        </div>
      </div>
    </div>
    
    <div class="controls">
      <button onclick="markWrong()">Не знаю ✕</button>
      <button class="btn-primary" onclick="markCorrect()">Знаю ✓</button>
    </div>
    
    <div style="text-align: center; margin-top: 1rem;">
      <button onclick="exitStudy()">← Выход</button>
    </div>
  `;
  
  document.getElementById('study-content').innerHTML = studyHTML;
}

function toggleFlip() {
  isFlipped = !isFlipped;
  renderStudyMode();
}

function markCorrect() {
  const currentCardIdx = cardSequence[cardSequenceIndex];
  const deck = decks.find(d => d.id === currentStudyDeckId);
  deck.cards[currentCardIdx].correct++;
  deck.cards[currentCardIdx].total++;
  saveToLocalStorage();
  nextCard();
}

function markWrong() {
  const currentCardIdx = cardSequence[cardSequenceIndex];
  const deck = decks.find(d => d.id === currentStudyDeckId);
  deck.cards[currentCardIdx].total++;
  saveToLocalStorage();
  // Add this card back to the end so it appears again
  cardSequence.push(currentCardIdx);
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

function renderStats() {
  const stats = {
    totalCards: decks.reduce((sum, d) => sum + d.cards.length, 0),
    totalReviewed: decks.reduce((sum, d) => sum + d.cards.filter(c => c.total > 0).length, 0),
    totalLearned: decks.reduce((sum, d) => sum + d.cards.filter(c => c.correct > 0).length, 0)
  };
  
  const accuracy = stats.totalCards > 0 ? Math.round((stats.totalLearned / stats.totalCards) * 100) : 0;
  
  let statsHTML = `
    <h2 style="margin-bottom: 1.5rem;">Ваша статистика</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Всего карточек</div>
        <div class="stat-value">${stats.totalCards}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Просмотрено</div>
        <div class="stat-value">${stats.totalReviewed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Правильно</div>
        <div class="stat-value">${stats.totalLearned}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Точность</div>
        <div class="stat-value">${accuracy}%</div>
      </div>
    </div>
    
    <h3 style="margin-top: 2rem;">По колодам</h3>
    <div style="display: grid; gap: 0.75rem;">
      ${decks.map(deck => {
        const learned = deck.cards.filter(c => c.correct > 0).length;
        const total = deck.cards.length;
        const reviewed = deck.cards.filter(c => c.total > 0).length;
        return `
          <div class="deck-item">
            <div class="deck-item-info">
              <div class="deck-item-title">${deck.name}</div>
              <div class="deck-item-stats">${learned} из ${total} выучено • ${reviewed} просмотрено</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  document.getElementById('stats-content').innerHTML = statsHTML;
}

// Start on Study tab by default
renderStudyDecks();