// App root, derived from this script's location so it works at any deploy path
// (site root or a GitHub Pages project subdir like /Workout/).
const APP_BASE = new URL('.', document.currentScript.src).href;

PAGES = {
  StartMenu: APP_BASE,
  CreateTraining: APP_BASE + 'pages/createWorkoutTemplate/createWorkoutTemplate.html',
  Training: APP_BASE + 'pages/workout/workout.html'
}

function showPage(pageLink) {
  window.location.href = pageLink
}

function getURLParameter(parameterName) {
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(parameterName);
}