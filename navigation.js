// App root, derived from this script's location so it works at any deploy path
// (site root or a GitHub Pages project subdir like /Workout/).
const APP_BASE = new URL('.', document.currentScript.src).href;

const PAGES = {
  Home: APP_BASE,
  CreateWorkout: APP_BASE + 'pages/createWorkoutTemplate/createWorkoutTemplate.html',
  RunWorkout: APP_BASE + 'pages/workout/workout.html'
}

function showPage(pageUrl) {
  window.location.href = pageUrl
}

function getURLParameter(parameterName) {
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(parameterName);
}

// ---------- Dialog helpers (shared by every page) ----------

function openDialog(id) {
  document.getElementById(id).showModal();
}

function closeDialog(id) {
  document.getElementById(id).close();
}
