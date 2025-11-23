const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('path');

async function createWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Авто-разрешение геолокации
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile('renderer/index.html');
}
app.commandLine.appendSwitch("enable-features", "CanvasOopRasterization,DefaultAngleVulkan");

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
