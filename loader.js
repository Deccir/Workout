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

// A single concrete step in a Workout: one named exercise with its own timing.
// `mode` is 'time' (hold for `time` seconds) or 'reps' (do `reps` repetitions,
// advanced manually). `setCount` sets are performed, resting `setRestTime`
// seconds between them, then `restTime` seconds before the next exercise.
class WorkoutExercise {
  constructor(name, mode, time, reps, setCount, setRestTime, restTime) {
    this.name = name;
    this.mode = mode; // 'time' | 'reps'
    this.time = time;
    this.reps = reps;
    this.setCount = setCount;
    this.setRestTime = setCount == 1 ? null : setRestTime;
    this.restTime = restTime;
  }
}

// A runnable workout: an ordered list of concrete WorkoutExercise steps. Unlike
// a WorkoutTemplate it contains no shuffling — the exercises are fixed.
class Workout {
  constructor(name, exercises) {
    this.name = name;
    this.exercises = exercises; // WorkoutExercise[]
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
    cache.exercises = loadMergedRawExercises().then((data) =>
      buildExerciseIndex(data, types, muscles)
    );
  }
  return cache.exercises;
}

// Raw (unresolved) exercise records straight from the JSON file, cached.
function loadRawExercisesJson() {
  var cache = dataCache();
  if (cache.rawExercises == null) {
    cache.rawExercises = loadJson(ASSET_BASE + "assets/exercises.json");
  }
  return cache.rawExercises;
}

// The effective raw exercise list: JSON records with the user's localStorage
// edits/additions applied and deleted base exercises removed. Muscle/type names
// are left unresolved (see buildExerciseIndex).
function loadMergedRawExercises() {
  return loadRawExercisesJson().then(mergeRawExercises);
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
      exercise.muscles
        .map((muscleName) => muscles.find((muscle) => muscle.name == muscleName))
        .filter(Boolean),
      exercise.difficulty,
      /*exercise.link ||*/ "/assets/homer.gif",
      exercise.types
        .map((typeName) => types.find((type) => type.name == typeName))
        .filter(Boolean)
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

// Resolve a template's effective per-exercise settings, applying each
// ExerciseTemplate overwrite over the workout-level default.
function resolveExerciseSettings(template, exerciseTemplate) {
  return {
    time: exerciseTemplate.overwriteTime != null
      ? exerciseTemplate.overwriteTime
      : template.exerciseTime,
    restTime: exerciseTemplate.overwriteRestTime != null
      ? exerciseTemplate.overwriteRestTime
      : template.restTime,
    setCount: exerciseTemplate.overwriteSetCount != null
      ? exerciseTemplate.overwriteSetCount
      : template.setCount,
    setRestTime: exerciseTemplate.overwriteSetRestTime != null
      ? exerciseTemplate.overwriteSetRestTime
      : template.setRestTime,
  };
}

// Expand a WorkoutTemplate into an ordered list of independent "slots", one per
// exercise template per circuit. Each slot carries the exercise templates it
// was built from, its matching exercises and the resolved per-exercise settings.
// The WorkoutPreview page picks/shuffles a concrete exercise per slot.
function buildSlotsFromTemplate(template, data) {
  var slots = [];
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
      slots.push({
        exerciseTemplate: exerciseTemplate,
        matches: matches.map((exercise) => exercise.name),
        settings: resolveExerciseSettings(template, exerciseTemplate),
      });
    });
  }

  return slots;
}

// Turn slots with chosen exercise names into a concrete WorkoutExercise list.
function slotsToWorkoutExercises(slots) {
  return slots
    .filter((slot) => slot.chosen != null)
    .map((slot) => new WorkoutExercise(
      slot.chosen,
      'time',
      slot.settings.time,
      null,
      slot.settings.setCount,
      slot.settings.setRestTime,
      slot.settings.restTime
    ));
}

// Pick a concrete exercise for each exercise template, once per circuit, to turn
// a WorkoutTemplate into a runnable Workout (random choice per slot).
function buildWorkoutFromTemplate(template, data) {
  var slots = buildSlotsFromTemplate(template, data);
  slots.forEach((slot) => {
    if (slot.matches.length > 0) {
      slot.chosen = slot.matches[Math.floor(Math.random() * slot.matches.length)];
    }
  });
  return new Workout(template.name, slotsToWorkoutExercises(slots));
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

// ---------- Templates / Workouts storage ----------
// `templates` holds WorkoutTemplate objects (shuffle definitions);
// `workouts` holds concrete Workout objects (fixed exercise lists).

// One-time migration: earlier versions stored templates under the `workouts`
// key. Move any legacy template entries (identified by `exerciseTemplates`)
// into `templates`, leaving only real workouts under `workouts`.
function migrateStorage() {
  if (localStorage.getItem("storageMigratedV2")) {
    return;
  }

  var legacy = loadFromStorage("workouts");
  if (legacy != null && typeof legacy === "object") {
    var templates = loadFromStorage("templates") || {};
    var workouts = {};

    Object.keys(legacy).forEach((name) => {
      var entry = legacy[name];
      if (entry != null && entry.exerciseTemplates != null) {
        if (!templates.hasOwnProperty(name)) {
          templates[name] = entry;
        }
      } else if (entry != null) {
        workouts[name] = entry;
      }
    });

    saveToStorage("templates", templates);
    saveToStorage("workouts", workouts);
  }

  localStorage.setItem("storageMigratedV2", "1");
}

function loadTemplatesFromStorage() {
  migrateStorage();
  return loadFromStorage("templates") || {};
}

function loadWorkoutsFromStorage() {
  migrateStorage();
  return loadFromStorage("workouts") || {};
}

function deleteTemplateFromStorage(name) {
  var templates = loadTemplatesFromStorage();
  delete templates[name];
  saveToStorage("templates", templates);
}

function deleteWorkoutFromStorage(name) {
  var workouts = loadWorkoutsFromStorage();
  delete workouts[name];
  saveToStorage("workouts", workouts);
}

// ---------- Exercise editing storage ----------
// The exercises shipped in assets/exercises.json are the base set. The user can
// edit/add exercises (stored under `exerciseOverrides`, keyed by name, taking
// precedence over the base) and delete base exercises (their names listed under
// `deletedExercises`). mergeRawExercises() combines the three.

const EXERCISE_OVERRIDES_KEY = "exerciseOverrides";
const EXERCISE_DELETES_KEY = "deletedExercises";

function loadExerciseOverrides() {
  return loadFromStorage(EXERCISE_OVERRIDES_KEY) || {};
}

function loadDeletedExerciseNames() {
  return loadFromStorage(EXERCISE_DELETES_KEY) || [];
}

// Combine base JSON records with overrides and deletions into one raw list.
function mergeRawExercises(baseData) {
  var overrides = loadExerciseOverrides();
  var deleted = loadDeletedExerciseNames();

  var byName = {};
  (baseData || []).forEach((exercise) => {
    byName[exercise.name] = exercise;
  });
  deleted.forEach((name) => {
    delete byName[name];
  });
  Object.keys(overrides).forEach((name) => {
    byName[name] = overrides[name];
  });

  return Object.values(byName);
}

// Create or update an exercise. Its name un-deletes the exercise if it was a
// previously removed base exercise.
function upsertExerciseOverride(exercise) {
  var overrides = loadExerciseOverrides();
  overrides[exercise.name] = exercise;
  saveToStorage(EXERCISE_OVERRIDES_KEY, overrides);

  var deleted = loadDeletedExerciseNames().filter((name) => name !== exercise.name);
  saveToStorage(EXERCISE_DELETES_KEY, deleted);

  invalidateExerciseCache();
}

// Delete an exercise. A base (JSON) exercise is recorded in the delete list so
// it stays gone; a purely custom one just loses its override.
function deleteExercise(name, isBaseExercise) {
  var overrides = loadExerciseOverrides();
  delete overrides[name];
  saveToStorage(EXERCISE_OVERRIDES_KEY, overrides);

  if (isBaseExercise) {
    var deleted = loadDeletedExerciseNames();
    if (!deleted.includes(name)) {
      deleted.push(name);
      saveToStorage(EXERCISE_DELETES_KEY, deleted);
    }
  }

  invalidateExerciseCache();
}

// Drop the resolved-exercise caches so the next load reflects storage edits.
// The raw JSON cache is kept — the base set never changes at runtime.
function invalidateExerciseCache() {
  var cache = dataCache();
  cache.exercises = null;
  cache.appData = null;
}

// Read an integer from a number input, falling back to its defaultvalue (then
// its min, then 0) when the field is empty or non-numeric, and clamping to min.
// Guards against a cleared input yielding NaN in stored data.
function readIntInput(id) {
  var input = document.getElementById(id);
  var value = parseInt(input.value);

  if (isNaN(value)) {
    value = parseInt(input.getAttribute("defaultvalue"));
    if (isNaN(value)) {
      value = parseInt(input.min);
      if (isNaN(value)) {
        value = 0;
      }
    }
  }

  var min = parseInt(input.min);
  if (!isNaN(min) && value < min) {
    value = min;
  }
  return value;
}

// Read a CSS custom property from :root. Also used by lib/accordion.
function getStyleVariable(name) {
  const rootStyles = getComputedStyle(document.documentElement);
  return rootStyles.getPropertyValue(name);
}
