// Workout Editor: build a concrete Workout by hand (no templates, no shuffling).
// Each row is one WorkoutExercise: a specific exercise with its own time/reps,
// sets, rest between sets and rest after the exercise.

var preparedExercises = {}; // row id -> WorkoutExercise
var rowCounter = 0;
var editRowId = null;        // row being edited (null when adding)
var editingWorkoutName = null; // name of the workout being edited (null when new)
var isDirty = false;         // unsaved-changes guard

window.addEventListener('load', function () {
  loadAppData().then((data) => {
    fillExerciseSelect(Object.keys(data.exercises).sort());
    loadWorkoutForEdit();
  });

  Array.from(document.querySelectorAll('#exercise-dialog input[type="number"]'))
    .forEach((input) => input.addEventListener('change', validateNumberInput));
});

// Warn before leaving with unsaved changes (tab close / reload).
window.addEventListener('beforeunload', function (event) {
  if (isDirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function markDirty() {
  isDirty = true;
}

function fillExerciseSelect(names) {
  var select = document.getElementById('exercise-select');
  names.forEach((name) => {
    var option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// When opened with ?workout=<name>, load that workout for editing.
function loadWorkoutForEdit() {
  var name = getURLParameter('workout');
  if (name == null) {
    return;
  }

  var workouts = loadWorkoutsFromStorage();
  var workout = workouts[name];
  if (workout == null) {
    toast('Workout not found', 'error', 5);
    return;
  }

  editingWorkoutName = name;
  document.getElementById('name-input').value = workout.name;

  workout.exercises.forEach((exercise) => {
    addExerciseRow(new WorkoutExercise(
      exercise.name,
      exercise.mode,
      exercise.time,
      exercise.reps,
      exercise.setCount,
      exercise.setRestTime,
      exercise.restTime
    ));
  });

  // Loading a stored workout does not count as an edit.
  isDirty = false;
}

// ---------- Add / edit dialog ----------

function openAddExercise() {
  editRowId = null;
  document.getElementById('exercise-dialog-title').textContent = 'Add exercise';
  document.getElementById('confirm-exercise-button').textContent = 'Add';

  document.getElementById('exercise-select').selectedIndex = 0;
  document.getElementById('mode-select').value = 'time';
  resetNumberInput('time-input');
  resetNumberInput('reps-input');
  resetNumberInput('set-count-input');
  resetNumberInput('set-rest-time-input');
  resetNumberInput('rest-time-input');
  onModeChanged();
  onSetCountChanged();

  openDialog('exercise-dialog');
}

function openEditExercise(rowId) {
  var exercise = preparedExercises[rowId];
  editRowId = rowId;
  document.getElementById('exercise-dialog-title').textContent = 'Edit exercise';
  document.getElementById('confirm-exercise-button').textContent = 'Save';

  document.getElementById('exercise-select').value = exercise.name;
  document.getElementById('mode-select').value = exercise.mode;
  document.getElementById('time-input').value = exercise.mode == 'time' ? exercise.time : 40;
  document.getElementById('reps-input').value = exercise.mode == 'reps' ? exercise.reps : 10;
  document.getElementById('set-count-input').value = exercise.setCount;
  document.getElementById('set-rest-time-input').value =
    exercise.setRestTime != null ? exercise.setRestTime : 60;
  document.getElementById('rest-time-input').value = exercise.restTime;
  onModeChanged();
  onSetCountChanged();

  openDialog('exercise-dialog');
}

function onModeChanged() {
  var isTime = document.getElementById('mode-select').value == 'time';
  document.getElementById('time-field').style.display = isTime ? '' : 'none';
  document.getElementById('reps-field').style.display = isTime ? 'none' : '';
}

function onSetCountChanged() {
  var value = parseInt(document.getElementById('set-count-input').value);
  var disabled = isNaN(value) || value <= 1;
  document.getElementById('set-rest-time-field').classList.toggle('disabled', disabled);
  document.getElementById('set-rest-time-input').disabled = disabled;
}

function confirmExercise() {
  var mode = document.getElementById('mode-select').value;
  var setCount = readIntInput('set-count-input');

  var exercise = new WorkoutExercise(
    document.getElementById('exercise-select').value,
    mode,
    mode == 'time' ? readIntInput('time-input') : null,
    mode == 'reps' ? readIntInput('reps-input') : null,
    setCount,
    readIntInput('set-rest-time-input'),
    readIntInput('rest-time-input')
  );

  if (editRowId != null) {
    preparedExercises[editRowId] = exercise;
    var row = document.getElementById(editRowId);
    row.querySelector('.row-label').textContent = exerciseRowSummary(exercise);
  } else {
    addExerciseRow(exercise);
  }

  markDirty();
  closeDialog('exercise-dialog');
}

// ---------- Exercise rows ----------

function exerciseRowSummary(exercise) {
  var effort = exercise.mode == 'reps'
    ? exercise.reps + ' reps'
    : exercise.time + 's';
  var summary = exercise.name + ' — ' + effort;
  if (exercise.setCount > 1) {
    summary += ' × ' + exercise.setCount + ' sets';
  }
  return summary;
}

function addExerciseRow(exercise) {
  var id = 'wex_' + rowCounter++;
  preparedExercises[id] = exercise;

  var list = document.getElementById('exercise-list');

  var row = document.createElement('div');
  row.id = id;
  row.classList.add('row');

  var label = document.createElement('span');
  label.classList.add('row-label');
  label.textContent = exerciseRowSummary(exercise);
  row.appendChild(label);

  var actions = document.createElement('div');
  actions.classList.add('row-actions');
  row.appendChild(actions);

  var makeIconButton = (className, glyph, title) => {
    var button = document.createElement('button');
    button.classList.add('icon-button', className);
    button.textContent = glyph;
    button.title = title;
    button.setAttribute('aria-label', title);
    actions.appendChild(button);
    return button;
  };

  makeIconButton('move-up-button', '↑', 'Move up').addEventListener('click', () => {
    var previous = row.previousElementSibling;
    if (previous) {
      list.insertBefore(row, previous);
      refreshMoveButtons();
      markDirty();
    }
  });

  makeIconButton('move-down-button', '↓', 'Move down').addEventListener('click', () => {
    var next = row.nextElementSibling;
    if (next) {
      list.insertBefore(next, row);
      refreshMoveButtons();
      markDirty();
    }
  });

  makeIconButton('edit-button', '✎', 'Edit').addEventListener('click', () => {
    openEditExercise(id);
  });

  makeIconButton('delete-button', '✕', 'Remove').addEventListener('click', () => {
    list.removeChild(row);
    delete preparedExercises[id];
    refreshMoveButtons();
    updateSaveButton();
    markDirty();
  });

  list.appendChild(row);
  refreshMoveButtons();
  updateSaveButton();
}

// Disable move-up on the first row and move-down on the last.
function refreshMoveButtons() {
  var rows = Array.from(document.getElementById('exercise-list').children);
  rows.forEach((row, index) => {
    row.querySelector('.move-up-button').disabled = index == 0;
    row.querySelector('.move-down-button').disabled = index == rows.length - 1;
  });
}

function updateSaveButton() {
  document.getElementById('save-button').disabled =
    document.getElementById('exercise-list').children.length == 0;
}

// ---------- Save / leave ----------

function saveWorkout() {
  var nameInput = document.getElementById('name-input');
  var name = nameInput.value.trim();
  if (name == '') {
    nameInput.classList.add('has-error');
    toast('Please enter a workout name', 'error', 5);
    return;
  }

  var workouts = loadWorkoutsFromStorage();
  if (workouts.hasOwnProperty(name) && name !== editingWorkoutName) {
    nameInput.classList.add('has-error');
    toast('A workout with this name already exists', 'error', 5);
    return;
  }
  nameInput.classList.remove('has-error');

  if (editingWorkoutName != null && editingWorkoutName !== name) {
    delete workouts[editingWorkoutName];
  }

  var list = document.getElementById('exercise-list');
  var orderedExercises = Array.from(list.children).map(
    (child) => preparedExercises[child.id]
  );

  workouts[name] = new Workout(name, orderedExercises);
  saveToStorage('workouts', workouts);

  isDirty = false;
  showPage(PAGES.Home);
}

function leaveEditor() {
  if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) {
    return;
  }
  isDirty = false;
  showPage(PAGES.Home);
}

// ---------- Helpers ----------

function resetNumberInput(id) {
  var input = document.getElementById(id);
  input.value = input.getAttribute('defaultvalue');
}

function validateNumberInput(event) {
  var input = event.target;
  var value = parseInt(input.value);
  var min = parseInt(input.min || 0);

  if (isNaN(value)) {
    input.value = parseInt(input.getAttribute('defaultvalue')) || min;
  } else if (value < min) {
    input.value = min;
  }
}
