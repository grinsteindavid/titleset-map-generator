import { tilesetCanvas, tilesetCtx, selectedTileInfo, selectedTilesCount } from './dom-elements.js';
import { showNotification } from './ui-utils.js';
import { state } from './app-state.js';
import { switchLayer } from './map-panel.js';
import { drawMap } from './map-manager.js';


/**
 * Check if tileset is loaded and show message if not
 * @returns {boolean} - Whether a tileset is loaded
 */
export function checkTilesetLoaded() {
  if (!state.tilesetImage) {
    // Remove existing message if present
    const existingMessage = document.getElementById('no-tileset-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Create message element
    const messageElem = document.createElement('div');
    messageElem.id = 'no-tileset-message';
    messageElem.className = 'notification warning';
    messageElem.textContent = 'No tileset is loaded. Please load a tileset first to perform map operations.';
    
    // Add to map container
    document.querySelector('.map-container').appendChild(messageElem);
    return false;
  }
  return true;
}

/**
 * Select a tile from the tileset
 * @param {Event} e - The click event
 */
export function selectTile(e) {
  if (!state.tilesetImage) {
    showNotification('No tileset loaded. Please load a tileset first.', 'warning');
    return;
  }
  
  // Get click coordinates relative to the canvas
  const rect = tilesetCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileX = Math.floor(x / state.tileSize) * state.tileSize;
  const tileY = Math.floor(y / state.tileSize) * state.tileSize;
  
  // Calculate tile index
  const tileCol = Math.floor(x / state.tileSize);
  const tileRow = Math.floor(y / state.tileSize);
  const tileIndex = tileRow * state.tilesetCols + tileCol;
  
  // Handle collision tab differently with immediate toggle in map
  if (state.currentTilesetTab === 'collision') {
    // Select the tile so it's highlighted
    state.selectedTile = {
      x: tileX,
      y: tileY,
      index: tileIndex
    };
    
    // Update selected tile info
    selectedTileInfo.innerHTML = `Selected Collision: (${tileCol}, ${tileRow}) - Index: ${tileIndex}`;
    
    // Check if this is already a collision tile
    const isAlreadyCollision = state.currentCollisionTiles && state.currentCollisionTiles.has(tileIndex);
    
    // Immediately apply to map if we have a map and are on the collision layer
    if (state.mapData) {
      // Automatically switch to collision layer if not already there
      if (state.currentLayer !== 3) {
        switchLayer(3);
        showNotification('Automatically switched to collision layer', 'info');
      }
      
      // Toggle collision for all map tiles matching this tile
      let changesMade = 0;
      for (let row = 0; row < state.mapHeight; row++) {
        for (let col = 0; col < state.mapWidth; col++) {
          // For any visual layer tiles that match the selected tile, toggle their collision
          for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
            if (state.mapData.layers[visualLayer][row][col] === tileIndex) {
              // Toggle collision - if null set to 1, if 1 set to null
              const currentValue = state.mapData.layers[3][row][col];
              state.mapData.layers[3][row][col] = currentValue === 1 ? null : 1;
              changesMade++;
              break; // Once we've found a match on any layer, we're done with this tile
            }
          }
        }
      }
      
      // Only redraw if changes were made
      if (changesMade > 0) {
        // Redraw map to show changes
        drawMap();
        // Update tileset highlighting after map changes
        tilesetCtx.drawImage(state.tilesetImage, 0, 0);
        highlightSelectedTiles();
        
        showNotification(`Toggled collision for ${changesMade} tiles`, 'success');
      } else {
        // Just update the tileset highlighting to show selection
        tilesetCtx.drawImage(state.tilesetImage, 0, 0);
        highlightSelectedTiles();
      }
    }
  } else {
    // Regular tile selection logic for 'tiles' tab
    // Handle multi-select mode
    if (state.multiSelectMode) {
      const tileInfo = {
        x: tileX,
        y: tileY,
        index: tileIndex,
        col: tileCol,
        row: tileRow
      };
      
      // Check if tile is already selected
      const existingIndex = state.selectedTiles.findIndex(t => t.index === tileIndex);
      
      if (existingIndex !== -1) {
        // Remove if already selected
        state.selectedTiles.splice(existingIndex, 1);
      } else {
        // Add to selection
        state.selectedTiles.push(tileInfo);
      }
      
      // Update count display
      selectedTilesCount.textContent = state.selectedTiles.length;
    } else {
      // Single select mode
      state.selectedTile = {
        x: tileX,
        y: tileY,
        index: tileIndex
      };
      
      // Update selected tile info
      selectedTileInfo.innerHTML = `Selected Tile: (${tileCol}, ${tileRow}) - Index: ${tileIndex}`;
    }
  }
  
  // Completely clear the canvas before redrawing to prevent any artifacts with transparent tiles
  tilesetCtx.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
  tilesetCtx.drawImage(state.tilesetImage, 0, 0);
  highlightSelectedTiles();
}

/**
 * Highlight selected tiles on the tileset
 */
export function highlightSelectedTiles() {
  // Make sure canvas is fully cleared before any highlighting
  if (!state.tilesetImage) return;
  
  // Store collision information for all tiles
  let collisionTiles = new Set();
  
  // Create a map of tiles that have collision, even if they're not placed yet
  if (state.mapData && state.currentTilesetTab === 'collision') {
    // First add all collision tiles currently in the map
    for (let row = 0; row < state.mapHeight; row++) {
      for (let col = 0; col < state.mapWidth; col++) {
        if (state.mapData.layers[3][row][col] === 1) {
          // Find what tile is in this position on each visual layer
          for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
            const tileIndex = state.mapData.layers[visualLayer][row][col];
            if (tileIndex !== null) {
              collisionTiles.add(tileIndex);
            }
          }
        }
      }
    }
  }
  
  // Store the collisionTiles in the app state
  state.currentCollisionTiles = collisionTiles;
  
  // If we're in multi-select mode, highlight all selected tiles in blue
  if (state.multiSelectMode) {
    tilesetCtx.strokeStyle = 'blue';
    tilesetCtx.lineWidth = 2;
    
    state.selectedTiles.forEach(tile => {
      tilesetCtx.strokeRect(tile.x, tile.y, state.tileSize, state.tileSize);
    });
  }
  
  // Highlight collision tiles in the tileset if we're in collision tab
  if (state.currentTilesetTab === 'collision' && state.tilesetImage) {
    const tilesetWidth = state.tilesetImage.width;
    const tilesetCols = Math.floor(tilesetWidth / state.tileSize);
    
    collisionTiles.forEach(tileIndex => {
      const tileRow = Math.floor(tileIndex / tilesetCols);
      const tileCol = tileIndex % tilesetCols;
      const tileX = tileCol * state.tileSize;
      const tileY = tileRow * state.tileSize;
      
      // Fill with semi-transparent red
      tilesetCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      tilesetCtx.fillRect(tileX, tileY, state.tileSize, state.tileSize);
      
      // Add a subtle border for better visibility
      tilesetCtx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      tilesetCtx.lineWidth = 1;
      tilesetCtx.strokeRect(tileX, tileY, state.tileSize, state.tileSize);
    });
  }
  
  // Highlight the currently selected tile
  if (state.selectedTile) {
    if (state.currentTilesetTab === 'collision') {
      // Highlight the currently selected collision tile with stronger highlight
      tilesetCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      tilesetCtx.fillRect(state.selectedTile.x, state.selectedTile.y, state.tileSize, state.tileSize);
      
      // Add a stronger border to the selected collision tile
      tilesetCtx.strokeStyle = 'red';
      tilesetCtx.lineWidth = 2;
      tilesetCtx.strokeRect(state.selectedTile.x, state.selectedTile.y, state.tileSize, state.tileSize);
    } else {
      // Blue highlight for tiles tab (matching multi-select color for consistency)
      tilesetCtx.strokeStyle = 'blue';
      tilesetCtx.lineWidth = 2;
      tilesetCtx.strokeRect(state.selectedTile.x, state.selectedTile.y, state.tileSize, state.tileSize);
    }
  }
}

/**
 * Clear all selected tiles
 */
export function clearSelectedTiles() {
  state.selectedTiles = [];
  selectedTilesCount.textContent = '0';
  
  // Redraw tileset with a complete canvas clear first
  if (state.tilesetImage) {
    // Full clear of the canvas to prevent any transparency issues
    tilesetCtx.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
    tilesetCtx.drawImage(state.tilesetImage, 0, 0);
    if (!state.multiSelectMode && state.selectedTile) {
      highlightSelectedTiles();
    }
  }
}

/**
 * Switch between tileset tabs (tiles/collision)
 * @param {string} tab - The tab to switch to ('tiles' or 'collision')
 */
export function switchTilesetTab(tab) {
  if (tab !== 'tiles' && tab !== 'collision') return;
  
  // Clear the current selected tile to avoid selection bugs when switching tabs
  state.selectedTile = null;
  selectedTileInfo.innerHTML = 'No tile selected';
  
  // Update current tab
  state.currentTilesetTab = tab;
  
  // Update ONLY tileset tab buttons, not map tabs
  document.querySelectorAll('.tileset-tab').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.tab === state.currentTilesetTab) {
      button.classList.add('active');
    }
  });
  
  // Make sure we don't accidentally remove active status from map tabs
  if (state.isTabSelected && state.currentLayer >= 0 && state.currentLayer <= 3) {
    document.querySelectorAll('.tab-button').forEach(button => {
      if (button.dataset.layer !== undefined && parseInt(button.dataset.layer) === state.currentLayer) {
        button.classList.add('active');
      }
    });
  }
  
  // Disable multi-select mode in collision tab
  if (tab === 'collision' && state.multiSelectMode) {
    state.multiSelectMode = false;
    document.getElementById('multi-select-mode').checked = false;
    document.getElementById('selected-tiles-container').classList.add('hidden');
    clearSelectedTiles();
    showNotification('Multi-select is only available in Tiles tab', 'info');
  }
  
  // Redraw tileset with appropriate highlights
  if (state.tilesetImage) {
    // Clear the entire canvas first to prevent transparent tiles showing previous selections
    tilesetCtx.clearRect(0, 0, tilesetCanvas.width, tilesetCanvas.height);
    tilesetCtx.drawImage(state.tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
}
