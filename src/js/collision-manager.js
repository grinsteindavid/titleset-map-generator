import { state } from './app-state.js';
import { showNotification } from './ui-utils.js';
import { highlightSelectedTiles } from './tileset-manager.js';
import { tilesetCtx } from './dom-elements.js';
import { drawMap } from './map-manager.js';

/**
 * Clear all collision data from the map
 */
export function clearAllCollisions() {
  if (!state.mapData) {
    showNotification('No map data to clear collisions from', 'warning');
    return;
  }
  
  // Ask for confirmation
  if (!confirm('Are you sure you want to clear ALL collision data? This cannot be undone.')) {
    return;
  }
  
  // Clear collision layer (layer 3)
  for (let row = 0; row < state.mapHeight; row++) {
    for (let col = 0; col < state.mapWidth; col++) {
      state.mapData.layers[3][row][col] = null;
    }
  }
  
  // Clear collision tiles in app state
  state.currentCollisionTiles = new Set();
  
  // Redraw map
  drawMap();
  
  // Update tileset to reflect cleared collisions
  if (state.tilesetImage && state.currentTilesetTab === 'collision') {
    tilesetCtx.drawImage(state.tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
  
  showNotification('All collision data has been cleared', 'success');
}

/**
 * Reset a specific layer (clear all tiles)
 * @param {number} layerIndex - The layer index to reset
 */
export function resetLayer(layerIndex) {
  if (!state.mapData || layerIndex < 0 || layerIndex > 3) {
    showNotification('Cannot reset layer - no map exists', 'error');
    return;
  }

  // Ask for confirmation
  const layerName = layerIndex === 3 ? 'collision layer' : `layer ${layerIndex + 1}`;
  if (!confirm(`Are you sure you want to clear the entire ${layerName}? This cannot be undone.`)) {
    return;
  }

  // Reset the layer to all null values
  for (let row = 0; row < state.mapHeight; row++) {
    for (let col = 0; col < state.mapWidth; col++) {
      state.mapData.layers[layerIndex][row][col] = null;
    }
  }

  // Redraw the map
  drawMap();
  
  // If we're in collision tab and resetting the collision layer, also update tileset view
  if (layerIndex === 3 && state.currentTilesetTab === 'collision') {
    // Redraw tileset to update collision indicators
    if (state.tilesetImage) {
      state.tilesetCtx.drawImage(state.tilesetImage, 0, 0);
      highlightSelectedTiles();
    }
  }

  showNotification(`${layerName.charAt(0).toUpperCase() + layerName.slice(1)} has been cleared`, 'success');
}
