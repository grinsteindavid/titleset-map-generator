const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle file operations
ipcMain.handle('open-tileset', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Tileset Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile']
  });
  
  if (!canceled && filePaths.length > 0) {
    const filePath = filePaths[0];
    try {
      // Return the file path for loading in the renderer
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

ipcMain.handle('save-map', async (event, mapData) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Map',
    defaultPath: 'map.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(mapData, null, 2));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

ipcMain.handle('open-map', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open Map',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (!canceled && filePaths.length > 0) {
    const filePath = filePaths[0];
    try {
      const mapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { success: true, mapData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});
