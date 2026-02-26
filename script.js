let timerInterval;
let timeRemaining = 0;

const selector = document.getElementById("pdfSelector");
const pdfViewer = document.getElementById("pdfViewer");
const timerDisplay = document.getElementById("timer");
const questionArea = document.getElementById("questionArea");
const questionNav = document.getElementById("questionNav");
const startButton = document.getElementById("startButton");
const submitButton = document.getElementById("submitButton");

let readingTests = [];
let pendingTimeLimit = 0;
let pendingTestId = null;
let pendingFile = null;

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
  pendingFile = selectedFile;

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

    if (submitButton) {
      submitButton.disabled = false;
    }
  });
}

/* Submit button */
if (submitButton) {
  submitButton.addEventListener("click", function () {
    if (!pendingTestId || !pendingFile) return;

    const confirmSubmit = confirm("Are you sure you want to submit this test?");
    if (!confirmSubmit) return;

    try {
      localStorage.setItem("reading_lastTestId", pendingTestId);
      localStorage.setItem("reading_lastFile", pendingFile);
    } catch (e) {
      // ignore storage errors
    }

    window.location.href = "reading-review.html?test=" + encodeURIComponent(pendingTestId);
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

var QUESTION_TYPE_LABELS = {
  "gap-filling": "Gap filling",
  "multiple-choice": "Multiple choice",
  "matching": "Matching",
  "true-false-not-given": "T / F / NG",
  "yes-no-not-given": "Y / N / NG"
};

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

    const headerRow = document.createElement("div");
    headerRow.className = "question-header-row";
    const header = document.createElement("div");
    header.className = "question-header";
    header.textContent = "Question " + q.number;
    const typeLabel = document.createElement("span");
    typeLabel.className = "question-type-badge";
    typeLabel.textContent = QUESTION_TYPE_LABELS[q.type] || q.type || "Question";
    headerRow.appendChild(header);
    headerRow.appendChild(typeLabel);
    card.appendChild(headerRow);

    const prompt = document.createElement("div");
    prompt.className = "question-prompt";
    prompt.textContent = q.prompt;
    card.appendChild(prompt);

    appendAnswerArea(card, q);
    questionArea.appendChild(card);

    const navBtn = document.createElement("button");
    navBtn.className = "question-nav-button";
    navBtn.textContent = q.number;
    navBtn.addEventListener("click", function () {
      const target = document.getElementById("q-" + q.number);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    questionNav.appendChild(navBtn);
  });
}

function appendAnswerArea(card, q) {
  var type = q.type || "gap-filling";
  var name = "q" + q.number;

  if (type === "gap-filling") {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "question-input";
    input.placeholder = q.wordLimit ? q.wordLimit : "Type your answer here";
    input.name = name;
    card.appendChild(input);
    return;
  }

  if (type === "true-false-not-given" || type === "yes-no-not-given") {
    var choices = type === "true-false-not-given" ? ["T", "F", "NG"] : ["Y", "N", "NG"];
    var items = q.items && q.items.length ? q.items : [{ number: q.number, prompt: q.prompt }];
    var singleStatement = items.length === 1;
    items.forEach(function (item, idx) {
      var subName = name + (items.length > 1 ? "_" + (idx + 1) : "");
      var row = document.createElement("div");
      row.className = "question-choice-row";
      if (!singleStatement) {
        var rowLabel = document.createElement("div");
        rowLabel.className = "question-choice-row-label";
        rowLabel.textContent = (item.number != null ? item.number : idx + 1) + ".";
        row.appendChild(rowLabel);
      }
      if (!singleStatement || item.prompt !== q.prompt) {
        var statement = document.createElement("div");
        statement.className = "question-choice-statement";
        statement.textContent = item.prompt || q.prompt;
        row.appendChild(statement);
      }
      var opts = document.createElement("div");
      opts.className = "question-options-inline";
      choices.forEach(function (c) {
        var label = document.createElement("label");
        label.className = "question-option-label";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = subName;
        radio.value = c;
        var span = document.createElement("span");
        span.textContent = c;
        label.appendChild(radio);
        label.appendChild(span);
        opts.appendChild(label);
      });
      row.appendChild(opts);
      card.appendChild(row);
    });
    return;
  }

  if (type === "multiple-choice" && q.options && q.options.length) {
    var opts = document.createElement("div");
    opts.className = "question-options-list";
    q.options.forEach(function (opt, i) {
      var label = document.createElement("label");
      label.className = "question-option-label question-option-label-block";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      var letter = opt.trim().match(/^([A-Z])[\s\-–:]/);
      radio.value = letter ? letter[1] : String.fromCharCode(65 + i);
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + opt));
      opts.appendChild(label);
    });
    card.appendChild(opts);
    return;
  }

  if (type === "matching" && q.matchOptions && q.items && q.items.length) {
    q.items.forEach(function (item, idx) {
      var row = document.createElement("div");
      row.className = "question-matching-row";
      var rowLabel = document.createElement("span");
      rowLabel.className = "question-matching-number";
      rowLabel.textContent = (item.number != null ? item.number : idx + 1) + ".";
      var statement = document.createElement("span");
      statement.className = "question-matching-prompt";
      statement.textContent = item.prompt || "";
      var select = document.createElement("select");
      select.className = "question-input question-select";
      select.name = name + "_" + (idx + 1);
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "—";
      select.appendChild(empty);
      q.matchOptions.forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      row.appendChild(rowLabel);
      row.appendChild(statement);
      row.appendChild(select);
      card.appendChild(row);
    });
    return;
  }

  var fallback = document.createElement("input");
  fallback.type = "text";
  fallback.className = "question-input";
  fallback.placeholder = "Type your answer here";
  fallback.name = name;
  card.appendChild(fallback);
}