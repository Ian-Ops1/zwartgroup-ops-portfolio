const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const APP_URL = 'https://zwartgroup-ops-portfolio.vercel.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'ZwartGroup — Ops & Portfolio Command',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0D0F14',
    show: false,
    autoHideMenuBar: true,
  });

  // Show splash/loading state
  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
  });

  // Load the app
  win.loadURL(APP_URL);

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle load errors — show offline page
  win.webContents.on('did-fail-load', () => {
    win.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Remove menu bar
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
