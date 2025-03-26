/**
 * This module contains utility functions shared across multiple modules
 * to help avoid circular dependencies
 */

import { state } from './app-state.js';
import { mapCanvas, mapCtx } from './dom-elements.js';
import { showNoTabSelectedMessage } from './ui-utils.js';

/**
 * Draw grid on map canvas
 */
export function drawGrid() {
  mapCtx.strokeStyle = '#ddd';
  mapCtx.lineWidth = 1;
  
  // Draw vertical lines
  for (let i = 0; i <= state.mapWidth; i++) {
    mapCtx.beginPath();
    mapCtx.moveTo(i * state.tileSize, 0);
    mapCtx.lineTo(i * state.tileSize, state.mapHeight * state.tileSize);
    mapCtx.stroke();
  }
  
  // Draw horizontal lines
  for (let i = 0; i <= state.mapHeight; i++) {
    mapCtx.beginPath();
    mapCtx.moveTo(0, i * state.tileSize);
    mapCtx.lineTo(state.mapWidth * state.tileSize, i * state.tileSize);
    mapCtx.stroke();
  }
}

/**
 * Switch between layers
 * @param {number} layerIndex - The layer index to switch to
 */
export function switchLayer(layerIndex) {
  if (layerIndex < 0 || layerIndex > 3) return;
  
  // Update current layer
  state.currentLayer = layerIndex;
  state.isTabSelected = true;
  
  // Update ONLY map tab buttons, not tileset tabs
  document.querySelectorAll('.tab-button').forEach(button => {
    // Only process buttons that have a layer attribute (map tabs)
    if (button.dataset.layer !== undefined) {
      button.classList.remove('active');
      if (parseInt(button.dataset.layer) === state.currentLayer) {
        button.classList.add('active');
      }
    }
  });
  
  // Remove the no-tab-selected message if it exists
  const noTabMessage = document.getElementById('no-tab-selected-message');
  if (noTabMessage) {
    noTabMessage.remove();
  }
  
  // Redraw map
  drawMap();
}


/**
 * Clear map canvas
 */
export function clearMapCanvas() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
}

/**
 * Deselect all tabs
 */
export function deselectAllTabs() {
  state.isTabSelected = false;
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show message that no tab is selected
  showNoTabSelectedMessage();
}

/**
 * Draw the map with all layers
 */
export function drawMap() {
  if (!state.mapData || !state.tilesetImage) return;
  
  // Clear canvas
  clearMapCanvas();
  
  // Draw grid
  drawGrid();
  
  // Draw visual layers (0-2)
  for (let layer = 0; layer < 3; layer++) {
    // Set opacity based on whether this is the current layer
    mapCtx.globalAlpha = layer === state.currentLayer ? 1.0 : 0.3;
    
    // Draw tiles for this layer
    for (let row = 0; row < state.mapHeight; row++) {
      for (let col = 0; col < state.mapWidth; col++) {
        const tileIndex = state.mapData.layers[layer][row][col];
        if (tileIndex !== null) {
          // Calculate tile position in tileset
          const tilesetCol = tileIndex % state.tilesetCols;
          const tilesetRow = Math.floor(tileIndex / state.tilesetCols);
          const tileX = tilesetCol * state.tileSize;
          const tileY = tilesetRow * state.tileSize;
          
          // Draw tile
          mapCtx.drawImage(
            state.tilesetImage, 
            tileX, tileY, state.tileSize, state.tileSize,
            col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
          );
        }
      }
    }
  }
  
  // Draw collision layer if it's the current layer
  if (state.currentLayer === 3) {
    mapCtx.globalAlpha = 1.0;
    
    for (let row = 0; row < state.mapHeight; row++) {
      for (let col = 0; col < state.mapWidth; col++) {
        const value = state.mapData.layers[3][row][col];
        
        if (value !== null) {
          if (value === 1) {
            // Draw simple collision indicator - more visible now
            mapCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            mapCtx.fillRect(
              col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
            );
            mapCtx.strokeStyle = 'red';
            mapCtx.lineWidth = 2;
            mapCtx.strokeRect(
              col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
            );
            
            // Add a cross pattern for better visibility
            mapCtx.beginPath();
            mapCtx.moveTo(col * state.tileSize, row * state.tileSize);
            mapCtx.lineTo(col * state.tileSize + state.tileSize, row * state.tileSize + state.tileSize);
            mapCtx.moveTo(col * state.tileSize + state.tileSize, row * state.tileSize);
            mapCtx.lineTo(col * state.tileSize, row * state.tileSize + state.tileSize);
            mapCtx.stroke();
            
            // Make sure we update the collision tiles in our global collection
            // Find what tile index is at this position in each visual layer
            for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
              const tileIndex = state.mapData.layers[visualLayer][row][col];
              if (tileIndex !== null && state.currentCollisionTiles) {
                state.currentCollisionTiles.add(tileIndex);
              }
            }
          } else {
            // It's a tile index, not just a collision marker
            const tilesetCol = value % state.tilesetCols;
            const tilesetRow = Math.floor(value / state.tilesetCols);
            const tileX = tilesetCol * state.tileSize;
            const tileY = tilesetRow * state.tileSize;
            
            // Draw tile with slight transparency
            mapCtx.globalAlpha = 0.8;
            mapCtx.drawImage(
              state.tilesetImage, 
              tileX, tileY, state.tileSize, state.tileSize,
              col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
            );
          }
        }
      }
    }
  } else {
    // If we're not on the collision layer, still show collision indicators with low opacity
    mapCtx.globalAlpha = 0.2;
    
    for (let row = 0; row < state.mapHeight; row++) {
      for (let col = 0; col < state.mapWidth; col++) {
        const value = state.mapData.layers[3][row][col];
        if (value === 1) {
          // Draw simple collision indicator with a subtle pattern
          mapCtx.fillStyle = 'red';
          mapCtx.fillRect(
            col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
          );
          
          // Add a subtle border
          mapCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          mapCtx.lineWidth = 1;
          mapCtx.strokeRect(
            col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
          );
        }
      }
    }
  }
  
  // Reset opacity
  mapCtx.globalAlpha = 1.0;
}