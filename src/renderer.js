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
  
  // Set up tileset tab event listeners
  document.querySelectorAll('.tileset-tab').forEach(button => {
    button.addEventListener('click', (e) => switchTilesetTab(e.target.dataset.tab));
  });
  
  // Multi-select mode toggle
  document.getElementById('multi-select-mode').addEventListener('change', (e) => {
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
      
      img.onload = () => {
        // Hide empty state message
        document.querySelector('.empty-state').style.display = 'none';
        
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
      };
      
      // Convert file path to base64 data URL since we can't directly load from a file path in the renderer
      img.src = 'file://' + result.filePath;
    }
  } catch (error) {
    console.error('Error opening tileset:', error);
  }
}

// Create a new map with specified dimensions
function createMap() {
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
  
  // Initialize map data with three visual layers plus collision layer
  mapData = {
    width: mapWidth,
    height: mapHeight,
    tileSize: tileSize,
    layers: [
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)),
      Array(mapHeight).fill().map(() => Array(mapWidth).fill(null)) // Collision layer
    ]
  };
  
  // Clear the canvas and draw grid
  clearMapCanvas();
  drawGrid();
  
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
  
  // Update tab buttons
  document.querySelectorAll('.tileset-tab').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.tab === currentTilesetTab) {
      button.classList.add('active');
    }
  });
  
  // Redraw tileset with appropriate highlights
  if (tilesetImage) {
    tilesetCtx.drawImage(tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
}

// Select a tile from the tileset
function selectTile(e) {
  if (!tilesetImage) return;
  
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
  
  // Redraw tileset with highlighting
  tilesetCtx.drawImage(tilesetImage, 0, 0);
  highlightSelectedTiles();
}

// Highlight selected tiles on the tileset
function highlightSelectedTiles() {
  if (multiSelectMode) {
    // Highlight all selected tiles
    tilesetCtx.strokeStyle = 'blue';
    tilesetCtx.lineWidth = 2;
    
    selectedTiles.forEach(tile => {
      tilesetCtx.strokeRect(tile.x, tile.y, tileSize, tileSize);
    });
  } else if (selectedTile) {
    // Highlight single selected tile
    tilesetCtx.strokeStyle = currentTilesetTab === 'collision' ? 'orange' : 'red';
    tilesetCtx.lineWidth = 2;
    tilesetCtx.strokeRect(selectedTile.x, selectedTile.y, tileSize, tileSize);
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
  if (!mapData || !tilesetImage) return;
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
      const currentValue = mapData.layers[currentLayer][tileRow][tileCol];
      mapData.layers[currentLayer][tileRow][tileCol] = currentValue === 1 ? null : 1;
    } else {
      // If we're in regular tiles tab but on collision layer, place selected tile
      if (multiSelectMode && selectedTiles.length > 0) {
        // Place first selected tile when in multi-select mode
        mapData.layers[currentLayer][tileRow][tileCol] = selectedTiles[0].index;
      } else if (selectedTile) {
        mapData.layers[currentLayer][tileRow][tileCol] = selectedTile.index;
      }
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
  if (!mapData || !tilesetImage) return;
  if (!selectedTile && !multiSelectMode) return;
  if (multiSelectMode && selectedTiles.length === 0) return;
  
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
  
  // Update tab buttons
  tabButtons.forEach(button => {
    button.classList.remove('active');
    if (parseInt(button.dataset.layer) === currentLayer) {
      button.classList.add('active');
    }
  });
  
  // Redraw map
  drawMap();
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
            // Draw simple collision indicator
            mapCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            mapCtx.fillRect(
              col * tileSize, row * tileSize, tileSize, tileSize
            );
            mapCtx.strokeStyle = 'red';
            mapCtx.lineWidth = 2;
            mapCtx.strokeRect(
              col * tileSize, row * tileSize, tileSize, tileSize
            );
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
    mapCtx.globalAlpha = 0.15;
    
    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const value = mapData.layers[3][row][col];
        if (value === 1) {
          // Draw simple collision indicator
          mapCtx.fillStyle = 'red';
          mapCtx.fillRect(
            col * tileSize, row * tileSize, tileSize, tileSize
          );
        }
      }
    }
  }
  
  // Reset opacity
  mapCtx.globalAlpha = 1.0;
}

// Export map data to JSON
async function exportMap() {
  if (!mapData) return;
  
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
      showNotification('No tileset loaded. You may need to load a tileset to see the map properly.', 'info');
    }
    
    // Use Electron API to open a map file
    const result = await window.electronAPI.openMap();
    
    if (result.success && result.mapData) {
      // Validate map data structure
      if (!validateMapData(result.mapData)) {
        showNotification('Invalid map data format', 'error');
        return;
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
      
      // Enable export button if tileset is loaded
      if (tilesetImage) {
        btnExportMap.disabled = false;
      }
      
      // Draw the map
      drawMap();
      
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
