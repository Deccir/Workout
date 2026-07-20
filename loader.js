const ASSET_BASE = new URL('.', document.currentScript.src).href;

class Exercise {
  constructor(name, muscles, difficulty, link, types) {
    this.name = name;
    this.muscles = muscles;
    this.difficulty = difficulty;
    this.link = link;
    this.types = types;
  }
}

class WorkoutTemplate {
  constructor(name, exerciseTemplates, exerciseTime, restTime, setCount, setRestTime, circuitCount) {
    this.name = name;
    this.exerciseTemplates = exerciseTemplates;
    this.exerciseTime = exerciseTime;
    this.restTime = restTime;
    this.setCount = setCount;
    this.setRestTime = setCount == 1 ? null : setRestTime;
    this.circuitCount = circuitCount;
  }
}

class ExerciseTemplate {
  // Each overwrite* value is null when that parameter is not overridden for this
  // exercise (the workout-level value is used instead).
  constructor(muscles, types, difficultyMin, difficultyMax, overwriteTime, overwriteRestTime, overwriteSetCount, overwriteSetRestTime) {
    this.muscles = muscles;
    this.types = types;
    this.difficultyMin = difficultyMin;
    this.difficultyMax = difficultyMax;
    this.overwriteTime = overwriteTime;
    this.overwriteRestTime = overwriteRestTime;
    this.overwriteSetCount = overwriteSetCount;
    this.overwriteSetRestTime = overwriteSetRestTime;
  }
}

class Workout {
  constructor(name, exerciseNames, exerciseTime, restTime) {
    this.name = name;
    this.exerciseNames = exerciseNames;
    this.exerciseTime = exerciseTime;
    this.restTime = restTime;
  }
}

function getDataPromise() {
  if (window.global == null) {
    window.global = {};
  }
  if (window.global.dataPromise == null) {
    window.global.dataPromise = _getTypePromise().then((typeList) =>
      _getMusclesPromise().then((muscleList) =>
        _getExercisePromise(typeList, muscleList).then((exerciseList) => {
          var data = {
            types: typeList,
            muscles: muscleList,
            exercises: exerciseList,
          };
          return data;
        })
      )
    );
  }
  return window.global.dataPromise;
}

function _getMusclesPromise() {
  if (window.global == null) {
    window.global = {};
  }
  if (window.global.musclesPromise == null) {
    window.global.musclesPromise = loadJson(ASSET_BASE + "assets/muscles.json").then(
      (data) => initializeMuscles(data)
    );
  }

  return window.global.musclesPromise;
}

function _getTypePromise() {
  if (window.global == null) {
    window.global = {};
  }
  if (window.global.typePromise == null) {
    window.global.typePromise = loadJson(ASSET_BASE + "assets/types.json").then((data) =>
      initializeTypes(data)
    );
  }

  return window.global.typePromise;
}

function _getExercisePromise(typeList, muscleList) {
  if (window.global == null) {
    window.global = {};
  }
  if (window.global.exercisesPromise == null) {
    window.global.exercisesPromise = loadJson(ASSET_BASE + "assets/exercises.json").then(
      (data) => initializeExercises(data, typeList, muscleList)
    );
  }

  return window.global.exercisesPromise;
}

function initializeTypes(data) {
  var result = [];
  data.forEach((type) => {
    result.push(type);
  });

  return result;
}

function initializeMuscles(data) {
  var result = [];

  var addSections = (muscle, parts) => {
    if (muscle.hasOwnProperty("sections")) {
      var partsOf = parts.slice();
      partsOf.push(muscle.name);

      muscle.sections.forEach((section) => {
        result.push({ name: section.name, partOf: partsOf });
        addSections(section, partsOf);
      });
    }
  };

  data.forEach((muscle) => {
    result.push({ name: muscle.name, partOf: null });
    addSections(muscle, []);
  });

  return result;
}

function initializeExercises(data, typeList, muscleList) {
  var result = {};
  data.forEach((exercise) => {
    result[exercise.name] = new Exercise(
      exercise.name,
      exercise.muscles.map((muscleName) =>
        muscleList.find((muscle) => muscle.name == muscleName)
      ),
      exercise.difficulty,
      /*exercise.link ||*/ "/assets/homer.gif",
      exercise.types.map((typeName) =>
        typeList.find((type) => type.name == typeName)
      )
    );
  });

  return result;
}

async function loadJson(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("Fehler beim Laden der JSON-Datei");
    }
    const jsonText = await response.text();
    var jsonData = JSON.parse(jsonText);
    return jsonData;
  } catch (error) {
    toast('Fehler beim Laden der Daten', 'error', 5)
    console.error("Fehler:", error);
  }
}

function findMatchingExercises(data, selectedMuscles, selectedTypes, minDifficulty, maxDifficulty) {
  return Object.values(data.exercises).filter((exercise) => {
    var areMusclesMatching = selectedMuscles.every((selectedMuscle) =>
      exercise.muscles.some(
        (muscle) =>
          muscle.name == selectedMuscle ||
          (muscle.partOf != null && muscle.partOf.includes(selectedMuscle))
      )
    );
    var areTypesMatching =
      selectedTypes.length == 0 ||
      selectedTypes.every((selectedType) =>
        exercise.types.some((type) => type.name == selectedType)
      );
    var isDifficultyValid =
      exercise.difficulty >= minDifficulty &&
      exercise.difficulty <= maxDifficulty;
    return areMusclesMatching && areTypesMatching && isDifficultyValid;
  });
}

function buildWorkoutFromTemplate(template, data) {
  var exerciseNames = [];
  var circuits = template.circuitCount || 1;

  for (var circuit = 0; circuit < circuits; circuit++) {
    template.exerciseTemplates.forEach((exerciseTemplate) => {
      var matches = findMatchingExercises(
        data,
        exerciseTemplate.muscles,
        exerciseTemplate.types,
        exerciseTemplate.difficultyMin,
        exerciseTemplate.difficultyMax
      );
      if (matches.length == 0) {
        return;
      }
      var chosen = matches[Math.floor(Math.random() * matches.length)];
      exerciseNames.push(chosen.name);
    });
  }

  return new Workout(
    template.name,
    exerciseNames,
    template.exerciseTime,
    template.restTime
  );
}

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

function capitalizeWords(inputString) {
  return inputString.replace(/\b\w/g, (match) => match.toUpperCase());
}

function loadObject(name) {
  return JSON.parse(localStorage.getItem(name));
}

function saveObject(name, data) {
  localStorage.setItem(name, JSON.stringify(data));
}

function getStyleVariable(name) {
  const rootStyles = getComputedStyle(document.documentElement);
  return rootStyles.getPropertyValue(name);
}