import { state } from './app-state.js';
import { validateMapData } from './map-manager.js';
import { drawMap } from './shared-utils.js';
import { showNotification } from './ui-utils.js';
import { highlightSelectedTiles } from './tileset-manager.js';
import { mapCanvas, mapWidthInput, mapHeightInput, tilesetCtx } from './dom-elements.js';

/**
 * Export map data to JSON
 */
export async function exportMap() {
  if (!state.mapData) {
    showNotification('No map data to export', 'error');
    return;
  }
  
  if (!state.tilesetImage) {
    showNotification('Cannot export map without a tileset loaded', 'warning');
    return;
  }
  
  // Ensure the tileset filename is included in the map data
  state.mapData.tilesetFilename = state.tilesetFilename;
  
  try {
    // Prepare map data for export
    const exportData = {
      ...state.mapData,
      exportDate: new Date().toISOString()
    };
    
    // Use Electron API to save map data to a file
    const result = await window.electronAPI.saveMap(exportData);
    
    if (result.success) {
      showNotification('Map exported successfully', 'success');
      console.log('Map exported successfully');
    } else if (result.error) {
      showNotification('Error exporting map', 'error');
      console.error('Error exporting map:', result.error);
    }
  } catch (error) {
    showNotification('Error exporting map', 'error');
    console.error('Error exporting map:', error);
  }
}

/**
 * Import map data from JSON
 */
export async function importMap() {
  try {
    // Check if we need to warn about not having a tileset loaded
    if (!state.tilesetImage) {
      showNotification('No tileset loaded. You must load a tileset before importing a map.', 'warning');
      return;
    }
    
    // Use Electron API to open a map file
    const result = await window.electronAPI.openMap();
    
    if (result.success && result.mapData) {
      // Validate map data structure
      if (!validateMapData(result.mapData)) {
        showNotification('Invalid map data format', 'error');
        return;
      }
      
      // Check if map has a tileset filename and compare with current
      if (result.mapData.tilesetFilename && result.mapData.tilesetFilename !== state.tilesetFilename) {
        showNotification(
          `Warning: The map was created with tileset "${result.mapData.tilesetFilename}" but you currently have "${state.tilesetFilename}" loaded. This may cause display issues.`, 
          'warning'
        );
      }
      
      // Update local map data
      state.mapData = result.mapData;
      
      // Update map dimensions
      state.mapWidth = state.mapData.width;
      state.mapHeight = state.mapData.height;
      state.tileSize = state.mapData.tileSize || 32;
      
      // Update input values
      mapWidthInput.value = state.mapWidth;
      mapHeightInput.value = state.mapHeight;
      
      // Set canvas dimensions
      mapCanvas.width = state.mapWidth * state.tileSize;
      mapCanvas.height = state.mapHeight * state.tileSize;
      
      // Enable export button
      state.btnExportMap.disabled = false;
      
      // Draw the map
      drawMap();
      
      // Update tileset to show collision tiles if we're in collision tab
      if (state.currentTilesetTab === 'collision') {
        tilesetCtx.drawImage(state.tilesetImage, 0, 0);
        highlightSelectedTiles();
      }
      
      // Update Create Map button text since we now have map data
      state.btnCreateMap.textContent = 'Restart Map';
      
      // Show confirmation message
      showNotification('Map imported successfully', 'success');
      console.log('Map imported successfully');
    } else if (result.error) {
      showNotification('Error importing map', 'error');
      console.error('Error importing map:', result.error);
    }
  } catch (error) {
    showNotification('Error importing map', 'error');
    console.error('Error importing map:', error);
  }
}
