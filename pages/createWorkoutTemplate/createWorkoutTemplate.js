var preparedExerciseTemplates = {};
var acceptedOnce = false;
var editRowId = null;
var rowCounter = 0;
// Name of the workout currently being edited (null when creating a new one).
var editingWorkoutName = null;

// Per-exercise overwrite fields: maps the DOM id prefix to the ExerciseTemplate
// property. Each has a `<prefix>-enabled` checkbox, `<prefix>-input` number
// input and `<prefix>-field` wrapper.
var OVERWRITE_FIELDS = {
  "overwrite-exercise-time": "overwriteTime",
  "overwrite-rest-time": "overwriteRestTime",
  "overwrite-set-count": "overwriteSetCount",
  "overwrite-set-rest-time": "overwriteSetRestTime",
};

// Enable/disable a single overwrite input from its checkbox.
function toggleOverwriteField(prefix) {
  var enabled = document.getElementById(prefix + "-enabled").checked;
  document.getElementById(prefix + "-input").disabled = !enabled;
  document.getElementById(prefix + "-field").classList.toggle("disabled", !enabled);
}

// Read the overwrite inputs into { property: value|null }, null when disabled.
function readOverwriteValues() {
  var values = {};
  Object.keys(OVERWRITE_FIELDS).forEach((prefix) => {
    var enabled = document.getElementById(prefix + "-enabled").checked;
    values[OVERWRITE_FIELDS[prefix]] = enabled
      ? parseInt(document.getElementById(prefix + "-input").value)
      : null;
  });
  return values;
}

// Restore a single overwrite field's checkbox + value from a stored value.
function setOverwriteField(prefix, value) {
  document.getElementById(prefix + "-enabled").checked = value != null;
  if (value != null) {
    document.getElementById(prefix + "-input").value = value;
  }
  toggleOverwriteField(prefix);
}

function isOptionalParamsOpen() {
  return document
    .querySelector("#optional-exercise-inputs .content")
    .classList.contains("open");
}

function setOptionalParamsOpen(open) {
  if (open === isOptionalParamsOpen()) {
    return;
  }
  document.getElementById("use-optional-exercise-param").checked = open;
  toggleAccordion("optional-exercise-inputs");
}

//#region initialize

window.addEventListener("load", () => {
  getDataPromise()
    .then((data) => {
      fillMuscleSelection(data.muscles);
      fillTypeSelection(data.types);
    })
    .then(() => initializeMultiSelectDropdown());

  var min = document.getElementById("min-difficulty");
  min.addEventListener("change", updateMatchingExercises);

  var max = document.getElementById("max-difficulty");
  max.addEventListener("change", updateMatchingExercises);

  var muscleSelect = document.getElementById("muscle-select");
  resetSelectedValues(muscleSelect);
  muscleSelect.addEventListener("change", updateMatchingExercises);

  var typeSelect = document.getElementById("type-select");
  resetSelectedValues(typeSelect);
  typeSelect.addEventListener("change", updateMatchingExercises);

  document.getElementById("exercise-template-dialog")
    .addEventListener("close", () => {
      resetRowDialog();
    });

  Array.from(document.querySelectorAll('input[type="number"]'))
    .forEach(input => input.addEventListener("change", validateNumberInput));

  loadWorkoutForEdit();
});

// When opened with ?workout=<name>, load that saved workout so it can be edited.
function loadWorkoutForEdit() {
  var name = getURLParameter("workout");
  if (name == null) {
    return;
  }

  var workouts = loadObject("workouts") || {};
  var template = workouts[name];
  if (template == null) {
    toast("Workout not found", "error", 5);
    return;
  }

  editingWorkoutName = name;

  document.getElementById("name-input").value = template.name;
  document.getElementById("exercise-time-input").value = template.exerciseTime;
  document.getElementById("rest-time-input").value = template.restTime;
  document.getElementById("circuit-count-input").value = template.circuitCount;
  document.getElementById("set-count-input").value = template.setCount;
  if (template.setRestTime != null) {
    document.getElementById("set-rest-time-input").value = template.setRestTime;
  }
  setCountUpdated({ target: document.getElementById("set-count-input") });

  template.exerciseTemplates.forEach((exerciseTemplate) => {
    addExerciseRow(
      new ExerciseTemplate(
        exerciseTemplate.muscles,
        exerciseTemplate.types,
        exerciseTemplate.difficultyMin,
        exerciseTemplate.difficultyMax,
        exerciseTemplate.overwriteTime,
        exerciseTemplate.overwriteSetCount,
        exerciseTemplate.overwriteSetRestTime
      )
    );
  });
}

function fillMuscleSelection(muscles) {
  var container = document.getElementById("muscle-select");

  muscles.forEach((muscle) => {
    var option = document.createElement("option");
    option.value = muscle.name;
    option.textContent = capitalizeWords(muscle.name);
    container.appendChild(option);
  });
}

function fillTypeSelection(types) {
  var container = document.getElementById("type-select");

  types.forEach((type) => {
    var option = document.createElement("option");
    option.value = type.name;
    option.textContent = capitalizeWords(type.name);
    container.appendChild(option);
  });
}

//#endregion

function confirmExerciseRowInput() {
  acceptedOnce = true;
  if (validateExerciseRowInput() == false) {
    return;
  }

  var selectedMuscles = getSelectValuesBySelectId("muscle-select");
  var selectedTypes = getSelectValuesBySelectId("type-select");
  var minDifficulty = parseInt(document.getElementById("min-difficulty").value);
  var maxDifficulty = parseInt(document.getElementById("max-difficulty").value);

  getMatchingExercisesPromise(
    selectedMuscles,
    selectedTypes,
    minDifficulty,
    maxDifficulty
  ).then((matchingExercises) => {
    if (matchingExercises != null && matchingExercises.length > 0) {
      var overwrites = readOverwriteValues();

      if (editRowId != null) {
        var exerciseTemplate = preparedExerciseTemplates[editRowId];
        exerciseTemplate.muscles = selectedMuscles;
        exerciseTemplate.types = selectedTypes;
        exerciseTemplate.difficultyMin = minDifficulty;
        exerciseTemplate.difficultyMax = maxDifficulty;
        exerciseTemplate.overwriteTime = overwrites.overwriteTime;
        exerciseTemplate.overwriteRestTime = overwrites.overwriteRestTime;
        exerciseTemplate.overwriteSetCount = overwrites.overwriteSetCount;
        exerciseTemplate.overwriteSetRestTime = overwrites.overwriteSetRestTime;

        var editedRow = document.getElementById(editRowId);
        editedRow.querySelector(".row-label").textContent =
          exerciseRowSummary(exerciseTemplate);
        fillSwatch(editedRow.querySelector(".rotes-quadrat"), exerciseTemplate);
      } else {
        addExerciseRow(
          new ExerciseTemplate(
            selectedMuscles,
            selectedTypes,
            minDifficulty,
            maxDifficulty,
            overwrites.overwriteTime,
            overwrites.overwriteRestTime,
            overwrites.overwriteSetCount,
            overwrites.overwriteSetRestTime
          )
        );
      }
      closeDialog("exercise-template-dialog");
    } else {
      toast("No exercises match the selected conditions", "error", 5);
    }
  });
}

// Fill the color swatch with the difficulty colors: one block for the min and
// one for the max difficulty, stacked vertically. A single block when there is
// no range (min == max).
function fillSwatch(swatch, exerciseTemplate) {
  swatch.innerHTML = "";

  var difficulties =
    exerciseTemplate.difficultyMin === exerciseTemplate.difficultyMax
      ? [exerciseTemplate.difficultyMin]
      : [exerciseTemplate.difficultyMax, exerciseTemplate.difficultyMin];

  difficulties.forEach((difficulty) => {
    var part = document.createElement("div");
    part.classList.add("swatch-part");
    part.style.backgroundColor = difficultyToColor(difficulty);
    swatch.appendChild(part);
  });
}

// Human-readable summary of a template's muscles, types and difficulty range,
// shown as the exercise row's label.
function exerciseRowSummary(exerciseTemplate) {
  var muscles = exerciseTemplate.muscles.map(capitalizeWords).join(", ");
  var types = exerciseTemplate.types.map(capitalizeWords).join(", ");

  var summary = muscles || "Any muscle";
  if (types) {
    summary += " — " + types;
  }
  summary +=
    " (difficulty " +
    exerciseTemplate.difficultyMin +
    "–" +
    exerciseTemplate.difficultyMax +
    ")";
  return summary;
}

// Build a row in the exercise list for the given template, register it in
// preparedExerciseTemplates and wire up its remove/edit/move controls.
function addExerciseRow(exerciseTemplate) {
  var id = "ex_id_" + Date.now() + "" + rowCounter++;
  preparedExerciseTemplates[id] = exerciseTemplate;

  var container = document.getElementById("container");

  var newRow = document.createElement("div");
  newRow.id = id;
  newRow.classList.add("row");

  var rotesQuadrat = document.createElement("div");
  rotesQuadrat.classList.add("rotes-quadrat");
  fillSwatch(rotesQuadrat, exerciseTemplate);
  newRow.appendChild(rotesQuadrat);

  var label = document.createElement("span");
  label.classList.add("row-label");
  label.textContent = exerciseRowSummary(exerciseTemplate);
  newRow.appendChild(label);

  var deleteButton = document.createElement("button");
  deleteButton.classList.add("delete-button");
  deleteButton.textContent = "Remove";
  deleteButton.addEventListener("click", function () {
    container.removeChild(newRow);
    delete preparedExerciseTemplates[id];
    document.getElementById("save-workout-button").disabled =
      Object.values(preparedExerciseTemplates).length == 0;
  });
  newRow.appendChild(deleteButton);

  var editButton = document.createElement("button");
  editButton.classList.add("edit-button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    editExerciseRowInput(exerciseTemplate, newRow);
  });
  newRow.appendChild(editButton);

  var moveDownButton = document.createElement("button");
  moveDownButton.classList.add("move-down-button");
  moveDownButton.textContent = "Move Down";
  moveDownButton.addEventListener("click", function () {
    const nextRow = newRow.nextElementSibling;
    if (nextRow) {
      container.insertBefore(nextRow, newRow);
      setMoveButtons(nextRow);
      setMoveButtons(newRow);
    }
  });
  moveDownButton.disabled = true;
  newRow.appendChild(moveDownButton);

  var moveUpButton = document.createElement("button");
  moveUpButton.classList.add("move-up-button");
  moveUpButton.textContent = "Move Up";
  moveUpButton.addEventListener("click", function () {
    const previousRow = newRow.previousElementSibling;
    if (previousRow) {
      container.insertBefore(newRow, previousRow);
      setMoveButtons(previousRow);
      setMoveButtons(newRow);
    }
  });
  moveUpButton.disabled = container.childNodes.length == 0;
  newRow.appendChild(moveUpButton);

  if (container.childNodes.length > 0) {
    container.lastChild.querySelector(".move-down-button").disabled = false;
  }

  container.appendChild(newRow);
  document.getElementById("save-workout-button").disabled = false;
}

function setMoveButtons(row) {
  row.querySelector(".move-up-button").disabled =
    row.previousElementSibling == null;
  row.querySelector(".move-down-button").disabled =
    row.nextElementSibling == null;
}

function validateExerciseRowInput() {
  var hasError = false;

  if (acceptedOnce == true) {
    var selectedMusclesDropdown = document.getElementById(
      "muscle-select-dropdown"
    );
    var selectedMuscles = getSelectValuesBySelectId("muscle-select");
    if (selectedMuscles == null || selectedMuscles.length == 0) {
      hasError = true;
      selectedMusclesDropdown.classList.add("has-error");
    } else {
      selectedMusclesDropdown.classList.remove("has-error");
    }
  }

  if (acceptedOnce == true) {
    var selectedTypesDropdown = document.getElementById("type-select-dropdown");
    var selectedTypes = getSelectValuesBySelectId("type-select");
    if (selectedTypes == null) {
      hasError = true;
      selectedTypesDropdown.classList.add("has-error");
    } else {
      selectedTypesDropdown.classList.remove("has-error");
    }
  }

  var minDifficultyElement = document.getElementById("min-difficulty");
  var maxDifficultyElement = document.getElementById("max-difficulty");
  var minDifficulty = parseInt(minDifficultyElement.value);
  var maxDifficulty = parseInt(maxDifficultyElement.value);

  if (minDifficulty == null || minDifficulty > maxDifficulty) {
    hasError = true;
    minDifficultyElement.classList.add("has-error");
  } else {
    minDifficultyElement.classList.remove("has-error");
  }

  if (maxDifficulty == null || minDifficulty > maxDifficulty) {
    hasError = true;
    maxDifficultyElement.classList.add("has-error");
  } else {
    maxDifficultyElement.classList.remove("has-error");
  }

  return hasError == false;
}

function updateMatchingExercises() {
  var selectedMuscles = getSelectValuesBySelectId("muscle-select");
  var selectedTypes = getSelectValuesBySelectId("type-select");
  var minDifficulty = parseInt(document.getElementById("min-difficulty").value);
  var maxDifficulty = parseInt(document.getElementById("max-difficulty").value);

  validateExerciseRowInput();

  getMatchingExercisesPromise(
    selectedMuscles,
    selectedTypes,
    minDifficulty,
    maxDifficulty
  ).then((matchingExercises) => {
    matchingExercises ??= [];
    document.getElementById("matching-exercises").textContent =
      "" + matchingExercises.length;
    document.getElementById("confirm-exercise-button").disabled =
      matchingExercises.length == 0;
  });
}

function editExerciseRowInput(exerciseTemplate, rowElement) {
  editRowId = rowElement.id;
  document.getElementById("min-difficulty").value =
    exerciseTemplate.difficultyMin;
  document.getElementById("max-difficulty").value =
    exerciseTemplate.difficultyMax;
  setSelectedValues(
    document.getElementById("muscle-select"),
    exerciseTemplate.muscles
  );
  setSelectedValues(
    document.getElementById("type-select"),
    exerciseTemplate.types
  );

  setOverwriteField("overwrite-exercise-time", exerciseTemplate.overwriteTime);
  setOverwriteField("overwrite-rest-time", exerciseTemplate.overwriteRestTime);
  setOverwriteField("overwrite-set-count", exerciseTemplate.overwriteSetCount);
  setOverwriteField("overwrite-set-rest-time", exerciseTemplate.overwriteSetRestTime);
  setOptionalParamsOpen(
    [
      exerciseTemplate.overwriteTime,
      exerciseTemplate.overwriteRestTime,
      exerciseTemplate.overwriteSetCount,
      exerciseTemplate.overwriteSetRestTime,
    ].some((value) => value != null)
  );

  updateMatchingExercises();

  openDialog("exercise-template-dialog");
}

function getMatchingExercisesPromise(
  selectedMuscles,
  selectedTypes,
  minDifficulty,
  maxDifficulty
) {
  if (
    selectedMuscles.length == 0 ||
    minDifficulty > maxDifficulty ||
    minDifficulty < 0
  ) {
    return Promise.resolve();
  }

  return getDataPromise().then((data) =>
    findMatchingExercises(
      data,
      selectedMuscles,
      selectedTypes,
      minDifficulty,
      maxDifficulty
    )
  );
}

function saveWorkout() {
  var nameInput = document.getElementById("name-input");
  var enteredName = nameInput.value.trim();

  if (enteredName == "") {
    const currentTimestamp = new Date().getTime();
    const currentDate = new Date(currentTimestamp);
    const targetDate = new Date(2024, 0, 1);
    const timeDifference = currentDate - targetDate;
    enteredName = "Workout " + timeDifference;
  }

  var existingWorkouts = loadObject("workouts");
  if (existingWorkouts == null) {
    existingWorkouts = {};
  }

  // A clashing name is only an error when it is a *different* workout than the
  // one being edited.
  if (
    existingWorkouts.hasOwnProperty(enteredName) &&
    enteredName !== editingWorkoutName
  ) {
    nameInput.classList.add("has-error");
    toast("A workout with this name already exists", "error", 5);
    return;
  }
  nameInput.classList.remove("has-error");

  // If the workout was renamed while editing, drop the old entry.
  if (editingWorkoutName != null && editingWorkoutName !== enteredName) {
    delete existingWorkouts[editingWorkoutName];
  }

  var container = document.getElementById("container");
  var orderedExerciseTemplates = Array.from(container.childNodes).map(
    (child) => preparedExerciseTemplates[child.id]
  );

  existingWorkouts[enteredName] = new WorkoutTemplate(
    enteredName,
    orderedExerciseTemplates,
    parseInt(document.getElementById("exercise-time-input").value),
    parseInt(document.getElementById("rest-time-input").value),
    parseInt(document.getElementById("set-count-input").value),
    parseInt(document.getElementById("set-rest-time-input").value),
    parseInt(document.getElementById("circuit-count-input").value)
  );

  saveObject("workouts", existingWorkouts);
  closeDialog("save-dialog");

  showPage(PAGES.StartMenu);
}

function setCountUpdated(event) {
  const input = event.target;
  const value = parseInt(input.value);
  if (isNaN(value) || value == 1) {
    document.getElementById('set-rest-time-field').classList.add('disabled');
    document.getElementById('set-rest-time-input').disabled = true;
  } else {
    document.getElementById('set-rest-time-field').classList.remove('disabled');
    document.getElementById('set-rest-time-input').disabled = false;
  }
}

//#region dialog helper

function resetRowDialog() {
  resetSelectedValues(document.getElementById("muscle-select"));
  resetSelectedValues(document.getElementById("type-select"));
  document.getElementById("min-difficulty").value = 0;
  document.getElementById("max-difficulty").value = 8;

  Object.keys(OVERWRITE_FIELDS).forEach((prefix) => {
    document.getElementById(prefix + "-enabled").checked = false;
    var input = document.getElementById(prefix + "-input");
    input.value = input.getAttribute("defaultvalue");
    toggleOverwriteField(prefix);
  });
  setOptionalParamsOpen(false);

  acceptedOnce = false;
  editRowId = null;
  updateMatchingExercises();
}

function openDialog(id) {
  document.getElementById(id).showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}

//#endregion

//#region helper

function validateNumberInput(event) {
  const input = event.target;
  const value = parseInt(input.value);
  const min = parseInt(input.min || 0);

  if (isNaN(value)) {
    input.value = parseInt(input.getAttribute("defaultvalue")) || min;
  } else {
    const max = parseInt(input.max || Number.MAX_SAFE_INTEGER);

    if (value < min) {
      input.value = min;
    } else if (value > max) {
      input.value = max;
    }
  }
}

//#endregion
