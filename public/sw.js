const CACHE = 'crumb-shell-v1'
const SHELL = ['/', '/manifest.webmanifest']
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (event) => { const request = event.request; const url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return; event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok && (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/'))) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)) } return response }).catch(() => caches.match('/')))) })
