if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    // .register('/sw.js', {scope: '/help/'})
    .register('/sw.js')
    .then(function() {
      console.log('Service worker registered!');
    });
}
