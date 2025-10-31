/* eslint-disable no-restricted-globals */


async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if(cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open("MyCache_1");
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.error("Fetch failed; returning offline page instead.", error);
  }
  return Response.error();
}

// self.addEventListener("fetch", (event) => {
//   event.respondWith(cacheFirst(event.request));
// });
