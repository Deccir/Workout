// WorkoutPreview: turn a WorkoutTemplate into concrete exercise slots the user
// can reshuffle or hand-pick before starting or saving the workout.

var previewTemplate = null; // the WorkoutTemplate being previewed
var previewSlots = [];      // slots from buildSlotsFromTemplate, each with `chosen`
var pickSlotIndex = null;   // slot index currently open in the manual-pick dialog

window.addEventListener('load', function () {
  var name = getURLParameter('template');
  var templates = loadTemplatesFromStorage();
  previewTemplate = name != null ? templates[name] : null;

  if (previewTemplate == null) {
    toast('Template not found', 'error', 5);
    document.getElementById('preview-title').textContent = 'Template not found';
    document.getElementById('start-button').disabled = true;
    return;
  }

  document.getElementById('preview-title').textContent = previewTemplate.name;
  document.getElementById('save-name-input').value = previewTemplate.name;

  loadAppData().then((data) => {
    previewSlots = buildSlotsFromTemplate(previewTemplate, data);
    previewSlots.forEach((slot) => shuffleSlot(slot));
    renderSlots();
  });
});

// Pick a random exercise for a slot, avoiding the current one when possible.
function shuffleSlot(slot) {
  if (slot.matches.length == 0) {
    slot.chosen = null;
    return;
  }
  if (slot.matches.length == 1) {
    slot.chosen = slot.matches[0];
    return;
  }
  var choice;
  do {
    choice = slot.matches[Math.floor(Math.random() * slot.matches.length)];
  } while (choice === slot.chosen);
  slot.chosen = choice;
}

function reshuffleAll() {
  previewSlots.forEach((slot) => shuffleSlot(slot));
  renderSlots();
}

function renderSlots() {
  var list = document.getElementById('slot-list');
  list.innerHTML = '';

  previewSlots.forEach((slot, index) => {
    list.appendChild(buildSlotCard(slot, index));

    // Rest between exercises is shown between slots (not after the last one).
    if (index < previewSlots.length - 1 && slot.settings.restTime > 0) {
      var rest = document.createElement('div');
      rest.classList.add('rest-between');
      rest.textContent = 'Rest ' + slot.settings.restTime + 's';
      list.appendChild(rest);
    }
  });

  var hasExercise = previewSlots.some((slot) => slot.chosen != null);
  document.getElementById('start-button').disabled = !hasExercise;
}

function buildSlotCard(slot, index) {
  var card = document.createElement('div');
  card.classList.add('slot-card');

  var body = document.createElement('div');
  body.classList.add('slot-body');

  var name = document.createElement('div');
  name.classList.add('slot-name');
  name.textContent = slot.chosen != null ? slot.chosen : 'No matching exercise';
  if (slot.chosen == null) {
    name.classList.add('slot-name--empty');
  }
  body.appendChild(name);

  var meta = document.createElement('div');
  meta.classList.add('slot-meta');
  meta.textContent = slotMetaText(slot);
  body.appendChild(meta);

  card.appendChild(body);

  var actions = document.createElement('div');
  actions.classList.add('slot-actions');

  addIconButton(actions, 'ℹ', 'Slot details', () => openInfo(index));
  var reshuffle = addIconButton(actions, '⟳', 'Reshuffle', () => {
    shuffleSlot(slot);
    renderSlots();
  });
  var pick = addIconButton(actions, '☰', 'Pick manually', () => openPick(index));

  var pickable = slot.matches.length > 0;
  reshuffle.disabled = slot.matches.length < 2;
  pick.disabled = !pickable;

  card.appendChild(actions);
  return card;
}

// One-line summary of a slot's timing: duration, sets and rest between sets.
function slotMetaText(slot) {
  var parts = [slot.settings.time + 's'];
  if (slot.settings.setCount > 1) {
    parts.push('× ' + slot.settings.setCount + ' sets');
    if (slot.settings.setRestTime != null) {
      parts.push(slot.settings.setRestTime + 's between sets');
    }
  }
  return parts.join(' · ');
}

function addIconButton(container, glyph, label, onClick) {
  var button = document.createElement('button');
  button.classList.add('icon-button');
  button.textContent = glyph;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  container.appendChild(button);
  return button;
}

// ---------- Slot details dialog ----------

function openInfo(index) {
  var slot = previewSlots[index];
  var template = slot.exerciseTemplate;
  var content = document.getElementById('info-content');
  content.innerHTML = '';

  var rows = [
    ['Muscles', template.muscles.map(capitalizeWords).join(', ') || 'Any'],
    ['Types', template.types.map(capitalizeWords).join(', ') || 'Any'],
    ['Difficulty', template.difficultyMin + '–' + template.difficultyMax],
    ['Exercise time', slot.settings.time + 's'],
    ['Sets', String(slot.settings.setCount)],
    ['Rest between sets', slot.settings.setRestTime != null ? slot.settings.setRestTime + 's' : '—'],
    ['Rest after exercise', slot.settings.restTime + 's'],
    ['Matching exercises', String(slot.matches.length)],
  ];

  rows.forEach(([label, value]) => {
    var row = document.createElement('div');
    row.classList.add('info-row');

    var key = document.createElement('span');
    key.classList.add('info-key');
    key.textContent = label;
    row.appendChild(key);

    var val = document.createElement('span');
    val.classList.add('info-value');
    val.textContent = value;
    row.appendChild(val);

    content.appendChild(row);
  });

  openDialog('info-dialog');
}

// ---------- Manual pick dialog ----------

function openPick(index) {
  pickSlotIndex = index;
  var slot = previewSlots[index];
  var select = document.getElementById('pick-select');
  select.innerHTML = '';

  slot.matches.forEach((name) => {
    var option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    if (name === slot.chosen) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  openDialog('pick-dialog');
}

function confirmManualPick() {
  if (pickSlotIndex != null) {
    previewSlots[pickSlotIndex].chosen = document.getElementById('pick-select').value;
    renderSlots();
  }
  pickSlotIndex = null;
  closeDialog('pick-dialog');
}

// ---------- Start / Save ----------

function currentWorkout(name) {
  return new Workout(name, slotsToWorkoutExercises(previewSlots));
}

function startWorkout() {
  setPendingWorkout(currentWorkout(previewTemplate.name));
  showPage(PAGES.RunWorkout + '?source=preview');
}

function saveAsWorkout() {
  var nameInput = document.getElementById('save-name-input');
  var name = nameInput.value.trim();
  if (name == '') {
    nameInput.classList.add('has-error');
    toast('Please enter a name', 'error', 5);
    return;
  }
  nameInput.classList.remove('has-error');

  var workouts = loadWorkoutsFromStorage();
  workouts[name] = currentWorkout(name);
  saveToStorage('workouts', workouts);

  closeDialog('save-dialog');
  toast('Workout saved', 'success', 3);
}
