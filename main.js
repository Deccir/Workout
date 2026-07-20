// Open a dialog listing saved workouts so the user can pick which one to run.
function startWorkout() {
  var savedWorkouts = loadFromStorage('workouts') || {};
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
        showPage(PAGES.RunWorkout + '?workout=' + encodeURIComponent(name));
      });
      row.appendChild(startButton);

      var editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('secondary');
      editButton.addEventListener('click', () => {
        showPage(PAGES.CreateWorkout + '?workout=' + encodeURIComponent(name));
      });
      row.appendChild(editButton);

      list.appendChild(row);
    });
  }

  openDialog('select-workout-dialog');
}

// Navigate to the workout creation page.
function createWorkoutTemplate() {
  showPage(PAGES.CreateWorkout)
}
