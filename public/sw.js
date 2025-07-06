self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('static-v1').then((cache) => cache.addAll(['/static/styles.css', '/static/app.js']))
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/assets/') || e.request.url.includes('/static/')) {
    e.respondWith(
      caches.open('static-v1').then((cache) =>
        cache.match(e.request).then((resp) =>
          resp || fetch(e.request).then((response) => {
            cache.put(e.request, response.clone());
            return response;
          })
        )
      )
    );
  }
});
