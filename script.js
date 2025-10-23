// ===== Konfiguracja „realnych” wyników + komunikacja =====
const TEAM_SIZE = 2;                  // gracz + 1 teammate
const AVERAGE_STEP = 5;               // średnia wyświetlana co 5 pkt
const DIFF_CHOICES = [5, 10];         // przewaga / strata: 5 lub 10 pkt
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
let score = 0;                       // 0–50, kroki po 10
let timer;
let timeLeft = 10;
let feedbackCondition;
let speedBonusAccum = 0;             // suma sekund za trafne odpowiedzi

// ===== Pomocnicze =====
function showScreen(id) {
  // prosta animacja fade-in (bez ciężkich klas)
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
    score += 10;                              // baza: 10 pkt
    speedBonusAccum += Math.max(0, timeLeft); // bonus za szybkość
  }

  document.getElementById('feedback-text').textContent = correct ? 'Poprawnie! +10 pkt' : 'Błędnie! 0 pkt';
  document.getElementById('correct-answer').textContent = `Prawidłowa odpowiedź: ${q.answers[q.correct]}. ${q.reason}`;

  // --- 5-sekundowe okno czytania + odliczanie "Kolejne zadanie za ... s" ---
  showScreen('screen-feedback');

  // usuń poprzedni licznik jeśli był
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

  // 1) Losujemy warunek
  feedbackCondition = Math.random() < 0.5 ? 'Wygrana' : 'Przegrana';

  // 2) Bonus za szybkość (0–5)
  let speedBonus = Math.round(speedBonusAccum / 10);
  if (speedBonus > 5) speedBonus = 5;

  // 3) Wkład gracza do średniej zespołu = min(50, score + bonus)
  const playerContribution = Math.min(50, score + speedBonus);

  // 4) Teammate: wielokrotność 10 (0..50)
  const teammateScore = randomInt(0, 5) * 10;

  // 5) Średnia zespołu i kwantyzacja do 5
  let avgIngroupRaw = (playerContribution + teammateScore) / TEAM_SIZE;
  let avgIngroup = quantizeToStep(avgIngroupRaw, AVERAGE_STEP);

  // 6) Średnia przeciwnika – różnica 5 lub 10
  const targetDiff = pick(DIFF_CHOICES);
  let avgOutgroup = feedbackCondition === 'Wygrana' ? avgIngroup - targetDiff : avgIngroup + targetDiff;
  avgOutgroup = quantizeToStep(avgOutgroup, AVERAGE_STEP);

  if (avgOutgroup === avgIngroup) {
    avgOutgroup = quantizeToStep(
      feedbackCondition === 'Wygrana' ? avgIngroup - AVERAGE_STEP : avgIngroup + AVERAGE_STEP,
      AVERAGE_STEP
    );
  }

  setTimeout(() => {
    document.getElementById('calc-text').textContent = 'Obliczam średnią punktów Zespołu Przeciwnego...';
  }, 3000);

  setTimeout(() => {
    showScreen('screen-team');
    const teamFeedback = feedbackCondition === 'Wygrana'
      ? 'Gratulacje! Wasz zespół wygrał!'
      : 'Niestety, tym razem Zespół Przeciwny był lepszy.';
    document.getElementById('team-feedback').textContent = teamFeedback;
    document.getElementById('team-scores').textContent =
      `Twój zespół: ${avgIngroup} pkt (uwzględniono bonus za szybkość) | Zespół przeciwny: ${avgOutgroup} pkt`;

    // WYŁĄCZNIE informacja o wygranej/przegranej do Qualtrics
    window.parent.postMessage(
      { type: "LOGIC_FEEDBACK", value: feedbackCondition },
      QUALTRICS_ORIGIN
    );

    // Estetyczny, wyśrodkowany komunikat końcowy
    setTimeout(() => {
      document.body.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.cssText = "min-height:60vh; display:flex; align-items:flex-start; justify-content:center;";
      const msg = document.createElement("div");
      msg.style.cssText = "max-width:640px; text-align:center; font-size:1.25rem; line-height:1.5; color:#333; background:#fff; border-radius:16px; padding:24px; margin-top:24px; box-shadow:0 4px 20px rgba(0,0,0,.06);";
      msg.innerHTML = "<strong>Dziękujemy za udział!</strong><br/>Aby przejść dalej kliknij strzałkę poniżej";
      wrap.appendChild(msg);
      document.body.appendChild(wrap);
    }, 500);
  }, 6000);
}
