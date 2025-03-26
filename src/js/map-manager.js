import { mapCanvas, mapCtx } from './dom-elements.js';
import { state } from './app-state.js';
import { showNotification } from './ui-utils.js';
import { checkTilesetLoaded, highlightSelectedTiles } from './tileset-manager.js';
import { clearMapCanvas, drawGrid, drawMap } from './shared-utils.js';

/**
 * Create a new map with specified dimensions
 */
export function createMap() {
  // Check if tileset is loaded
  if (!checkTilesetLoaded()) {
    showNotification('Cannot create map without a tileset loaded', 'warning');
    return;
  }
  
  // Get map dimensions from inputs
  state.mapWidth = parseInt(state.mapWidthInput.value) || 20;
  state.mapHeight = parseInt(state.mapHeightInput.value) || 15;
  
  // Validate dimensions
  state.mapWidth = Math.max(5, Math.min(100, state.mapWidth));
  state.mapHeight = Math.max(5, Math.min(100, state.mapHeight));
  
  // Update input values
  state.mapWidthInput.value = state.mapWidth;
  state.mapHeightInput.value = state.mapHeight;
  
  // Set canvas dimensions
  mapCanvas.width = state.mapWidth * state.tileSize;
  mapCanvas.height = state.mapHeight * state.tileSize;
  
  // Check if we already had map data before
  const hadMapDataBefore = state.mapData !== null;
  
  // Initialize map data with three visual layers plus collision layer
  state.mapData = {
    width: state.mapWidth,
    height: state.mapHeight,
    tileSize: state.tileSize,
    tilesetFilename: state.tilesetFilename, // Store the tileset filename in the map data
    layers: [
      Array(state.mapHeight).fill().map(() => Array(state.mapWidth).fill(null)),
      Array(state.mapHeight).fill().map(() => Array(state.mapWidth).fill(null)),
      Array(state.mapHeight).fill().map(() => Array(state.mapWidth).fill(null)),
      Array(state.mapHeight).fill().map(() => Array(state.mapWidth).fill(null)) // Collision layer
    ]
  };

  if (hadMapDataBefore) {
    // We're restarting an existing map
    showNotification('Map restarted with clean layers', 'success');
  } else {
    // First time creating the map
    showNotification('New map created successfully', 'success');
  }
  
  // Always update button text to 'Restart Map' since we now have map data
  state.btnCreateMap.textContent = 'Restart Map';
  
  // Clear the canvas and draw grid
  clearMapCanvas();
  drawGrid();
  
  // Update tileset to show collision tiles if in collision tab
  if (state.currentTilesetTab === 'collision' && state.tilesetImage) {
    state.tilesetCtx.drawImage(state.tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
  
  // Enable export button if tileset is loaded
  if (state.tilesetImage) {
    state.btnExportMap.disabled = false;
  }
}

/**
 * Place a tile on the map
 * @param {Event} e - The click event
 */
export function placeTile(e) {
  if (!state.mapData) {
    showNotification('No map created. Please create a map first.', 'warning');
    return;
  }
  
  if (!state.tilesetImage) {
    showNotification('No tileset loaded. Please load a tileset first.', 'warning');
    return;
  }
  
  if (!state.isTabSelected) {
    showNotification('No layer selected. Please select a layer tab first.', 'warning');
    return;
  }
  
  if (!state.selectedTile && !state.multiSelectMode) {
    showNotification('No tile selected. Please select a tile from the tileset.', 'info');
    return;
  }
  if (!state.selectedTile && !state.multiSelectMode) return;
  if (state.multiSelectMode && state.selectedTiles.length === 0) return;
  
  // Get click coordinates relative to the canvas
  const rect = mapCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileCol = Math.floor(x / state.tileSize);
  const tileRow = Math.floor(y / state.tileSize);
  
  // Validate coordinates
  if (tileCol < 0 || tileCol >= state.mapWidth || tileRow < 0 || tileRow >= state.mapHeight) return;
  
  // Handle collision layer differently if in collision tab
  if (state.currentLayer === 3) {
    // For collision layer, we toggle between null and 1 (blocked)
    if (state.currentTilesetTab === 'collision') {
      // Check if there's a tile on any of the visual layers before toggling collision
      let hasTile = false;
      for (let layer = 0; layer < 3; layer++) {
        if (state.mapData.layers[layer][tileRow][tileCol] !== null) {
          hasTile = true;
          break;
        }
      }
      
      // Only toggle collision for tiles that exist in one of the visual layers
      if (hasTile) {
        const currentValue = state.mapData.layers[state.currentLayer][tileRow][tileCol];
        state.mapData.layers[state.currentLayer][tileRow][tileCol] = currentValue === 1 ? null : 1;
      }
      // No message if no tile found - just silently do nothing
    } else {
      // In regular tiles tab, we shouldn't be able to paint when on collision layer
      // Just silently return without action
      return;
    }
  } else {
    // For regular layers
    if (state.multiSelectMode && state.selectedTiles.length > 0) {
      // When using multi-select, we're placing multiple tiles at once
      // We need to check boundaries and make sure we don't go out of bounds
      
      // Find the dimensions of the selection (min/max rows and columns)
      const selectionInfo = calculateSelectionBounds();
      const selectionWidth = selectionInfo.maxCol - selectionInfo.minCol + 1;
      const selectionHeight = selectionInfo.maxRow - selectionInfo.minRow + 1;
      
      // Place each tile in the selection at the corresponding position
      state.selectedTiles.forEach(tile => {
        // Calculate relative position in the selection
        const relativeCol = tile.col - selectionInfo.minCol;
        const relativeRow = tile.row - selectionInfo.minRow;
        
        // Calculate target position on the map
        const targetCol = tileCol + relativeCol;
        const targetRow = tileRow + relativeRow;
        
        // Make sure we're within map bounds
        if (targetCol >= 0 && targetCol < state.mapWidth && targetRow >= 0 && targetRow < state.mapHeight) {
          state.mapData.layers[state.currentLayer][targetRow][targetCol] = tile.index;
        }
      });
    } else if (state.selectedTile) {
      // Single tile placement
      state.mapData.layers[state.currentLayer][tileRow][tileCol] = state.selectedTile.index;
    }
  }
  
  // Redraw map
  drawMap();
}

/**
 * Handle mouse hover over map for preview
 * @param {Event} e - The mousemove event
 */
export function handleMapHover(e) {
  if (!state.mapData || !state.tilesetImage || !state.isTabSelected) return;
  
  // In collision tab, we don't need a tile selected to preview toggle actions
  if (state.currentLayer !== 3) {
    // For regular layers, we need a tile selected
    if (!state.selectedTile && !state.multiSelectMode) return;
    if (state.multiSelectMode && state.selectedTiles.length === 0) return;
  }
  
  // Get hover coordinates relative to the canvas
  const rect = mapCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileCol = Math.floor(x / state.tileSize);
  const tileRow = Math.floor(y / state.tileSize);
  
  // Validate coordinates
  if (tileCol < 0 || tileCol >= state.mapWidth || tileRow < 0 || tileRow >= state.mapHeight) return;
  
  // Redraw map
  drawMap();
  
  mapCtx.globalAlpha = 0.5;
  
  // Handle collision layer preview differently
  if (state.currentLayer === 3 && state.currentTilesetTab === 'collision') {
    // For collision layer in collision tab, show a red square
    mapCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    mapCtx.fillRect(
      tileCol * state.tileSize, tileRow * state.tileSize, state.tileSize, state.tileSize
    );
  } else if (state.multiSelectMode && state.selectedTiles.length > 0) {
    // Preview for multi-tile selection
    const selectionInfo = calculateSelectionBounds();
    const selectionWidth = selectionInfo.maxCol - selectionInfo.minCol + 1;
    const selectionHeight = selectionInfo.maxRow - selectionInfo.minRow + 1;
    
    // Draw each tile in the selection
    state.selectedTiles.forEach(tile => {
      // Calculate relative position in the selection
      const relativeCol = tile.col - selectionInfo.minCol;
      const relativeRow = tile.row - selectionInfo.minRow;
      
      // Calculate target position on the map
      const targetCol = tileCol + relativeCol;
      const targetRow = tileRow + relativeRow;
      
      // Make sure we're within map bounds
      if (targetCol >= 0 && targetCol < state.mapWidth && targetRow >= 0 && targetRow < state.mapHeight) {
        const tileX = Math.floor(tile.x / state.tileSize) * state.tileSize;
        const tileY = Math.floor(tile.y / state.tileSize) * state.tileSize;
        mapCtx.drawImage(
          state.tilesetImage, 
          tileX, tileY, state.tileSize, state.tileSize,
          targetCol * state.tileSize, targetRow * state.tileSize, state.tileSize, state.tileSize
        );
      }
    });
  } else if (state.selectedTile) {
    // Single tile preview
    const tileX = Math.floor(state.selectedTile.x / state.tileSize) * state.tileSize;
    const tileY = Math.floor(state.selectedTile.y / state.tileSize) * state.tileSize;
    mapCtx.drawImage(
      state.tilesetImage, 
      tileX, tileY, state.tileSize, state.tileSize,
      tileCol * state.tileSize, tileRow * state.tileSize, state.tileSize, state.tileSize
    );
  }
  
  mapCtx.globalAlpha = 1.0;
}

/**
 * Calculate the bounds (min/max rows and columns) of the selected tiles
 * @returns {Object} The selection bounds
 */
export function calculateSelectionBounds() {
  if (state.selectedTiles.length === 0) {
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }
  
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  
  state.selectedTiles.forEach(tile => {
    minRow = Math.min(minRow, tile.row);
    maxRow = Math.max(maxRow, tile.row);
    minCol = Math.min(minCol, tile.col);
    maxCol = Math.max(maxCol, tile.col);
  });
  
  return { minRow, maxRow, minCol, maxCol };
}

/**
 * Validate map data structure
 * @param {Object} data - The map data to validate
 * @returns {boolean} - Whether the data is valid
 */
export function validateMapData(data) {
  // Check required properties
  if (!data.width || !data.height || !data.layers) {
    return false;
  }
  
  // Check layers structure
  if (!Array.isArray(data.layers) || data.layers.length < 4) {
    return false;
  }
  
  // Check each layer has correct dimensions
  for (const layer of data.layers) {
    if (!Array.isArray(layer) || layer.length !== data.height) {
      return false;
    }
    
    for (const row of layer) {
      if (!Array.isArray(row) || row.length !== data.width) {
        return false;
      }
    }
  }
  
  return true;
}
