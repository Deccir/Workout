// DOM references (resolved on load)
var exerciseImage;
var progressBar;
var progressFill;
var exerciseLabel;
var setLabel;
var pauseButton;
var doneButton;

// Loaded data + the workout being run
var exercises = null;
var currentWorkout = null;

// A workout is expanded into a flat list of phases up front; `phaseIndex` points
// at the current one.
var phases = [];
var phaseIndex = 0;

// Timer / phase state
var isPaused = false;
var duration = 0; // current phase length in ms (0 for manual reps phases)
var startTime = 0;
var endTime = 0;
var pausedAt = 0;

// Spoken-cue guards, reset at the start of every phase
var lastCountdownSecond = 0;
var halfwaySpoken = false;

var REST_COLOR = '#94ffff';
var PREPARE_TIME = 10; // seconds of "get ready" before the first exercise

window.addEventListener('load', function () {
  exerciseImage = document.getElementById('exerciseImage');
  progressBar = document.getElementById('progressBar');
  progressFill = document.getElementById('progressFill');
  exerciseLabel = document.getElementById('exerciseLabel');
  setLabel = document.getElementById('setLabel');
  pauseButton = document.getElementById('pauseButton');
  doneButton = document.getElementById('doneButton');

  loadAppData().then((data) => {
    exercises = data.exercises;
    currentWorkout = loadWorkout(data);

    if (currentWorkout == null || currentWorkout.exercises.length == 0) {
      toast('No workout available to run', 'error', 5);
      exerciseLabel.textContent = 'No workout available';
      return;
    }

    phases = buildPhases(currentWorkout);
    phaseIndex = 0;
    runPhase();
  });
});

// Resolve which workout to run:
//   ?source=preview -> the transient workout handed over by WorkoutPreview
//   ?workout=<name> -> that saved workout
//   otherwise the first saved workout, else a small built-in demo.
function loadWorkout(data) {
  if (getURLParameter('source') === 'preview') {
    return takePendingWorkout();
  }

  var name = getURLParameter('workout');
  var savedWorkouts = loadWorkoutsFromStorage();
  var workout = name != null ? savedWorkouts[name] : Object.values(savedWorkouts)[0];

  if (workout != null) {
    return workout;
  }

  return new Workout('Demo', [
    new WorkoutExercise('Stick Dislocation', 'time', 40, null, 1, null, 15),
    new WorkoutExercise('Push up', 'time', 40, null, 1, null, 15),
  ]);
}

// Expand a workout into an ordered list of phases:
//   prepare -> (for each exercise: for each set: exercise [+ set-rest]) [+ rest]
function buildPhases(workout) {
  var result = [{ type: 'prepare' }];
  var exerciseCount = workout.exercises.length;

  workout.exercises.forEach((exercise, exerciseIndex) => {
    var setCount = exercise.setCount || 1;

    for (var set = 1; set <= setCount; set++) {
      result.push({
        type: 'exercise',
        exerciseIndex: exerciseIndex,
        setNumber: set,
        setTotal: setCount,
      });

      if (set < setCount && exercise.setRestTime > 0) {
        result.push({ type: 'setrest', seconds: exercise.setRestTime });
      }
    }

    if (exerciseIndex < exerciseCount - 1 && exercise.restTime > 0) {
      result.push({ type: 'rest', seconds: exercise.restTime });
    }
  });

  return result;
}

function exerciseData(name) {
  return exercises[name];
}

// ---------- Phase execution ----------

function runPhase() {
  if (phaseIndex >= phases.length) {
    finishWorkout();
    return;
  }

  var phase = phases[phaseIndex];
  doneButton.style.display = 'none';
  setLabel.textContent = '';

  if (phase.type === 'prepare') {
    runPreparePhase();
  } else if (phase.type === 'exercise') {
    runExercisePhase(phase);
  } else if (phase.type === 'setrest') {
    runRestPhase('Rest — next set', phase.seconds);
  } else {
    runRestPhase('Rest', phase.seconds);
  }
}

function runPreparePhase() {
  var first = currentWorkout.exercises[0];
  var exercise = exerciseData(first.name);
  showImage(exercise, first.name);
  exerciseLabel.textContent = 'Get ready: ' + first.name;
  progressFill.style.backgroundColor = REST_COLOR;

  speak('Get ready');
  startTimer(PREPARE_TIME * 1000);
}

function runExercisePhase(phase) {
  var workoutExercise = currentWorkout.exercises[phase.exerciseIndex];
  var exercise = exerciseData(workoutExercise.name);

  showImage(exercise, workoutExercise.name);
  exerciseLabel.textContent =
    (phase.exerciseIndex + 1) + '/' + currentWorkout.exercises.length +
    ' – ' + workoutExercise.name;
  if (phase.setTotal > 1) {
    setLabel.textContent = 'Set ' + phase.setNumber + '/' + phase.setTotal;
  }
  progressFill.style.backgroundColor =
    exercise != null ? difficultyToColor(exercise.difficulty) : REST_COLOR;

  speak(workoutExercise.name);

  if (workoutExercise.mode === 'reps') {
    // Reps-based: no timer, the user advances with the Done button.
    stopTimer();
    progressFill.style.width = '100%';
    exerciseLabel.textContent += ' — ' + workoutExercise.reps + ' reps';
    doneButton.style.display = '';
  } else {
    startTimer(workoutExercise.time * 1000);
  }
}

function runRestPhase(label, seconds) {
  exerciseLabel.textContent = label;
  progressFill.style.backgroundColor = REST_COLOR;
  speak('Rest');
  startTimer(seconds * 1000);
}

function finishWorkout() {
  stopTimer();
  progressFill.style.width = '100%';
  progressFill.style.backgroundColor = REST_COLOR;
  exerciseLabel.textContent = 'Workout complete!';
  setLabel.textContent = '';
  doneButton.style.display = 'none';
  speak('Workout complete');
}

function showImage(exercise, name) {
  exerciseImage.src = exercise != null ? exercise.link : ASSET_BASE + 'assets/homer.gif';
  exerciseImage.alt = name;
}

// Advance to the next phase in the schedule.
function advancePhase() {
  phaseIndex++;
  runPhase();
}

// Manual advance out of a reps-based exercise phase.
function finishReps() {
  advancePhase();
}

// ---------- Prev / Next by exercise ----------

// Index of the first phase belonging to the given exercise (its first set).
function phaseIndexForExercise(exerciseIndex) {
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].type === 'exercise' &&
        phases[i].exerciseIndex === exerciseIndex &&
        phases[i].setNumber === 1) {
      return i;
    }
  }
  return -1;
}

// Which exercise the current phase relates to (0 during prepare).
function currentExerciseIndex() {
  var phase = phases[Math.min(phaseIndex, phases.length - 1)];
  return phase != null && phase.exerciseIndex != null ? phase.exerciseIndex : 0;
}

function previousExercise() {
  var count = currentWorkout.exercises.length;
  var target = (currentExerciseIndex() - 1 + count) % count;
  jumpToExercise(target);
}

function nextExercise() {
  var count = currentWorkout.exercises.length;
  var target = (currentExerciseIndex() + 1) % count;
  jumpToExercise(target);
}

function jumpToExercise(exerciseIndex) {
  var target = phaseIndexForExercise(exerciseIndex);
  if (target >= 0) {
    phaseIndex = target;
    runPhase();
  }
}

function cancelWorkout() {
  stopTimer();
  showPage(PAGES.Home);
}

// ---------- Timer ----------

function startTimer(durationMs) {
  duration = durationMs;
  isPaused = false;
  startTime = Date.now();
  endTime = startTime + duration;
  lastCountdownSecond = 0;
  halfwaySpoken = false;
  pauseButton.disabled = false;
  pauseButton.textContent = 'Pause';
  progressFill.style.width = '0%';
  tick();
}

// Stop the timer loop (used for manual reps phases and workout completion).
function stopTimer() {
  isPaused = true;
  duration = 0;
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
}

function tick() {
  if (isPaused || duration == 0) {
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

// Spoken cues during a phase: "halfway there" at the midpoint of a timed
// exercise, and a 3-2-1 countdown in the final seconds of every timed phase.
function announceCues(now, elapsed) {
  var phase = phases[phaseIndex];
  if (phase != null && phase.type === 'exercise' && !halfwaySpoken && elapsed >= duration / 2) {
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
  if (duration == 0) {
    return; // nothing to pause during a manual reps phase
  }
  isPaused = !isPaused;

  if (isPaused) {
    pausedAt = Date.now();
    pauseButton.textContent = 'Continue';
  } else {
    var pausedFor = Date.now() - pausedAt;
    startTime += pausedFor;
    endTime += pausedFor;
    pauseButton.textContent = 'Pause';
    tick();
  }
}

function speak(message) {
  if (!('speechSynthesis' in window)) {
    console.log('no speech');
    return;
  }
  console.log(message);
  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
}
