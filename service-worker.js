self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('meine-app-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/loader.js',
        '/main.js',
        '/navigation.js',
        '/service-worker.js',
        '/assets/icon.png',
        '/workout/workout.html',
        '/workout/workout.js',
        '/createWorkoutTemplate/createWorkoutTemplate.html',
        '/createWorkoutTemplate/createWorkoutTemplate.js',
        '/assets/exercises.json',
        '/assets/homer.gif',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
