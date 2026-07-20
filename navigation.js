PAGES = {
  StartMenu: '/',
  CreateTraining: '/pages/createWorkoutTemplate/createWorkoutTemplate',
  Training: '/pages/workout/workout'
}

function showPage(pageLink) {
  window.location.href = pageLink
}

function getURLParameter(parameterName) {
  var urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(parameterName);
}