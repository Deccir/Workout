// Manage Exercises: list every exercise (base JSON records plus the user's
// edits/additions, minus deleted base ones), and add / edit / delete them.
// Edits and additions are stored in localStorage and overwrite the JSON at load
// (see loader.js: upsertExerciseOverride / deleteExercise / mergeRawExercises).

// Names present in the shipped JSON. Deleting one of these records the deletion;
// deleting a purely custom exercise just drops its override.
var baseExerciseNames = new Set();
// Currently rendered raw exercises, keyed by name — used for collision checks.
var currentExercisesByName = {};
// Original name of the exercise being edited (null when adding a new one).
var editingName = null;

window.addEventListener("load", () => {
  loadAppData()
    .then((data) => {
      fillSelect("muscle-select", data.muscles);
      fillSelect("type-select", data.types);
    })
    .then(() => initializeMultiSelectDropdown());

  loadRawExercisesJson().then((raw) => {
    (raw || []).forEach((exercise) => baseExerciseNames.add(exercise.name));
  });

  document.getElementById("exercise-dialog")
    .addEventListener("close", resetDialog);

  renderExerciseList();
});

function fillSelect(selectId, items) {
  var select = document.getElementById(selectId);
  items.forEach((item) => {
    var option = document.createElement("option");
    option.value = item.name;
    option.textContent = capitalizeWords(item.name);
    select.appendChild(option);
  });
}

// ---------- List ----------

function renderExerciseList() {
  loadMergedRawExercises().then((exercises) => {
    currentExercisesByName = {};
    exercises.forEach((exercise) => {
      currentExercisesByName[exercise.name] = exercise;
    });

    var query = document.getElementById("search-input").value.trim().toLowerCase();
    var list = document.getElementById("exercise-list");
    list.innerHTML = "";

    exercises
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((exercise) => exercise.name.toLowerCase().includes(query))
      .forEach((exercise) => list.appendChild(makeExerciseRow(exercise)));
  });
}

function makeExerciseRow(exercise) {
  var row = document.createElement("div");
  row.classList.add("row");

  var swatch = document.createElement("div");
  swatch.classList.add("difficulty-swatch");
  var part = document.createElement("div");
  part.classList.add("swatch-part");
  part.style.backgroundColor = difficultyToColor(exercise.difficulty);
  swatch.appendChild(part);
  row.appendChild(swatch);

  var text = document.createElement("div");
  text.classList.add("row-text");

  var label = document.createElement("div");
  label.classList.add("row-label");
  label.textContent = exercise.name;
  text.appendChild(label);

  var sub = document.createElement("div");
  sub.classList.add("row-sub");
  sub.textContent = exerciseSummary(exercise);
  text.appendChild(sub);
  row.appendChild(text);

  var actions = document.createElement("div");
  actions.classList.add("row-actions");
  row.appendChild(actions);

  var editButton = makeIconButton("edit-button", "✎", "Edit");
  editButton.addEventListener("click", () => openEditDialog(exercise));
  actions.appendChild(editButton);

  var deleteButton = makeIconButton("delete-button", "✕", "Delete");
  deleteButton.addEventListener("click", () => confirmDeleteExercise(exercise.name));
  actions.appendChild(deleteButton);

  return row;
}

function exerciseSummary(exercise) {
  var muscles = (exercise.muscles || []).map(capitalizeWords).join(", ") || "Any muscle";
  var types = (exercise.types || []).map(capitalizeWords).join(", ");
  var summary = muscles;
  if (types) {
    summary += " — " + types;
  }
  summary += " (difficulty " + exercise.difficulty + ")";
  return summary;
}

function makeIconButton(className, glyph, label) {
  var button = document.createElement("button");
  button.classList.add("icon-button", className);
  button.textContent = glyph;
  button.title = label;
  button.setAttribute("aria-label", label);
  return button;
}

// ---------- Add / Edit dialog ----------

function openAddDialog() {
  editingName = null;
  document.getElementById("exercise-dialog-title").textContent = "Add exercise";
  openDialog("exercise-dialog");
}

function openEditDialog(exercise) {
  editingName = exercise.name;
  document.getElementById("exercise-dialog-title").textContent = "Edit exercise";
  document.getElementById("name-input").value = exercise.name;
  document.getElementById("difficulty-input").value = exercise.difficulty;
  document.getElementById("link-input").value = exercise.link || "";
  setSelectedValues(document.getElementById("muscle-select"), exercise.muscles || []);
  setSelectedValues(document.getElementById("type-select"), exercise.types || []);
  openDialog("exercise-dialog");
}

function saveExercise() {
  var nameInput = document.getElementById("name-input");
  var name = nameInput.value.trim();
  var muscles = getSelectValuesBySelectId("muscle-select");
  var types = getSelectValuesBySelectId("type-select");

  if (name === "") {
    nameInput.classList.add("has-error");
    toast("Please enter a name", "error", 5);
    return;
  }
  nameInput.classList.remove("has-error");

  // Collision only when the name belongs to a *different* exercise.
  if (currentExercisesByName.hasOwnProperty(name) && name !== editingName) {
    nameInput.classList.add("has-error");
    toast("An exercise with this name already exists", "error", 5);
    return;
  }

  if (muscles.length === 0) {
    toast("Please select at least one muscle group", "error", 5);
    return;
  }

  var exercise = {
    name: name,
    muscles: muscles,
    difficulty: Math.min(8, readIntInput("difficulty-input")),
    link: document.getElementById("link-input").value.trim(),
    types: types,
  };

  // On rename, drop the old record before writing the new one.
  if (editingName != null && editingName !== name) {
    deleteExercise(editingName, baseExerciseNames.has(editingName));
  }

  upsertExerciseOverride(exercise);
  closeDialog("exercise-dialog");
  renderExerciseList();
  toast("Exercise saved", "success", 3);
}

function resetDialog() {
  document.getElementById("name-input").value = "";
  document.getElementById("name-input").classList.remove("has-error");
  document.getElementById("difficulty-input").value = 0;
  document.getElementById("link-input").value = "";
  resetSelectedValues(document.getElementById("muscle-select"));
  resetSelectedValues(document.getElementById("type-select"));
  editingName = null;
}

// ---------- Delete ----------

function confirmDeleteExercise(name) {
  document.getElementById("confirm-delete-message").textContent =
    'Delete exercise "' + name + '"? This cannot be undone.';

  var button = document.getElementById("confirm-delete-button");
  var fresh = button.cloneNode(true);
  button.parentNode.replaceChild(fresh, button);
  fresh.addEventListener("click", () => {
    closeDialog("confirm-delete-dialog");
    deleteExercise(name, baseExerciseNames.has(name));
    renderExerciseList();
    toast("Exercise deleted", "success", 3);
  });

  openDialog("confirm-delete-dialog");
}
