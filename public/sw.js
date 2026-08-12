const CACHE = 'crumb-shell-v2';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/placeholder.svg',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache install warning:', err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests inside our own origin, ignoring api, auth, and supabase
  if (
    request.method !== 'GET' || 
    url.origin !== self.location.origin || 
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/auth') ||
    url.pathname.includes('/supabase/')
  ) {
    return;
  }

  // Strategy for Static Assets: Cache-First
  if (
    url.pathname.startsWith('/_next/static') || 
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        }).catch(() => {
          if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
            return caches.match('/placeholder.svg');
          }
        });
      })
    );
    return;
  }

  // Strategy for HTML Pages: Network-First
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE).then((cache) => cache.put(request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>You're Offline - crumb.</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f7f5ef; 
                    color: #27231e; 
                    text-align: center; 
                    padding: 24px; 
                    box-sizing: border-box; 
                  }
                  .card {
                    background: #ffffff;
                    border: 1px solid #e7e5df;
                    padding: 32px 24px;
                    border-radius: 24px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.02);
                    max-width: 320px;
                    width: 100%;
                  }
                  h1 { font-size: 22px; margin: 0 0 12px 0; font-weight: 700; color: #433c35; }
                  p { color: #7a756f; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
                  button { 
                    background: #433c35; 
                    color: #ffffff; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 9999px; 
                    font-size: 14px;
                    font-weight: 600; 
                    cursor: pointer; 
                    width: 100%;
                    transition: opacity 0.15s ease;
                  }
                  button:active { opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>You are offline</h1>
                  <p>Check your internet connection and try reloading the page to access your cookbook.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        });
      })
  );
});
