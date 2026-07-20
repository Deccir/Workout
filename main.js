// Open a dialog listing saved workouts so the user can pick which one to run.
function startWorkout() {
  var savedWorkouts = loadObject('workouts') || {};
  var names = Object.keys(savedWorkouts);
  var list = document.getElementById('workout-list');
  list.innerHTML = '';

  if (names.length == 0) {
    var empty = document.createElement('p');
    empty.textContent = 'No workouts yet. Create one first.';
    list.appendChild(empty);
  } else {
    names.forEach((name) => {
      var row = document.createElement('div');
      row.classList.add('workout-row');

      var label = document.createElement('span');
      label.classList.add('workout-name');
      label.textContent = name;
      row.appendChild(label);

      var startButton = document.createElement('button');
      startButton.textContent = 'Start';
      startButton.addEventListener('click', () => {
        showPage(PAGES.Training + '?workout=' + encodeURIComponent(name));
      });
      row.appendChild(startButton);

      var editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('secondary');
      editButton.addEventListener('click', () => {
        showPage(PAGES.CreateTraining + '?workout=' + encodeURIComponent(name));
      });
      row.appendChild(editButton);

      list.appendChild(row);
    });
  }

  openDialog('select-workout-dialog');
}

// Funktion für den Knopf 'Plan erstellen' (noch ohne spezifische Funktion)
function createWorkoutTemplate() {
  showPage(PAGES.CreateTraining)
}

function openDialog(id) {
  document.getElementById(id).showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}
