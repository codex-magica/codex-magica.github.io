export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed:', registrationError);
          //window.alert('SW registration failed:' + registrationError)
        });
    });
  } else {
    //window.alert('SW not supported')
  }
}
