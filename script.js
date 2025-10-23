const questions = [
  { text: 'Ile wynosi wynik działania: 3 + 4 × 5 − 1 ?', answers: ['34','28','22','19'], correct: 2, reason: 'Mnożenie wykonujemy przed dodawaniem i odejmowaniem.' },
  { text: 'Jaka liczba powinna być następna w serii: 3, 7, 10, 14, 17, ... ?', answers: ['20','21','22','24'], correct: 1, reason: 'Reguła to naprzemienne dodawanie +4 i +3.' },
  { text: 'Które słowo nie pasuje do pozostałych ze względu na funkcję?', answers: ['Most','Tunel','Kładka','Pomnik'], correct: 3, reason: 'Most, tunel i kładka umożliwiają przejście; pomnik ma funkcję symboliczną.' },
  { text: 'Strona ma się do książki, jak klawisz ma się do...?', answers: ['Muzyki','Klawiatury','Dźwięku','Palca'], correct: 1, reason: 'Relacja: część należy do całości.' },
  { text: 'Rower jest szybszy niż hulajnoga, ale wolniejszy niż motocykl. Samochód jest szybszy niż motocykl. Co jest najwolniejsze?', answers: ['Rower','Motocykl','Samochód','Hulajnoga'], correct: 3, reason: 'Kolejność prędkości: Samochód > Motocykl > Rower > Hulajnoga.' }
];

let currentQuestion = 0;
let score = 0;
let timer;
let timeLeft = 10;
let feedbackCondition;

// docelowa domena Qualtrics do postMessage
const QUALTRICS_ORIGIN = "https://psychodpt.fra1.qualtrics.com";

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('team-results-btn').addEventListener('click', calculateResults);

function startGame() {
  currentQuestion = 0;
  score = 0;
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
  if (correct) score += 10;

  document.getElementById('feedback-text').textContent = correct ? 'Poprawnie! +10 pkt' : 'Błędnie! 0 pkt';
  document.getElementById('correct-answer').textContent = `Prawidłowa odpowiedź: ${q.answers[q.correct]}. ${q.reason}`;

  showScreen('screen-feedback');
  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < questions.length) showQuestion();
    else endGame();
  }, 2000);
}

function endGame() {
  showScreen('screen-result');
  document.getElementById('final-score').textContent = score;
}

function calculateResults() {
  showScreen('screen-calculating');

  // losowanie feedbacku po stronie gry
  feedbackCondition = Math.random() < 0.5 ? 'Wygrana' : 'Przegrana';

  const player = score;
  const t1 = randomInt(20, 40);
  const t2 = randomInt(20, 40);
  const avgIngroup = (player + t1 + t2) / 3;

  const diff = randomFloat(2.0, 3.0);
  let avgOutgroup = feedbackCondition === 'Wygrana' ? avgIngroup - diff : avgIngroup + diff;
  if (avgOutgroup < 0) avgOutgroup = 0;

  const ing = avgIngroup.toFixed(1);
  const outg = avgOutgroup.toFixed(1);

  setTimeout(() => {
    document.getElementById('calc-text').textContent = 'Obliczam średnią punktów Zespołu Przeciwnego...';
  }, 3000);

  setTimeout(() => {
    showScreen('screen-team');
    const teamFeedback = feedbackCondition === 'Wygrana'
      ? 'Gratulacje! Wasz zespół wygrał!'
      : 'Niestety, tym razem Zespół Przeciwny był lepszy.';
    document.getElementById('team-feedback').textContent = teamFeedback;
    document.getElementById('team-scores').textContent = `Twój zespół: ${ing} pkt | Zespół przeciwny: ${outg} pkt`;

    // wysyłka wyłącznie do Qualtrics (bez '*')
    window.parent.postMessage({ feedback: feedbackCondition }, QUALTRICS_ORIGIN);

    setTimeout(() => { document.body.innerHTML = '<h2>Dziękujemy za udział!</h2>'; }, 5000);
  }, 6000);
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return Math.random() * (max - min) + min; }
