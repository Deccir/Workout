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

// ---------- App data loading ----------
// Types, muscles and exercises are fetched once and cached on window so every
// page and repeated call reuses the same in-flight promise.

function dataCache() {
  if (window.appDataCache == null) {
    window.appDataCache = {};
  }
  return window.appDataCache;
}

// Load everything the app needs (types, muscles, exercises) as one bundle.
function loadAppData() {
  var cache = dataCache();
  if (cache.appData == null) {
    cache.appData = loadTypes().then((types) =>
      loadMuscles().then((muscles) =>
        loadExercises(types, muscles).then((exercises) => ({
          types: types,
          muscles: muscles,
          exercises: exercises,
        }))
      )
    );
  }
  return cache.appData;
}

function loadTypes() {
  var cache = dataCache();
  if (cache.types == null) {
    cache.types = loadJson(ASSET_BASE + "assets/types.json").then(parseTypes);
  }
  return cache.types;
}

function loadMuscles() {
  var cache = dataCache();
  if (cache.muscles == null) {
    cache.muscles = loadJson(ASSET_BASE + "assets/muscles.json").then(parseMuscles);
  }
  return cache.muscles;
}

function loadExercises(types, muscles) {
  var cache = dataCache();
  if (cache.exercises == null) {
    cache.exercises = loadJson(ASSET_BASE + "assets/exercises.json").then((data) =>
      buildExerciseIndex(data, types, muscles)
    );
  }
  return cache.exercises;
}

function parseTypes(data) {
  return data.slice();
}

// Flatten the nested muscle tree into a flat list, recording each muscle's
// ancestry in `partOf` so a selection like "arms" also matches sub-muscles.
function parseMuscles(data) {
  var result = [];

  var addSections = (muscle, ancestors) => {
    if (muscle.hasOwnProperty("sections")) {
      var childAncestors = ancestors.slice();
      childAncestors.push(muscle.name);

      muscle.sections.forEach((section) => {
        result.push({ name: section.name, partOf: childAncestors });
        addSections(section, childAncestors);
      });
    }
  };

  data.forEach((muscle) => {
    result.push({ name: muscle.name, partOf: null });
    addSections(muscle, []);
  });

  return result;
}

// Build a name -> Exercise lookup, resolving each exercise's muscle and type
// names to the shared muscle/type objects.
function buildExerciseIndex(data, types, muscles) {
  var exercisesByName = {};
  data.forEach((exercise) => {
    exercisesByName[exercise.name] = new Exercise(
      exercise.name,
      exercise.muscles.map((muscleName) =>
        muscles.find((muscle) => muscle.name == muscleName)
      ),
      exercise.difficulty,
      /*exercise.link ||*/ "/assets/homer.gif",
      exercise.types.map((typeName) =>
        types.find((type) => type.name == typeName)
      )
    );
  });

  return exercisesByName;
}

async function loadJson(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("Failed to load JSON file: " + path);
    }
    const jsonText = await response.text();
    return JSON.parse(jsonText);
  } catch (error) {
    toast('Failed to load data', 'error', 5)
    console.error("Data load error:", error);
  }
}

// Return every exercise matching the selected muscles, types and difficulty
// range. An empty type selection matches any type.
function findMatchingExercises(data, selectedMuscles, selectedTypes, minDifficulty, maxDifficulty) {
  return Object.values(data.exercises).filter((exercise) => {
    var musclesMatch = selectedMuscles.every((selectedMuscle) =>
      exercise.muscles.some(
        (muscle) =>
          muscle.name == selectedMuscle ||
          (muscle.partOf != null && muscle.partOf.includes(selectedMuscle))
      )
    );
    var typesMatch =
      selectedTypes.length == 0 ||
      selectedTypes.every((selectedType) =>
        exercise.types.some((type) => type.name == selectedType)
      );
    var difficultyInRange =
      exercise.difficulty >= minDifficulty &&
      exercise.difficulty <= maxDifficulty;
    return musclesMatch && typesMatch && difficultyInRange;
  });
}

// Pick a concrete exercise for each exercise template, once per circuit, to turn
// a WorkoutTemplate into a runnable Workout.
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

// ---------- Shared helpers ----------

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

function loadFromStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Read a CSS custom property from :root. Also used by lib/accordion.
function getStyleVariable(name) {
  const rootStyles = getComputedStyle(document.documentElement);
  return rootStyles.getPropertyValue(name);
}
