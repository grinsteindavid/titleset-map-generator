// DOM elements
const tilesetCanvas = document.getElementById('tileset-canvas');
const mapCanvas = document.getElementById('map-canvas');
const tilesetContainer = document.getElementById('tileset-container');
const selectedTileInfo = document.getElementById('selected-tile-info');
const btnOpenTileset = document.getElementById('btn-open-tileset');
const btnExportMap = document.getElementById('btn-export-map');
const btnImportMap = document.getElementById('btn-import-map');
const btnCreateMap = document.getElementById('btn-create-map');
const mapWidthInput = document.getElementById('map-width');
const mapHeightInput = document.getElementById('map-height');
const tabButtons = document.querySelectorAll('.tab-button');

// Canvas contexts
const tilesetCtx = tilesetCanvas.getContext('2d');
const mapCtx = mapCanvas.getContext('2d');

// Application state
let tilesetImage = null;
let tilesetFilename = ''; // Store the tileset filename
let selectedTile = null;
let selectedTiles = []; // For multi-tile selection
let currentLayer = 0;
let currentTilesetTab = 'tiles'; // 'tiles' or 'collision'
let mapWidth = 20;
let mapHeight = 15;
let tileSize = 32; // Default tile size (32x32 pixels)
let tilesetCols = 0;
let mapData = null;
let multiSelectMode = false;
let isTabSelected = true; // Track whether a tab is selected

// Initialize the application
function init() {
  // Set up event listeners
  btnOpenTileset.addEventListener('click', openTileset);
  btnExportMap.addEventListener('click', exportMap);
  btnImportMap.addEventListener('click', importMap);
  btnCreateMap.addEventListener('click', createMap);
  tilesetCanvas.addEventListener('click', selectTile);
  mapCanvas.addEventListener('click', placeTile);
  mapCanvas.addEventListener('mousemove', handleMapHover);
  
  // Set up map layer tab event listeners
  tabButtons.forEach(button => {
    if (button.dataset.layer !== undefined) {
      button.addEventListener('click', (e) => switchLayer(parseInt(e.target.dataset.layer)));
    }
  });
  
  // Set up reset layer buttons
  document.querySelectorAll('.reset-layer-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the layer tab switch
      
      // Check if this is the clear all collisions button
      if (button.id === 'clear-all-collisions') {
        clearAllCollisions();
      } else {
        // Regular layer reset
        resetLayer(parseInt(e.target.dataset.layer));
      }
    });
  });
  
  // Set up tileset tab event listeners
  document.querySelectorAll('.tileset-tab').forEach(button => {
    button.addEventListener('click', (e) => switchTilesetTab(e.target.dataset.tab));
  });
  
  // Multi-select mode toggle
  document.getElementById('multi-select-mode').addEventListener('change', (e) => {
    // Prevent enabling multi-select in collision tab
    if (currentTilesetTab === 'collision' && e.target.checked) {
      e.target.checked = false;
      showNotification('Multi-select is only available in Tiles tab', 'info');
      return;
    }
    
    multiSelectMode = e.target.checked;
    document.getElementById('selected-tiles-container').classList.toggle('hidden', !multiSelectMode);
    if (!multiSelectMode) {
      clearSelectedTiles();
    }
  });
  
  // Clear selection button
  document.getElementById('clear-selection').addEventListener('click', clearSelectedTiles);
}

// Load and display tileset image
async function openTileset() {
  try {
    const result = await window.electronAPI.openTileset();
    
    if (result.success && result.filePath) {
      const img = new Image();
      
      // Extract filename from the path
      const filePath = result.filePath;
      tilesetFilename = filePath.substring(filePath.lastIndexOf('/') + 1);
      
      img.onload = () => {
        // Hide empty state message
        document.querySelector('.empty-state').style.display = 'none';
        
        // Remove any no-tileset message if it exists
        const noTilesetMsg = document.getElementById('no-tileset-message');
        if (noTilesetMsg) {
          noTilesetMsg.remove();
        }
        
        // Store tileset image
        tilesetImage = img;
        
        // Resize tileset canvas to match image dimensions
        tilesetCanvas.width = img.width;
        tilesetCanvas.height = img.height;
        
        // Draw the tileset
        tilesetCtx.drawImage(img, 0, 0);
        
        // Calculate the number of columns in the tileset
        tilesetCols = Math.floor(img.width / tileSize);
        
        // Enable export button if map has been created
        if (mapData) {
          btnExportMap.disabled = false;
        }
        
        showNotification(`Tileset "${tilesetFilename}" loaded successfully`, 'success');
      };
      
      // Convert file path to base64 data URL since we can't directly load from a file path in the renderer
      img.src = 'file://' + result.filePath;
    }
  } catch (error) {
    console.error('Error opening tileset:', error);
    showNotification('Error loading tileset', 'error');
  }
}

// Check if tileset is loaded and show message if not
function checkTilesetLoaded() {
  if (!tilesetImage) {
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

// Create a new map with specified dimensions
function createMap() {
  // Check if tileset is loaded
  if (!checkTilesetLoaded()) {
    showNotification('Cannot create map without a tileset loaded', 'warning');
    return;
  }
  
  // Get map dimensions from inputs
  mapWidth = parseInt(mapWidthInput.value) || 20;
  mapHeight = parseInt(mapHeightInput.value) || 15;
  
  // Validate dimensions
  mapWidth = Math.max(5, Math.min(100, mapWidth));
  mapHeight = Math.max(5, Math.min(100, mapHeight));
  
  // Update input values
  mapWidthInput.value = mapWidth;
  mapHeightInput.value = mapHeight;
  
  // Set canvas dimensions
  mapCanvas.width = mapWidth * tileSize;
  mapCanvas.height = mapHeight * tileSize;
  
  // Check if we already had map data before
  const hadMapDataBefore = mapData !== null;
  
  // Initialize map data with three visual layers plus collision layer
  mapData = {
    width: mapWidth,
    height: mapHeight,
    tileSize: tileSize,
    tilesetFilename: tilesetFilename, // Store the tileset filename in the map data
    layers: [
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)) // Collision layer
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
  btnCreateMap.textContent = 'Restart Map';
  
  // Clear the canvas and draw grid
  clearMapCanvas();
  drawGrid();
  
  // Update tileset to show collision tiles if in collision tab
  if (currentTilesetTab === 'collision' && tilesetImage) {
    tilesetCtx.drawImage(tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
  
  // Enable export button if tileset is loaded
  if (tilesetImage) {
    btnExportMap.disabled = false;
  }
}

// Switch between tileset tabs (tiles/collision)
function switchTilesetTab(tab) {
  if (tab !== 'tiles' && tab !== 'collision') return;
  
  // Update current tab
  currentTilesetTab = tab;
  
  // Update ONLY tileset tab buttons, not map tabs
  document.querySelectorAll('.tileset-tab').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.tab === currentTilesetTab) {
      button.classList.add('active');
    }
  });
  
  // Make sure we don't accidentally remove active status from map tabs
  if (isTabSelected && currentLayer >= 0 && currentLayer <= 3) {
    tabButtons.forEach(button => {
      if (button.dataset.layer !== undefined && parseInt(button.dataset.layer) === currentLayer) {
        button.classList.add('active');
      }
    });
  }
  
  // Disable multi-select mode in collision tab
  if (tab === 'collision' && multiSelectMode) {
    multiSelectMode = false;
    document.getElementById('multi-select-mode').checked = false;
    document.getElementById('selected-tiles-container').classList.add('hidden');
    clearSelectedTiles();
    showNotification('Multi-select is only available in Tiles tab', 'info');
  }
  
  // Redraw tileset with appropriate highlights
  if (tilesetImage) {
    tilesetCtx.drawImage(tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
}

// Select a tile from the tileset
function selectTile(e) {
  if (!tilesetImage) {
    showNotification('No tileset loaded. Please load a tileset first.', 'warning');
    return;
  }
  
  // Get click coordinates relative to the canvas
  const rect = tilesetCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileX = Math.floor(x / tileSize) * tileSize;
  const tileY = Math.floor(y / tileSize) * tileSize;
  
  // Calculate tile index
  const tileCol = Math.floor(x / tileSize);
  const tileRow = Math.floor(y / tileSize);
  const tileIndex = tileRow * tilesetCols + tileCol;
  
  // Handle collision tab differently with immediate toggle in map
  if (currentTilesetTab === 'collision') {
    // Select the tile so it's highlighted
    selectedTile = {
      x: tileX,
      y: tileY,
      index: tileIndex
    };
    
    // Update selected tile info
    selectedTileInfo.innerHTML = `Selected Collision: (${tileCol}, ${tileRow}) - Index: ${tileIndex}`;
    
    // Check if this is already a collision tile
    const isAlreadyCollision = window.currentCollisionTiles && window.currentCollisionTiles.has(tileIndex);
    
    // Immediately apply to map if we have a map and are on the collision layer
    if (mapData) {
      // Automatically switch to collision layer if not already there
      if (currentLayer !== 3) {
        switchLayer(3);
        showNotification('Automatically switched to collision layer', 'info');
      }
      
      // Toggle collision for all map tiles matching this tile
      let changesMade = 0;
      for (let row = 0; row < mapHeight; row++) {
        for (let col = 0; col < mapWidth; col++) {
          // For any visual layer tiles that match the selected tile, toggle their collision
          for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
            if (mapData.layers[visualLayer][row][col] === tileIndex) {
              // Toggle collision - if null set to 1, if 1 set to null
              const currentValue = mapData.layers[3][row][col];
              mapData.layers[3][row][col] = currentValue === 1 ? null : 1;
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
        tilesetCtx.drawImage(tilesetImage, 0, 0);
        highlightSelectedTiles();
        
        showNotification(`Toggled collision for ${changesMade} tiles`, 'success');
      } else {
        // Just update the tileset highlighting to show selection
        tilesetCtx.drawImage(tilesetImage, 0, 0);
        highlightSelectedTiles();
      }
    }
  } else {
    // Regular tile selection logic for 'tiles' tab
    // Handle multi-select mode
    if (multiSelectMode) {
      const tileInfo = {
        x: tileX,
        y: tileY,
        index: tileIndex,
        col: tileCol,
        row: tileRow
      };
      
      // Check if tile is already selected
      const existingIndex = selectedTiles.findIndex(t => t.index === tileIndex);
      
      if (existingIndex !== -1) {
        // Remove if already selected
        selectedTiles.splice(existingIndex, 1);
      } else {
        // Add to selection
        selectedTiles.push(tileInfo);
      }
      
      // Update count display
      document.getElementById('selected-tiles-count').textContent = selectedTiles.length;
    } else {
      // Single select mode
      selectedTile = {
        x: tileX,
        y: tileY,
        index: tileIndex
      };
      
      // Update selected tile info
      selectedTileInfo.innerHTML = `Selected Tile: (${tileCol}, ${tileRow}) - Index: ${tileIndex}`;
    }
  }
  
  // Redraw tileset with highlighting
  tilesetCtx.drawImage(tilesetImage, 0, 0);
  highlightSelectedTiles();
}

// Highlight selected tiles on the tileset
function highlightSelectedTiles() {
  // Store collision information for all tiles
  let collisionTiles = new Set();
  
  // Create a map of tiles that have collision, even if they're not placed yet
  if (mapData && currentTilesetTab === 'collision') {
    // First add all collision tiles currently in the map
    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        if (mapData.layers[3][row][col] === 1) {
          // Find what tile is in this position on each visual layer
          for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
            const tileIndex = mapData.layers[visualLayer][row][col];
            if (tileIndex !== null) {
              collisionTiles.add(tileIndex);
            }
          }
        }
      }
    }
  }
  
  // Store the collisionTiles in a variable accessible to other functions
  window.currentCollisionTiles = collisionTiles;
  
  // If we're in multi-select mode, highlight all selected tiles in blue
  if (multiSelectMode) {
    tilesetCtx.strokeStyle = 'blue';
    tilesetCtx.lineWidth = 2;
    
    selectedTiles.forEach(tile => {
      tilesetCtx.strokeRect(tile.x, tile.y, tileSize, tileSize);
    });
  }
  
  // Highlight collision tiles in the tileset if we're in collision tab
  if (currentTilesetTab === 'collision' && tilesetImage) {
    const tilesetWidth = tilesetImage.width;
    const tilesetCols = Math.floor(tilesetWidth / tileSize);
    
    collisionTiles.forEach(tileIndex => {
      const tileRow = Math.floor(tileIndex / tilesetCols);
      const tileCol = tileIndex % tilesetCols;
      const tileX = tileCol * tileSize;
      const tileY = tileRow * tileSize;
      
      // Fill with semi-transparent red
      tilesetCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      tilesetCtx.fillRect(tileX, tileY, tileSize, tileSize);
      
      // Add a subtle border for better visibility
      tilesetCtx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      tilesetCtx.lineWidth = 1;
      tilesetCtx.strokeRect(tileX, tileY, tileSize, tileSize);
    });
  }
  
  // Highlight the currently selected tile
  if (selectedTile) {
    if (currentTilesetTab === 'collision') {
      // Highlight the currently selected collision tile with stronger highlight
      tilesetCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      tilesetCtx.fillRect(selectedTile.x, selectedTile.y, tileSize, tileSize);
      
      // Add a stronger border to the selected collision tile
      tilesetCtx.strokeStyle = 'red';
      tilesetCtx.lineWidth = 2;
      tilesetCtx.strokeRect(selectedTile.x, selectedTile.y, tileSize, tileSize);
    } else {
      // Blue highlight for tiles tab (matching multi-select color for consistency)
      tilesetCtx.strokeStyle = 'blue';
      tilesetCtx.lineWidth = 2;
      tilesetCtx.strokeRect(selectedTile.x, selectedTile.y, tileSize, tileSize);
    }
  }
}

// Clear all selected tiles
function clearSelectedTiles() {
  selectedTiles = [];
  document.getElementById('selected-tiles-count').textContent = '0';
  
  // Redraw tileset
  if (tilesetImage) {
    tilesetCtx.drawImage(tilesetImage, 0, 0);
    if (!multiSelectMode && selectedTile) {
      highlightSelectedTiles();
    }
  }
}

// Place a tile on the map
function placeTile(e) {
  if (!mapData) {
    showNotification('No map created. Please create a map first.', 'warning');
    return;
  }
  
  if (!tilesetImage) {
    showNotification('No tileset loaded. Please load a tileset first.', 'warning');
    return;
  }
  
  if (!isTabSelected) {
    showNotification('No layer selected. Please select a layer tab first.', 'warning');
    return;
  }
  
  if (!selectedTile && !multiSelectMode) {
    showNotification('No tile selected. Please select a tile from the tileset.', 'info');
    return;
  }
  if (!selectedTile && !multiSelectMode) return;
  if (multiSelectMode && selectedTiles.length === 0) return;
  
  // Get click coordinates relative to the canvas
  const rect = mapCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileCol = Math.floor(x / tileSize);
  const tileRow = Math.floor(y / tileSize);
  
  // Validate coordinates
  if (tileCol < 0 || tileCol >= mapWidth || tileRow < 0 || tileRow >= mapHeight) return;
  
  // Handle collision layer differently if in collision tab
  if (currentLayer === 3) {
    // For collision layer, we toggle between null and 1 (blocked)
    if (currentTilesetTab === 'collision') {
      // Check if there's a tile on any of the visual layers before toggling collision
      let hasTile = false;
      for (let layer = 0; layer < 3; layer++) {
        if (mapData.layers[layer][tileRow][tileCol] !== null) {
          hasTile = true;
          break;
        }
      }
      
      // Only toggle collision for tiles that exist in one of the visual layers
      if (hasTile) {
        const currentValue = mapData.layers[currentLayer][tileRow][tileCol];
        mapData.layers[currentLayer][tileRow][tileCol] = currentValue === 1 ? null : 1;
      }
      // No message if no tile found - just silently do nothing
    } else {
      // In regular tiles tab, we shouldn't be able to paint when on collision layer
      // Just silently return without action
      return;
    }
  } else {
    // For regular layers
    if (multiSelectMode && selectedTiles.length > 0) {
      // When using multi-select, we're placing multiple tiles at once
      // We need to check boundaries and make sure we don't go out of bounds
      
      // Find the dimensions of the selection (min/max rows and columns)
      const selectionInfo = calculateSelectionBounds();
      const selectionWidth = selectionInfo.maxCol - selectionInfo.minCol + 1;
      const selectionHeight = selectionInfo.maxRow - selectionInfo.minRow + 1;
      
      // Place each tile in the selection at the corresponding position
      selectedTiles.forEach(tile => {
        // Calculate relative position in the selection
        const relativeCol = tile.col - selectionInfo.minCol;
        const relativeRow = tile.row - selectionInfo.minRow;
        
        // Calculate target position on the map
        const targetCol = tileCol + relativeCol;
        const targetRow = tileRow + relativeRow;
        
        // Make sure we're within map bounds
        if (targetCol >= 0 && targetCol < mapWidth && targetRow >= 0 && targetRow < mapHeight) {
          mapData.layers[currentLayer][targetRow][targetCol] = tile.index;
        }
      });
    } else if (selectedTile) {
      // Single tile placement
      mapData.layers[currentLayer][tileRow][tileCol] = selectedTile.index;
    }
  }
  
  // Redraw map
  drawMap();
}

// Calculate the bounds (min/max rows and columns) of the selected tiles
function calculateSelectionBounds() {
  if (selectedTiles.length === 0) {
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }
  
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  
  selectedTiles.forEach(tile => {
    minRow = Math.min(minRow, tile.row);
    maxRow = Math.max(maxRow, tile.row);
    minCol = Math.min(minCol, tile.col);
    maxCol = Math.max(maxCol, tile.col);
  });
  
  return { minRow, maxRow, minCol, maxCol };
}

// Handle mouse hover over map for preview
function handleMapHover(e) {
  if (!mapData || !tilesetImage || !isTabSelected) return;
  
  // In collision tab, we don't need a tile selected to preview toggle actions
  if (currentLayer !== 3) {
    // For regular layers, we need a tile selected
    if (!selectedTile && !multiSelectMode) return;
    if (multiSelectMode && selectedTiles.length === 0) return;
  }
  
  // Get hover coordinates relative to the canvas
  const rect = mapCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate tile coordinates
  const tileCol = Math.floor(x / tileSize);
  const tileRow = Math.floor(y / tileSize);
  
  // Validate coordinates
  if (tileCol < 0 || tileCol >= mapWidth || tileRow < 0 || tileRow >= mapHeight) return;
  
  // Redraw map
  drawMap();
  
  mapCtx.globalAlpha = 0.5;
  
  // Handle collision layer preview differently
  if (currentLayer === 3 && currentTilesetTab === 'collision') {
    // For collision layer in collision tab, show a red square
    mapCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    mapCtx.fillRect(
      tileCol * tileSize, tileRow * tileSize, tileSize, tileSize
    );
  } else if (multiSelectMode && selectedTiles.length > 0) {
    // Preview for multi-tile selection
    const selectionInfo = calculateSelectionBounds();
    const selectionWidth = selectionInfo.maxCol - selectionInfo.minCol + 1;
    const selectionHeight = selectionInfo.maxRow - selectionInfo.minRow + 1;
    
    // Draw each tile in the selection
    selectedTiles.forEach(tile => {
      // Calculate relative position in the selection
      const relativeCol = tile.col - selectionInfo.minCol;
      const relativeRow = tile.row - selectionInfo.minRow;
      
      // Calculate target position on the map
      const targetCol = tileCol + relativeCol;
      const targetRow = tileRow + relativeRow;
      
      // Make sure we're within map bounds
      if (targetCol >= 0 && targetCol < mapWidth && targetRow >= 0 && targetRow < mapHeight) {
        const tileX = Math.floor(tile.x / tileSize) * tileSize;
        const tileY = Math.floor(tile.y / tileSize) * tileSize;
        mapCtx.drawImage(
          tilesetImage, 
          tileX, tileY, tileSize, tileSize,
          targetCol * tileSize, targetRow * tileSize, tileSize, tileSize
        );
      }
    });
  } else if (selectedTile) {
    // Single tile preview
    const tileX = Math.floor(selectedTile.x / tileSize) * tileSize;
    const tileY = Math.floor(selectedTile.y / tileSize) * tileSize;
    mapCtx.drawImage(
      tilesetImage, 
      tileX, tileY, tileSize, tileSize,
      tileCol * tileSize, tileRow * tileSize, tileSize, tileSize
    );
  }
  
  mapCtx.globalAlpha = 1.0;
}

// Switch between layers
function switchLayer(layerIndex) {
  if (layerIndex < 0 || layerIndex > 3) return;
  
  // Update current layer
  currentLayer = layerIndex;
  isTabSelected = true;
  
  // Update ONLY map tab buttons, not tileset tabs
  tabButtons.forEach(button => {
    // Only process buttons that have a layer attribute (map tabs)
    if (button.dataset.layer !== undefined) {
      button.classList.remove('active');
      if (parseInt(button.dataset.layer) === currentLayer) {
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

// Deselect all tabs
function deselectAllTabs() {
  isTabSelected = false;
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Show message that no tab is selected
  showNoTabSelectedMessage();
}

// Show message when no tab is selected
function showNoTabSelectedMessage() {
  // Remove existing message if present
  const existingMessage = document.getElementById('no-tab-selected-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageElem = document.createElement('div');
  messageElem.id = 'no-tab-selected-message';
  messageElem.className = 'notification warning';
  messageElem.textContent = 'No layer tab is selected. Please select a layer to edit.';
  
  // Add to map container
  document.querySelector('.map-container').appendChild(messageElem);
}

// Clear map canvas
function clearMapCanvas() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
}

// Draw grid on map canvas
function drawGrid() {
  mapCtx.strokeStyle = '#ddd';
  mapCtx.lineWidth = 1;
  
  // Draw vertical lines
  for (let i = 0; i <= mapWidth; i++) {
    mapCtx.beginPath();
    mapCtx.moveTo(i * tileSize, 0);
    mapCtx.lineTo(i * tileSize, mapHeight * tileSize);
    mapCtx.stroke();
  }
  
  // Draw horizontal lines
  for (let i = 0; i <= mapHeight; i++) {
    mapCtx.beginPath();
    mapCtx.moveTo(0, i * tileSize);
    mapCtx.lineTo(mapWidth * tileSize, i * tileSize);
    mapCtx.stroke();
  }
}

// Draw the map with all layers
function drawMap() {
  if (!mapData || !tilesetImage) return;
  
  // Clear canvas
  clearMapCanvas();
  
  // Draw grid
  drawGrid();
  
  // Draw visual layers (0-2)
  for (let layer = 0; layer < 3; layer++) {
    // Set opacity based on whether this is the current layer
    mapCtx.globalAlpha = layer === currentLayer ? 1.0 : 0.3;
    
    // Draw tiles for this layer
    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const tileIndex = mapData.layers[layer][row][col];
        if (tileIndex !== null) {
          // Calculate tile position in tileset
          const tilesetCol = tileIndex % tilesetCols;
          const tilesetRow = Math.floor(tileIndex / tilesetCols);
          const tileX = tilesetCol * tileSize;
          const tileY = tilesetRow * tileSize;
          
          // Draw tile
          mapCtx.drawImage(
            tilesetImage, 
            tileX, tileY, tileSize, tileSize,
            col * tileSize, row * tileSize, tileSize, tileSize
          );
        }
      }
    }
  }
  
  // Draw collision layer if it's the current layer
  if (currentLayer === 3) {
    mapCtx.globalAlpha = 1.0;
    
    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const value = mapData.layers[3][row][col];
        
        if (value !== null) {
          if (value === 1) {
            // Draw simple collision indicator - more visible now
            mapCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            mapCtx.fillRect(
              col * tileSize, row * tileSize, tileSize, tileSize
            );
            mapCtx.strokeStyle = 'red';
            mapCtx.lineWidth = 2;
            mapCtx.strokeRect(
              col * tileSize, row * tileSize, tileSize, tileSize
            );
            
            // Add a cross pattern for better visibility
            mapCtx.beginPath();
            mapCtx.moveTo(col * tileSize, row * tileSize);
            mapCtx.lineTo(col * tileSize + tileSize, row * tileSize + tileSize);
            mapCtx.moveTo(col * tileSize + tileSize, row * tileSize);
            mapCtx.lineTo(col * tileSize, row * tileSize + tileSize);
            mapCtx.stroke();
            
            // Make sure we update the collision tiles in our global collection
            // Find what tile index is at this position in each visual layer
            for (let visualLayer = 0; visualLayer < 3; visualLayer++) {
              const tileIndex = mapData.layers[visualLayer][row][col];
              if (tileIndex !== null && window.currentCollisionTiles) {
                window.currentCollisionTiles.add(tileIndex);
              }
            }
          } else {
            // It's a tile index, not just a collision marker
            const tilesetCol = value % tilesetCols;
            const tilesetRow = Math.floor(value / tilesetCols);
            const tileX = tilesetCol * tileSize;
            const tileY = tilesetRow * tileSize;
            
            // Draw tile with slight transparency
            mapCtx.globalAlpha = 0.8;
            mapCtx.drawImage(
              tilesetImage, 
              tileX, tileY, tileSize, tileSize,
              col * tileSize, row * tileSize, tileSize, tileSize
            );
          }
        }
      }
    }
  } else {
    // If we're not on the collision layer, still show collision indicators with low opacity
    mapCtx.globalAlpha = 0.2;
    
    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const value = mapData.layers[3][row][col];
        if (value === 1) {
          // Draw simple collision indicator with a subtle pattern
          mapCtx.fillStyle = 'red';
          mapCtx.fillRect(
            col * tileSize, row * tileSize, tileSize, tileSize
          );
          
          // Add a subtle border
          mapCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          mapCtx.lineWidth = 1;
          mapCtx.strokeRect(
            col * tileSize, row * tileSize, tileSize, tileSize
          );
        }
      }
    }
  }
  
  // Reset opacity
  mapCtx.globalAlpha = 1.0;
}

// Clear all collision data from the map
function clearAllCollisions() {
  if (!mapData) {
    showNotification('No map data to clear collisions from', 'warning');
    return;
  }
  
  // Ask for confirmation
  if (!confirm('Are you sure you want to clear ALL collision data? This cannot be undone.')) {
    return;
  }
  
  // Clear collision layer (layer 3)
  for (let row = 0; row < mapHeight; row++) {
    for (let col = 0; col < mapWidth; col++) {
      mapData.layers[3][row][col] = null;
    }
  }
  
  // Clear global collision tiles tracking
  window.currentCollisionTiles = new Set();
  
  // Redraw map
  drawMap();
  
  // Update tileset to reflect cleared collisions
  if (tilesetImage && currentTilesetTab === 'collision') {
    tilesetCtx.drawImage(tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
  
  showNotification('All collision data has been cleared', 'success');
}

// Export map data to JSON
async function exportMap() {
  if (!mapData) {
    showNotification('No map data to export', 'error');
    return;
  }
  
  if (!tilesetImage) {
    showNotification('Cannot export map without a tileset loaded', 'warning');
    return;
  }
  
  // Ensure the tileset filename is included in the map data
  mapData.tilesetFilename = tilesetFilename;
  
  try {
    // Prepare map data for export
    const exportData = {
      ...mapData,
      exportDate: new Date().toISOString()
    };
    
    // Use Electron API to save map data to a file
    const result = await window.electronAPI.saveMap(exportData);
    
    if (result.success) {
      console.log('Map exported successfully');
    } else if (result.error) {
      console.error('Error exporting map:', result.error);
    }
  } catch (error) {
    console.error('Error exporting map:', error);
  }
}

// Import map data from JSON
async function importMap() {
  try {
    // Check if we need to warn about not having a tileset loaded
    if (!tilesetImage) {
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
      if (result.mapData.tilesetFilename && result.mapData.tilesetFilename !== tilesetFilename) {
        showNotification(
          `Warning: The map was created with tileset "${result.mapData.tilesetFilename}" but you currently have "${tilesetFilename}" loaded. This may cause display issues.`, 
          'warning'
        );
      }
      
      // Update local map data
      mapData = result.mapData;
      
      // Update map dimensions
      mapWidth = mapData.width;
      mapHeight = mapData.height;
      tileSize = mapData.tileSize || 32;
      
      // Update input values
      mapWidthInput.value = mapWidth;
      mapHeightInput.value = mapHeight;
      
      // Set canvas dimensions
      mapCanvas.width = mapWidth * tileSize;
      mapCanvas.height = mapHeight * tileSize;
      
      // Enable export button
      btnExportMap.disabled = false;
      
      // Draw the map
      drawMap();
      
      // Update tileset to show collision tiles if we're in collision tab
      if (currentTilesetTab === 'collision') {
        tilesetCtx.drawImage(tilesetImage, 0, 0);
        highlightSelectedTiles();
      }
      
      // Update Create Map button text since we now have map data
      btnCreateMap.textContent = 'Restart Map';
      
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

// Reset a specific layer (clear all tiles)
function resetLayer(layerIndex) {
  if (!mapData || layerIndex < 0 || layerIndex > 3) {
    showNotification('Cannot reset layer - no map exists', 'error');
    return;
  }

  // Ask for confirmation
  const layerName = layerIndex === 3 ? 'collision layer' : `layer ${layerIndex + 1}`;
  if (!confirm(`Are you sure you want to clear the entire ${layerName}? This cannot be undone.`)) {
    return;
  }

  // Reset the layer to all null values
  for (let row = 0; row < mapHeight; row++) {
    for (let col = 0; col < mapWidth; col++) {
      mapData.layers[layerIndex][row][col] = null;
    }
  }

  // Redraw the map
  drawMap();
  
  // If we're in collision tab and resetting the collision layer, also update tileset view
  if (layerIndex === 3 && currentTilesetTab === 'collision') {
    // Redraw tileset to update collision indicators
    if (tilesetImage) {
      tilesetCtx.drawImage(tilesetImage, 0, 0);
      highlightSelectedTiles();
    }
  }

  showNotification(`${layerName.charAt(0).toUpperCase() + layerName.slice(1)} has been cleared`, 'success');
}

// Validate map data structure
function validateMapData(data) {
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

// Display a notification to the user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Append to body
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('visible');
    setTimeout(() => {
      notification.remove();
    }, 500); // Wait for fade out animation
  }, 3000);
}

// Initialize application
init();
