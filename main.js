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
  } else {
    names.forEach((name) => {
      var row = makeRow(name);

      addRowButton(row, 'Start', null, () => {
        showPage(PAGES.WorkoutPreview + '?template=' + encodeURIComponent(name));
      });
      addRowButton(row, 'Edit', 'secondary', () => {
        showPage(PAGES.CreateWorkoutTemplate + '?template=' + encodeURIComponent(name));
      });
      addRowButton(row, 'Delete', 'delete', () => {
        confirmDelete('template "' + name + '"', () => {
          deleteTemplateFromStorage(name);
          openTemplatesDialog();
        });
      });

      list.appendChild(row);
    });
  }

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
