// App root, derived from this script's location so it works at any deploy path
// (site root or a GitHub Pages project subdir like /Workout/).
const APP_BASE = new URL('.', document.currentScript.src).href;

const PAGES = {
  Home: APP_BASE,
  CreateWorkoutTemplate: APP_BASE + 'pages/createWorkoutTemplate/createWorkoutTemplate.html',
  WorkoutEditor: APP_BASE + 'pages/workoutEditor/workoutEditor.html',
  WorkoutPreview: APP_BASE + 'pages/workoutPreview/workoutPreview.html',
  RunWorkout: APP_BASE + 'pages/workout/workout.html'
}

function showPage(pageUrl) {
  window.location.href = pageUrl
}

// Session-scoped handoff of a built Workout that is not (yet) saved to storage,
// used by the WorkoutPreview "Start" button to run the current configuration.
function setPendingWorkout(workout) {
  sessionStorage.setItem('pendingWorkout', JSON.stringify(workout));
}

function takePendingWorkout() {
  var raw = sessionStorage.getItem('pendingWorkout');
  sessionStorage.removeItem('pendingWorkout');
  return raw == null ? null : JSON.parse(raw);
}

function getURLParameter(parameterName) {
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(parameterName);
}

// ---------- Dialog helpers (shared by every page) ----------

function openDialog(id) {
  var dialog = document.getElementById(id);
  // Idempotent: showModal() throws if the dialog is already open (e.g. when a
  // list dialog re-renders itself after a delete).
  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeDialog(id) {
  document.getElementById(id).close();
}
