let timerInterval;
let timeRemaining = 0;

const selector = document.getElementById("pdfSelector");
const pdfViewer = document.getElementById("pdfViewer");
const timerDisplay = document.getElementById("timer");
const questionArea = document.getElementById("questionArea");
const questionNav = document.getElementById("questionNav");
const startButton = document.getElementById("startButton");

let readingTests = [];
let pendingTimeLimit = 0;
let pendingTestId = null;

/* Load available PDFs */
fetch("pdf-list.json")
  .then(res => res.json())
  .then(data => {
    data.forEach(item => {
      const option = document.createElement("option");
      option.value = item.file;
      option.textContent = item.title;
      option.dataset.time = item.timeLimit;
      option.dataset.testId = item.id || item.file.replace(".pdf", "");
      selector.appendChild(option);
    });
  });

/* Load reading questions metadata */
fetch("reading-questions.json")
  .then(res => res.json())
  .then(data => {
    readingTests = data;
  })
  .catch(() => {
    readingTests = [];
  });

/* When user selects a test */
selector.addEventListener("change", function () {
  const selectedFile = this.value;

  if (!selectedFile) return;

  // Load PDF from reading folder
  pdfViewer.src = "reading/" + selectedFile;

  // Get time limit from JSON
  const selectedOption = this.options[this.selectedIndex];
  const timeLimit = parseInt(selectedOption.dataset.time, 10);
  const testId = selectedOption.dataset.testId;

  pendingTimeLimit = timeLimit;
  pendingTestId = testId;

  if (startButton) {
    startButton.disabled = false;
  }
});

/* Start button */
if (startButton) {
  startButton.addEventListener("click", function () {
    if (!pendingTimeLimit || !pendingTestId) return;
    startTimer(pendingTimeLimit);
    renderQuestions(pendingTestId);
  });
}

/* Timer Function */
function startTimer(seconds) {
  clearInterval(timerInterval);

  timeRemaining = seconds;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeRemaining--;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      alert("Time is up!");
    }

    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  timerDisplay.textContent =
    `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function renderQuestions(testId) {
  const test = readingTests.find(t => t.id === testId);

  questionArea.innerHTML = "";
  questionNav.innerHTML = "";

  if (!test || !Array.isArray(test.questions) || test.questions.length === 0) {
    const msg = document.createElement("div");
    msg.className = "no-questions";
    msg.textContent = "Questions for this test will be added soon.";
    questionArea.appendChild(msg);
    return;
  }

  test.questions.forEach(q => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.id = `q-${q.number}`;

    const header = document.createElement("div");
    header.className = "question-header";
    header.textContent = `Question ${q.number}`;

    const prompt = document.createElement("div");
    prompt.className = "question-prompt";
    prompt.textContent = q.prompt;

    const answer = document.createElement("input");
    answer.type = "text";
    answer.className = "question-input";
    answer.placeholder = "Type your answer here";

    card.appendChild(header);
    card.appendChild(prompt);
    card.appendChild(answer);

    questionArea.appendChild(card);

    const navBtn = document.createElement("button");
    navBtn.className = "question-nav-button";
    navBtn.textContent = q.number;
    navBtn.addEventListener("click", () => {
      const target = document.getElementById(`q-${q.number}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    questionNav.appendChild(navBtn);
  });
}