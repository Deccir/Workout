// Home page: open the template/workout dialogs and route to the editors, the
// preview and the runner.

// ---------- My Workout Templates ----------

function openTemplatesDialog() {
  var templates = loadTemplatesFromStorage();
  var names = Object.keys(templates);
  var list = document.getElementById('templates-list');
  list.innerHTML = '';

  if (names.length == 0) {
    list.appendChild(emptyMessage('No workout templates yet. Create one first.'));
    openDialog('templates-dialog');
    return;
  }

  // Matching depends on the current exercise set, so resolve app data first to
  // flag templates whose exercise templates no longer match anything.
  loadAppData().then((data) => {
    names.forEach((name) => {
      var runnable = isTemplateRunnable(templates[name], data);
      var row = makeRow(name);
      if (!runnable) {
        row.classList.add('workout-row--broken');
        var warning = document.createElement('span');
        warning.classList.add('row-warning');
        warning.textContent = '⚠ no matching exercises';
        row.querySelector('.workout-name').insertAdjacentElement('afterend', warning);
      }

      var start = addRowButton(row, 'Start', null, () => {
        showPage(PAGES.WorkoutPreview + '?template=' + encodeURIComponent(name));
      });
      start.disabled = !runnable;
      if (!runnable) {
        start.title = 'Edit this template to fix its exercises before starting';
      }

      addRowButton(row, 'Edit', 'secondary', () => {
        showPage(PAGES.CreateWorkoutTemplate + '?template=' + encodeURIComponent(name));
      });
      addRowButton(row, 'Duplicate', 'secondary', () => {
        var copyName = duplicateTemplate(name);
        showPage(PAGES.CreateWorkoutTemplate + '?template=' + encodeURIComponent(copyName));
      });
      addRowButton(row, 'Delete', 'delete', () => {
        confirmDelete('template "' + name + '"', () => {
          deleteTemplateFromStorage(name);
          openTemplatesDialog();
        });
      });

      list.appendChild(row);
    });
  });

  openDialog('templates-dialog');
}

// ---------- Saved Workouts ----------

function openWorkoutsDialog() {
  var workouts = loadWorkoutsFromStorage();
  var names = Object.keys(workouts);
  var list = document.getElementById('workouts-list');
  list.innerHTML = '';

  if (names.length == 0) {
    list.appendChild(emptyMessage('No saved workouts yet.'));
  } else {
    names.forEach((name) => {
      var row = makeRow(name);

      addRowButton(row, 'Start', null, () => {
        showPage(PAGES.RunWorkout + '?workout=' + encodeURIComponent(name));
      });
      addRowButton(row, 'Edit', 'secondary', () => {
        showPage(PAGES.WorkoutEditor + '?workout=' + encodeURIComponent(name));
      });
      addRowButton(row, 'Duplicate', 'secondary', () => {
        var copyName = duplicateWorkout(name);
        showPage(PAGES.WorkoutEditor + '?workout=' + encodeURIComponent(copyName));
      });
      addRowButton(row, 'Delete', 'delete', () => {
        confirmDelete('workout "' + name + '"', () => {
          deleteWorkoutFromStorage(name);
          openWorkoutsDialog();
        });
      });

      list.appendChild(row);
    });
  }

  openDialog('workouts-dialog');
}

// ---------- Duplicate ----------

// A name not already used as a key in `existing`, based on `base`:
// "Name (copy)", then "Name (copy 2)", "Name (copy 3)", …
function uniqueCopyName(base, existing) {
  var candidate = base + ' (copy)';
  var counter = 2;
  while (existing.hasOwnProperty(candidate)) {
    candidate = base + ' (copy ' + counter + ')';
    counter++;
  }
  return candidate;
}

function duplicateTemplate(name) {
  var templates = loadTemplatesFromStorage();
  var copyName = uniqueCopyName(name, templates);
  var copy = JSON.parse(JSON.stringify(templates[name]));
  copy.name = copyName;
  templates[copyName] = copy;
  saveToStorage('templates', templates);
  return copyName;
}

function duplicateWorkout(name) {
  var workouts = loadWorkoutsFromStorage();
  var copyName = uniqueCopyName(name, workouts);
  var copy = JSON.parse(JSON.stringify(workouts[name]));
  copy.name = copyName;
  workouts[copyName] = copy;
  saveToStorage('workouts', workouts);
  return copyName;
}

// ---------- Export / Import ----------

// Download every localStorage entry (templates, workouts, exercise edits, …) as
// one JSON backup file. Values are the raw stored strings so they round-trip.
function exportData() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'workout-shuffle-backup.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Replace all localStorage with the contents of a backup file, then reload so
// every page picks up the imported data.
function importData(event) {
  var file = event.target.files[0];
  if (file == null) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function () {
    var data;
    try {
      data = JSON.parse(reader.result);
    } catch (error) {
      data = null;
    }

    if (data == null || typeof data !== 'object') {
      toast('Invalid backup file', 'error', 5);
      event.target.value = '';
      return;
    }

    if (!confirm('Importing replaces all current data. Continue?')) {
      event.target.value = '';
      return;
    }

    localStorage.clear();
    Object.keys(data).forEach((key) => {
      localStorage.setItem(key, data[key]);
    });

    toast('Data imported', 'success', 3);
    event.target.value = '';
    setTimeout(() => window.location.reload(), 600);
  };
  reader.readAsText(file);
}

// ---------- Shared delete confirmation ----------

function confirmDelete(label, onConfirm) {
  document.getElementById('confirm-delete-message').textContent =
    'Delete ' + label + '? This cannot be undone.';

  var button = document.getElementById('confirm-delete-button');
  // Replace the button to drop any previously attached handler.
  var fresh = button.cloneNode(true);
  button.parentNode.replaceChild(fresh, button);
  fresh.addEventListener('click', () => {
    closeDialog('confirm-delete-dialog');
    onConfirm();
  });

  openDialog('confirm-delete-dialog');
}

// ---------- Row helpers ----------

function makeRow(name) {
  var row = document.createElement('div');
  row.classList.add('workout-row');

  var label = document.createElement('span');
  label.classList.add('workout-name');
  label.textContent = name;
  row.appendChild(label);

  return row;
}

function addRowButton(row, text, variant, onClick) {
  var button = document.createElement('button');
  button.textContent = text;
  if (variant) {
    button.classList.add(variant);
  }
  button.addEventListener('click', onClick);
  row.appendChild(button);
  return button;
}

function emptyMessage(text) {
  var element = document.createElement('p');
  element.classList.add('empty-message');
  element.textContent = text;
  return element;
}
