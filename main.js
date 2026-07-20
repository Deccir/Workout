function difficultyToColor(difficulty) {
  switch (difficulty) {
    case 0:
      return '#94ffff';
    case 1:
      return '#daf7a6';
    case 2:
      return '#d8f654'
    case 3:
      return '#ffc300';
    case 4:
      return '#ffae00';
    case 5:
      return '#ff4600';
    case 6:
      return '#C70039';
    case 7:
      return '#900C3F';
    case 8:
      return '#000000';
    default:
      return '#94ffff';
  }
}

// Funktion zum Starten des Trainings (wird vom Startmenü aufgerufen)
function startWorkout() {
  showPage(PAGES.Training)
}

// Funktion für den Knopf 'Plan erstellen' (noch ohne spezifische Funktion)
function createWorkoutTemplate() {
  showPage(PAGES.CreateTraining)
}
