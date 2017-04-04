'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  // zoom so we have an extra wide dashboard
  mainWindow = new BrowserWindow({"zoom-factor": 0.75 });

  // Open the DevTools for development
  if (process.env.NODE_ENV === "test") {
      mainWindow.maximize();
      mainWindow.loadURL('file://' + __dirname + '/index.html');;
      mainWindow.webContents.openDevTools();
  }
  else {
      mainWindow.setFullScreen(true);
      mainWindow.loadURL('file://' + __dirname + '/index.html#source=boards/groundstation.json');
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
