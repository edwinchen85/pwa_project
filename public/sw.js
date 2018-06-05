importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v3';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  'src/js/app.js',
  'src/js/feed.js',
  'src/js/idb.js',
  'src/js/promise.js',
  'src/js/fetch.js',
  'src/js/material.min.js',
  'src/css/app.css',
  'src/css/feed.css',
  'src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function(cache) {
//       return cache.keys()
//         .then(function(keys) {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         });
//     });
// }

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Precaching App Shell');
        cache.addAll(STATIC_FILES);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating Service Worker ...', event);
  event.waitUntil(
    caches.keys()
      .then(function(keyList) {
        return Promise.all(keyList.map(function(key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        }));
      })
  )
  return self.clients.claim();
});

// self.addEventListener('fetch', function(event) {
  // console.log('[Service Worker] Fetching something ...', event);
  // event.respondWith(null);
//   event.respondWith(
//     caches.match(event.request)
//       .then(function(response) {
//         if (response) {
//           return response;
//         } else {
//           return fetch(event.request)
//             .then(function(res) {
//               return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//             })
//             .catch(function(err) {
//               return caches.open(CACHE_STATIC_NAME)
//                 .then(function(cache) {
//                   return cache.match('offline.html')
//                 });
//             });
//         }
//       })
//   );
// });

// Cache-only strategy
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

// Network-only strategy
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });

// Network with cache fallback strategy
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//           .then(function(cache) {
//             cache.put(event.request.url, res.clone());
//             return res;
//           })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

function isInArray(string, array) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === string) {
      return true;
    }
  }
  return false;
}

// Cache then network with offline support
self.addEventListener('fetch', function(event) {
  var url = 'https://pwagram-788b5.firebaseio.com/posts';

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(fetch(event.request)
      .then(function(res) {
        var clonedRes = res.clone();
        clearAllData('posts')
          .then(function() {
            return clonedRes.json();
          })
          .then(function(data) {
            for (var key in data) {
              writeData('posts', data[key])
            }
          });
        return res;
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(
      caches.match(event.request)
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function(res) {
                return caches.open(CACHE_DYNAMIC_NAME)
                  .then(function(cache) {
                    // trimCache(CACHE_DYNAMIC_NAME, 3);
                    cache.put(event.request, res.clone());
                    return res;
                  })
              })
              .catch(function(err) {
                return caches.open(CACHE_STATIC_NAME)
                  .then(function(cache) {
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('offline.html')
                    }
                  });
              });
          }
        })
    );
  }

});

self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing new posts');
    event.waitUntil(
      readAllData('sync-posts')
        .then(function(data) {
          for (dt of data) {
            fetch('https://us-central1-pwagram-788b5.cloudfunctions.net/storePostData', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
                image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-788b5.appspot.com/o/sf-boat.jpg?alt=media&token=c2752ff3-2c9a-435e-adf5-2fbedfa50dde'
              })
            })
              .then(function(res) {
                console.log('Sent data', res);
                if (res.ok) {
                  res.json()
                    .then(function(resData) {
                      deleteItemFromData('sync-posts', resData.id);
                    });
                }
              })
              .catch(function(err) {
                console.log('Error while sending data', err);
              })
          }
        })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if (action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  } else {
    console.log(action);
    notification.close();
  }
});
