const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openTileset: () => ipcRenderer.invoke('open-tileset'),
  saveMap: (mapData) => ipcRenderer.invoke('save-map', mapData)
});
