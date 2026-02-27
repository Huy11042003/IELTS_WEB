let timerInterval;
let timeRemaining = 0;

const selector = document.getElementById("pdfSelector");
const pdfViewer = document.getElementById("pdfViewer");
const timerDisplay = document.getElementById("timer");
const questionArea = document.getElementById("questionArea");
const questionNav = document.getElementById("questionNav");
const startButton = document.getElementById("startButton");
const submitButton = document.getElementById("submitButton");

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


// helper to fetch questions for a specific test
function fetchQuestions(testId) {
  // assumes files stored under reading/questions/<testId>.json
  return fetch("reading/questions/" + encodeURIComponent(testId) + ".json")
    .then(res => {
      if (!res.ok) throw new Error("no question file");
      return res.json();
    })
    .catch(() => null);
}

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
    // once started, disable start control and selector so it can't be reused
    startButton.disabled = true;
    if (selector) selector.disabled = true;

    startTimer(pendingTimeLimit);

    // load questions file for this test and render
    fetchQuestions(pendingTestId).then(testData => {
      renderQuestions(testData);
    });

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
      // collect answers from inputs
      var inputs = document.querySelectorAll('[name^="q"]');
      var responses = {};
      inputs.forEach(function(el) {
        var name = el.name;
        var base = name.split('_')[0];
        var num = base.replace(/^q/, '');
        var val;
        if (el.type === 'radio') {
          if (!el.checked) return;
          val = el.value;
        } else if (el.tagName === 'SELECT') {
          val = el.value;
        } else {
          val = el.value.trim();
        }
        if (val === undefined || val === '') return;
        if (!responses[num]) responses[num] = [];
        responses[num].push(val);
      });
      localStorage.setItem('reading_answers_' + pendingTestId, JSON.stringify(responses));
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
  "true-false-not-given": "True / False / Not Given",
  "yes-no-not-given": "Yes / No / Not Given"
};

function renderQuestions(test) {
  questionArea.innerHTML = "";
  questionNav.innerHTML = "";

  if (!test || !Array.isArray(test.questions) || test.questions.length === 0) {
    const msg = document.createElement("div");
    msg.className = "no-questions";
    msg.textContent = "Questions for this test will be added soon.";
    questionArea.appendChild(msg);
    return;
  }

  var navButtons = {}; // Store buttons by question number

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

    // Add change listeners to mark button as answered
    var inputs = card.querySelectorAll('input[name^="q"], select[name^="q"]');
    inputs.forEach(input => {
      input.addEventListener('change', function() {
        markQuestionAnswered(q.number);
      });
      input.addEventListener('input', function() {
        markQuestionAnswered(q.number);
      });
    });
  });

  function markQuestionAnswered(qNumber) {
    if (navButtons[qNumber]) {
      navButtons[qNumber].classList.add('answered');
    }
  }

  // Group buttons by section
  var sections = {};
  test.questions.forEach(q => {
    var sec = q.section || 1;
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(q);
  });

  Object.keys(sections).sort((a, b) => a - b).forEach(sec => {
    var secHeader = document.createElement("div");
    secHeader.className = "section-header";
    secHeader.textContent = "Section " + sec;
    questionNav.appendChild(secHeader);

    sections[sec].forEach(q => {
      const navBtn = document.createElement("button");
      navBtn.className = "question-nav-button";
      navBtn.textContent = q.number;
      navButtons[q.number] = navBtn; // Store button reference
      navBtn.addEventListener("click", function () {
        const target = document.getElementById("q-" + q.number);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      questionNav.appendChild(navBtn);
    });
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

  // render true/false/not-given like a multiple choice block (letters A/B/C) to unify styles
  if (type === "true-false-not-given" || type === "yes-no-not-given") {
    var choices = type === "true-false-not-given" ? ["TRUE","FALSE","NOT GIVEN"] : ["YES","NO","NOT GIVEN"];
    // convert to multiple-choice like layout
    var opts = document.createElement("div");
    opts.className = "question-options-list";
    choices.forEach(function(c, i) {
      var label = document.createElement("label");
      label.className = "question-option-label question-option-label-block";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      radio.value = c;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + c));
      opts.appendChild(label);
    });
    card.appendChild(opts);
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