// DOM references (resolved on load)
var gifImage;
var progressBar;
var progressFill;
var exerciseLabel;

// Loaded data + the workout being run
var exercises = null;
var currentWorkout = null;
var currentExerciseIndex = 0;

// Timer / phase state
var isResting = false;
var isPaused = false;
var duration = 0; // current phase length in ms
var startTime = 0;
var endTime = 0;
var pausedAt = 0;

var REST_COLOR = '#94ffff';

window.addEventListener('load', function () {
  gifImage = document.getElementById('tutorialVideo');
  progressBar = document.getElementById('progressBar');
  progressFill = document.getElementById('progressFill');
  exerciseLabel = document.getElementById('exerciseLabel');

  getDataPromise().then((data) => {
    exercises = data.exercises;
    currentWorkout = loadWorkout(data);

    if (currentWorkout == null || currentWorkout.exerciseNames.length == 0) {
      toast('No workout available to run', 'error', 5);
      exerciseLabel.textContent = 'No workout available';
      return;
    }

    startExercisePhase();
  });
});

// Resolve which workout to run: the one named in the URL, else the first saved
// one, else a small built-in demo so the page still works standalone.
function loadWorkout(data) {
  var name = getURLParameter('workout');
  var savedWorkouts = loadObject('workouts') || {};
  var template = name != null ? savedWorkouts[name] : Object.values(savedWorkouts)[0];

  if (template != null) {
    return buildWorkoutFromTemplate(template, data);
  }

  return new Workout('Demo', ['Stick Dislocation', 'Push up'], 40, 15);
}

function currentExercise() {
  return exercises[currentWorkout.exerciseNames[currentExerciseIndex]];
}

function startExercisePhase() {
  isResting = false;

  var exercise = currentExercise();
  gifImage.src = exercise.link;
  gifImage.alt = exercise.name;
  exerciseLabel.textContent =
    (currentExerciseIndex + 1) + '/' + currentWorkout.exerciseNames.length +
    ' – ' + exercise.name;
  progressFill.style.backgroundColor = difficultyToColor(exercise.difficulty);

  speak(exercise.name);
  startTimer(currentWorkout.exerciseTime * 1000);
}

function startRestPhase() {
  isResting = true;

  exerciseLabel.textContent = 'Rest';
  progressFill.style.backgroundColor = REST_COLOR;

  speak('Rest');
  startTimer(currentWorkout.restTime * 1000);
}

// Advance from whatever the current phase is to the next one.
function advancePhase() {
  if (!isResting && currentWorkout.restTime > 0) {
    startRestPhase();
  } else {
    nextExercise();
  }
}

function previousExercise() {
  var count = currentWorkout.exerciseNames.length;
  currentExerciseIndex = (currentExerciseIndex - 1 + count) % count;
  startExercisePhase();
}

function nextExercise() {
  currentExerciseIndex =
    (currentExerciseIndex + 1) % currentWorkout.exerciseNames.length;
  startExercisePhase();
}

function cancelTraining() {
  isPaused = true;
  showPage(PAGES.StartMenu);
}

function startTimer(durationMs) {
  duration = durationMs;
  isPaused = false;
  startTime = Date.now();
  endTime = startTime + duration;
  progressFill.style.width = '0%';
  tick();
}

function tick() {
  if (isPaused) {
    return;
  }

  var now = Date.now();
  if (now < endTime) {
    progressFill.style.width = ((now - startTime) / duration) * 100 + '%';
    setTimeout(tick, 50);
  } else {
    progressFill.style.width = '100%';
    advancePhase();
  }
}

function togglePauseResume() {
  var pauseResumeButton = document.querySelector('button[onclick="togglePauseResume()"]');
  isPaused = !isPaused;

  if (isPaused) {
    pausedAt = Date.now();
    pauseResumeButton.textContent = 'Continue';
  } else {
    var pausedFor = Date.now() - pausedAt;
    startTime += pausedFor;
    endTime += pausedFor;
    pauseResumeButton.textContent = 'Pause';
    tick();
  }
}

function speak(message) {
  if (!('speechSynthesis' in window)) {
    return;
  }
  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
}
