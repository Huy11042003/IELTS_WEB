let timerInterval;
let timeRemaining = 0;

const selector = document.getElementById("pdfSelector");
const pdfViewer = document.getElementById("pdfViewer");
const timerDisplay = document.getElementById("timer");

/* Load available PDFs */
fetch("pdf-list.json")
  .then(res => res.json())
  .then(data => {
    data.forEach(item => {
      const option = document.createElement("option");
      option.value = item.file;
      option.textContent = item.title;
      option.dataset.time = item.timeLimit;
      selector.appendChild(option);
    });
  });

/* When user selects a test */
selector.addEventListener("change", function () {
  const selectedFile = this.value;

  if (!selectedFile) return;

  // Load PDF
  pdfViewer.src = "pdf/" + selectedFile;

  // Get time limit from JSON
  const selectedOption = this.options[this.selectedIndex];
  const timeLimit = parseInt(selectedOption.dataset.time);

  startTimer(timeLimit);
});

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