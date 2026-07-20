self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('workout-shuffle-cache-v2').then((cache) => {
      // Paths resolve relative to this service worker's location (app root),
      // so the app works at any deploy path (site root or a subdir).
      return cache.addAll([
        './',
        'index.html',
        'style.css',
        'main.js',
        'loader.js',
        'navigation.js',
        'manifest.json',
        'favicon.ico',
        'lib/toaster/toaster.js',
        'lib/toaster/toaster.css',
        'lib/accordion/accordion.js',
        'lib/accordion/accordion.css',
        'lib/js-multiselect-dropdown-main/multi-select-dropdown.js',
        'lib/js-multiselect-dropdown-main/multi-select-dropdown.css',
        'pages/workout/workout.html',
        'pages/workout/workout.js',
        'pages/workout/workout.css',
        'pages/createWorkoutTemplate/createWorkoutTemplate.html',
        'pages/createWorkoutTemplate/createWorkoutTemplate.js',
        'pages/createWorkoutTemplate/createWorkoutTemplate.css',
        'assets/icon.png',
        'assets/exercises.json',
        'assets/muscles.json',
        'assets/types.json',
        'assets/homer.gif',
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== 'workout-shuffle-cache-v2')
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
