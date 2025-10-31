/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

// self.addEventListener('install', function(event) {
//   // Perform install steps
// });

// async function cacheOnly(request) {
//   const cachedResponse = await caches.match(request);
//   return cachedResponse || Response.error();
// }
//
// self.addEventListener("fetch", (event) => {
//   event.respondWith(cacheOnly(event.request));
// });
