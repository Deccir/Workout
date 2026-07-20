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
var currentPhase = 'exercise'; // 'prepare' | 'exercise' | 'rest'
var isPaused = false;
var duration = 0; // current phase length in ms
var startTime = 0;
var endTime = 0;
var pausedAt = 0;

// Spoken-cue guards, reset at the start of every phase
var lastCountdownSecond = 0;
var halfwaySpoken = false;

var REST_COLOR = '#94ffff';
var PREPARE_TIME = 10; // seconds of "get ready" before the first exercise

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

    startPreparePhase();
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

// 10-second "get ready" countdown before the workout starts. Shows the first
// exercise so the user can prepare for it.
function startPreparePhase() {
  currentPhase = 'prepare';

  var exercise = exercises[currentWorkout.exerciseNames[0]];
  gifImage.src = exercise.link;
  gifImage.alt = exercise.name;
  exerciseLabel.textContent = 'Get ready: ' + exercise.name;
  progressFill.style.backgroundColor = REST_COLOR;

  speak('Get ready');
  startTimer(PREPARE_TIME * 1000);
}

function startExercisePhase() {
  currentPhase = 'exercise';

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
  currentPhase = 'rest';

  exerciseLabel.textContent = 'Rest';
  progressFill.style.backgroundColor = REST_COLOR;

  speak('Rest');
  startTimer(currentWorkout.restTime * 1000);
}

// Advance from whatever the current phase is to the next one.
function advancePhase() {
  if (currentPhase === 'prepare') {
    startExercisePhase(); // prepare -> first exercise, index stays at 0
  } else if (currentPhase === 'exercise' && currentWorkout.restTime > 0) {
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
  lastCountdownSecond = 0;
  halfwaySpoken = false;
  progressFill.style.width = '0%';
  tick();
}

function tick() {
  if (isPaused) {
    return;
  }

  var now = Date.now();
  if (now < endTime) {
    var elapsed = now - startTime;
    progressFill.style.width = (elapsed / duration) * 100 + '%';
    announceCues(now, elapsed);
    setTimeout(tick, 50);
  } else {
    progressFill.style.width = '100%';
    advancePhase();
  }
}

// Spoken cues during a phase: "halfway there" at the midpoint of an exercise,
// and a 3-2-1 countdown in the final seconds of every phase.
function announceCues(now, elapsed) {
  if (currentPhase === 'exercise' && !halfwaySpoken && elapsed >= duration / 2) {
    halfwaySpoken = true;
    speak('halfway there');
  }

  var secondsLeft = Math.ceil((endTime - now) / 1000);
  if (secondsLeft >= 1 && secondsLeft <= 3 && secondsLeft !== lastCountdownSecond) {
    lastCountdownSecond = secondsLeft;
    speak(String(secondsLeft));
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
    console.log("no speech")
    return;
  }
  console.log(message)
  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
}
