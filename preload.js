const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('geoAPI', {
  getLocation: () =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos),
        err => reject(err),
        { enableHighAccuracy: true }
      );
    })
});

window.addEventListener("contextmenu", e => e.preventDefault());
