// Das img-Element, in dem das aktuelle Gif angezeigt wird
var gifImage;

// Die Indexvariable, um das aktuelle Gif zu verfolgen
var currentExerciseIndex = 0;

// Die Progress-Bar-Elemente
var progressBar;
var progressFill;

// Variable, um den Pausenstatus der Progress-Bar zu verfolgen
var isPaused = false;

// Variable für die 15-Sekunden-Dauer
var duration = 5000; // Dauer in Millisekunden (15 Sekunden)
var startTime = 0;
var endTime = 0;
var pausedTime = 0;

var exercises = null
var currentWorkout = null

window.addEventListener('load', function () {
  gifImage = document.getElementById('tutorialVideo');
  progressBar = document.getElementById('progressBar');
  progressFill = document.getElementById('progressFill');

  getDataPromise()
    .then(data => exercises = data.exercises)
    .then(data => currentWorkout = new Workout('test', ['Stick Dislocation', 'Push up'], 40, 15))
    .then(data => showCurrentExercise());
});

// Funktion zum Anzeigen des aktuellen Gifs
function showCurrentExercise() {
  progressFill.style.width = '0%';

  gifImage.src = exercises[currentWorkout.exerciseNames[currentExerciseIndex]].link;
  gifImage.alt = 'Exercise ' + (currentExerciseIndex + 1);

  startProgressBar();
  
  speak(currentWorkout.exerciseNames[currentExerciseIndex]);
}

// Funktion zum Navigieren zum vorherigen Gif
function previousExercise() {
  currentExerciseIndex = (currentExerciseIndex - 1 + currentWorkout.exerciseNames.length) % currentWorkout.exerciseNames.length;
  showCurrentExercise();
}

// Funktion zum Navigieren zum nächsten Gif
function nextExercise() {
  currentExerciseIndex = (currentExerciseIndex + 1) % currentWorkout.exerciseNames.length;
  showCurrentExercise();
}

// Funktion zum Abbrechen des Trainings (führt zurück zum Startmenü)
function cancelTraining() {
  // Stoppe den Fortschritt der Progress-Bar und setze die Zeitgeber zurück
  isPaused = true;
  startTime = endTime = pausedTime = 0

  // Navigiere zurück zur 
  showPage(PAGES.StartMenu)
}

// Funktion zum Starten der Progress-Bar
function startProgressBar() {
  pausedTime = 0;
  startTime = new Date().getTime() - pausedTime;
  endTime = startTime + duration;
  isPaused = false
  updateProgressBar();
}

// Funktion zum Aktualisieren der Progress-Bar
function updateProgressBar() {
  if (isPaused) {
    return
  }

  var currentTime = new Date().getTime();
  if (currentTime < endTime) {
    // Berechne den Fortschritt in Prozent
    var progress = ((currentTime - startTime) / duration) * 100;
    progressFill.style.width = progress + '%';
    setTimeout(updateProgressBar, 10);
  } else {
    // Setze den Fortschritt auf 100 %, wenn die Dauer abgelaufen ist
    progressFill.style.width = '100%';
    nextExercise();
  }
}

// Funktion zum Pausieren/Weiterführen der Progress-Bar
function togglePauseResume() {
  var pauseResumeButton = document.querySelector('button[onclick="togglePauseResume()"]');

  // if (startTime == endTime && startTime == 0) {
  //   startProgressBar();
  //   pauseResumeButton.innerHTML = 'Pause';
  //   return;
  // }

  isPaused = !isPaused;

  // Ändere den Text des Knopfs basierend auf dem Pausenstatus
  var currentTime = new Date().getTime()
  if (isPaused) {
    pauseResumeButton.innerHTML = 'Continue';
    pausedTime = currentTime;
  } else {
    pauseResumeButton.innerHTML = 'Pause';
    var stoppedTime = currentTime - pausedTime;
    endTime += stoppedTime;
    startTime += stoppedTime;
    updateProgressBar();
  }
}

function speak(message) {
  // Überprüfen, ob die Web Speech API vom Browser unterstützt wird
  if ('speechSynthesis' in window) {
    // Text-to-Speech Funktion
    function textToSpeech(text) {
      // Eine neue SpeechSynthesisUtterance-Instanz erstellen
      var utterance = new SpeechSynthesisUtterance(text);

      // Die Sprache für die Sprachausgabe festlegen (optional)
      utterance.lang = 'en-US'; // Englisch (US)

      // Die Sprachausgabe starten
      speechSynthesis.speak(utterance);
    }

    // Beispielaufruf
    textToSpeech(message);
  } else {
    console.error('Die Web Speech API wird in diesem Browser nicht unterstützt.');
  }
}
