// ===== Konfiguracja realistycznych wyników + komunikacja =====
const TEAM_SIZE = 2;                  // gracz + 1 teammate
const AVERAGE_STEP = 5;               // średnia wyświetlana co 5 pkt
const DIFF_CHOICES = [5, 10];         // przewaga/strata: 5 lub 10 pkt
const QUALTRICS_ORIGIN = "https://psychodpt.fra1.qualtrics.com";

// ===== Pytania =====
const questions = [
  { text: 'Ile wynosi wynik działania: 3 + 4 × 5 − 1 ?', answers: ['34','28','22','19'], correct: 2, reason: 'Mnożenie wykonujemy przed dodawaniem i odejmowaniem.' },
  { text: 'Jaka liczba powinna być następna w serii: 3, 7, 10, 14, 17, ... ?', answers: ['20','21','22','24'], correct: 1, reason: 'Reguła to naprzemienne dodawanie +4 i +3.' },
  { text: 'Które słowo nie pasuje do pozostałych ze względu na funkcję?', answers: ['Most','Tunel','Kładka','Pomnik'], correct: 3, reason: 'Most, tunel i kładka umożliwiają przejście; pomnik ma funkcję symboliczną.' },
  { text: 'Strona ma się do książki, jak klawisz ma się do...?', answers: ['Muzyki','Klawiatury','Dźwięku','Palca'], correct: 1, reason: 'Relacja: część należy do całości.' },
  { text: 'Rower jest szybszy niż hulajnoga, ale wolniejszy niż motocykl. Samochód jest szybszy niż motocykl. Co jest najwolniejsze?', answers: ['Rower','Motocykl','Samochód','Hulajnoga'], correct: 3, reason: 'Kolejność prędkości: Samochód > Motocykl > Rower > Hulajnoga.' }
];

// ===== Stan gry =====
let currentQuestion = 0;
let score = 0;                       
let timer;
let timeLeft = 10;
let feedbackCondition;
let speedBonusAccum = 0;

// ===== Pomocnicze =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.style.opacity = 0;
  });
  const el = document.getElementById(id);
  el.style.display = 'block';
  el.style.opacity = 0;
  setTimeout(() => { el.style.opacity = 1; }, 20);
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function quantizeToStep(value, step) {
  const q = Math.round(value / step) * step;
  return Math.min(50, Math.max(0, q));
}

// ===== Zdarzenia UI =====
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('team-results-btn').addEventListener('click', calculateResults);

// ===== Logika gry =====
function startGame() {
  currentQuestion = 0;
  score = 0;
  speedBonusAccum = 0;
  showQuestion();
}

function showQuestion() {
  if (currentQuestion >= questions.length) return endGame();

  showScreen('screen-question');
  const q = questions[currentQuestion];
  document.getElementById('question-text').textContent = q.text;
  document.getElementById('score-value').textContent = score;

  const answersDiv = document.getElementById('answers');
  answersDiv.innerHTML = '';
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = ans;
    btn.onclick = () => selectAnswer(i);
    answersDiv.appendChild(btn);
  });

  timeLeft = 10;
  document.getElementById('time-left').textContent = timeLeft;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById('time-left').textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      selectAnswer(null);
    }
  }, 1000);
}

function selectAnswer(index) {
  clearInterval(timer);
  const q = questions[currentQuestion];
  const correct = q.correct === index;

  if (correct) {
    score += 10;
    speedBonusAccum += Math.max(0, timeLeft);
  }

  document.getElementById('feedback-text').textContent = correct ? 'Poprawnie! +10 pkt' : 'Błędnie! 0 pkt';
  document.getElementById('correct-answer').textContent = `Prawidłowa odpowiedź: ${q.answers[q.correct]}. ${q.reason}`;

  // --- 5-sekundowe okno czytania + odliczanie ---
  showScreen('screen-feedback');
  const old = document.getElementById('next-countdown');
  if (old) old.remove();

  let countdown = 5;
  const countdownText = document.createElement('p');
  countdownText.id = 'next-countdown';
  document.getElementById('screen-feedback').appendChild(countdownText);

  function updateCountdown() {
    countdownText.textContent = `Kolejne zadanie za ${countdown} s...`;
    if (countdown > 0) {
      countdown--;
      setTimeout(updateCountdown, 1000);
    } else {
      currentQuestion++;
      if (currentQuestion < questions.length) showQuestion();
      else endGame();
    }
  }
  updateCountdown();
}

function endGame() {
  showScreen('screen-result');
  document.getElementById('final-score').textContent = score;
}

function calculateResults() {
  showScreen('screen-calculating');

  // 1) Losujemy warunek (50/50)
  feedbackCondition = Math.random() < 0.5 ? 'Wygrana' : 'Przegrana';

  // 2) Bonus za szybkość (0–5)
  let speedBonus = Math.round(speedBonusAccum / 10);
  if (speedBonus > 5) speedBonus = 5;

  // 3) Wynik gracza (z bonusem)
  const playerContribution = Math.min(50, score + speedBonus);

  // 4) Wynik teammate’a (co 10)
  const teammateScore = randomInt(0, 5) * 10;

  // 5) Średnia zespołu i przeciwnika (realna, kwantowana)
  const avgIngroupRaw = (playerContribution + teammateScore) / TEAM_SIZE;
  const avgIngroup = quantizeToStep(avgIngroupRaw, AVERAGE_STEP);

  const targetDiff = pick(DIFF_CHOICES);
  let avgOutgroup = feedbackCondition === 'Wygrana' ? avgIngroup - targetDiff : avgIngroup + targetDiff;
  avgOutgroup = quantizeToStep(avgOutgroup, AVERAGE_STEP);
  if (avgOutgroup === avgIngroup) {
    avgOutgroup = quantizeToStep(
      feedbackCondition === 'Wygrana' ? avgIngroup - AVERAGE_STEP : avgIngroup + AVERAGE_STEP,
      AVERAGE_STEP
    );
  }

  // 6) Etap liczenia (6 s), potem ekran końcowy bez limitu
  setTimeout(() => {
    document.getElementById('calc-text').textContent = 'Obliczam średnią punktów Zespołu Przeciwnego...';
  }, 3000);

  setTimeout(() => {
    showScreen('screen-team');
    const teamFeedback =
      feedbackCondition === 'Wygrana'
        ? 'Gratulacje! Wasz zespół wygrał!'
        : 'Niestety, tym razem Zespół Przeciwny był lepszy.';
    document.getElementById('team-feedback').textContent = teamFeedback;

    // ✅ Zmieniony tekst — bez bonusu
    document.getElementById('team-scores').textContent =
      `Twój zespół: ${avgIngroup} pkt | Zespół przeciwny: ${avgOutgroup} pkt`;

    // Wysyłamy do Qualtrics tylko wynik (bez punktów)
    window.parent.postMessage(
      { type: "LOGIC_FEEDBACK", value: feedbackCondition },
      QUALTRICS_ORIGIN
    );
  }, 6000);
}
/* ===== [PATCH] AUTO-RESIZE do Qualtrics (rodzic) ===== */
/* UŻYJ TEJ SAMEJ stałej co w Twoim kodzie do LOGIC_FEEDBACK: */
const __QUALTRICS_ORIGIN__ = (typeof QUALTRICS_ORIGIN === "string")
  ? QUALTRICS_ORIGIN
  : "https://psychodpt.fra1.qualtrics.com";  // <- zostaw jak jest u Ciebie w projekcie

function __getDocHeight() {
  const b = document.body;
  const d = document.documentElement;
  return Math.ceil(Math.max(
    b.scrollHeight, d.scrollHeight,
    b.offsetHeight, d.offsetHeight,
    b.clientHeight, d.clientHeight
  ));
}

function __postHeight() {
  try {
    const h = __getDocHeight();
    window.parent.postMessage({ type: "IFRAME_RESIZE", height: h }, __QUALTRICS_ORIGIN__);
  } catch (e) {}
}

// 1) Odpowiadaj na prośbę rodzica o pomiar wysokości
window.addEventListener("message", function (event) {
  if (event.origin !== __QUALTRICS_ORIGIN__) return;
  if (event.data && event.data.type === "PING_HEIGHT") {
    __postHeight();
  }
});

// 2) Pierwsze pomiary + zmiana rozmiaru okna
document.addEventListener("DOMContentLoaded", __postHeight);
window.addEventListener("load", __postHeight);
window.addEventListener("resize", () => setTimeout(__postHeight, 50));

// 3) Obserwuj zmiany w DOM (zmiana ekranów, render pytań, timery, feedbacki itp.)
const __mo__ = new MutationObserver(() => {
  // throttling prosty: małe opóźnienie, żeby złapać końcową wysokość po zmianach
  clearTimeout(window.__postHeightTick);
  window.__postHeightTick = setTimeout(__postHeight, 30);
});
__mo__.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: false
});

// 4) Dodatkowy trigger co sekundę (timery mogą lekko zmieniać układ)
setInterval(() => {
  __postHeight();
}, 1000);
