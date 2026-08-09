if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      if (registration.scope.includes('/fast/monica/')) registration.unregister();
    });
  });
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.filter(key => key.startsWith('fast001-monica-')).forEach(key => caches.delete(key));
    });
  }
}
