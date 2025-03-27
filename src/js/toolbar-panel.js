/**
 * This module manages the application toolbar functionality
 * Centralizes all toolbar-related operations to maintain separation of concerns
 */

import { state } from './app-state.js';
import { exportMap, importMap } from './io-manager.js';
import { showNotification } from './ui-utils.js';
import { drawGrid } from './map-manager.js';

// Import required DOM elements
import {
  btnOpenTileset,
  btnExportMap,
  btnImportMap,
  btnCreateMap,
  btnPreviewMap,
  mapWidthInput,
  mapHeightInput,
  tilesetCtx,
  tilesetCanvas,
  mapCanvas
} from './dom-elements.js';
import { checkTilesetLoaded, highlightSelectedTiles } from './tileset-manager.js';

// Track toolbar initialization
let isInitialized = false;

/**
 * Initialize toolbar event listeners
 */
export function initToolbar() {
  // Prevent multiple initialization
  if (isInitialized) return;
  
  // Set up toolbar button event listeners
  btnOpenTileset.addEventListener('click', openTileset);
  btnExportMap.addEventListener('click', exportMap);
  btnImportMap.addEventListener('click', importMap);
  btnCreateMap.addEventListener('click', createMap);
  btnPreviewMap.addEventListener('click', previewMap);
  
  // Set up dimension input handlers
  mapWidthInput.addEventListener('change', validateDimensions);
  mapHeightInput.addEventListener('change', validateDimensions);
  
  // Initial toolbar state update
  updateToolbarState();
  
  // Mark as initialized
  isInitialized = true;
  
  console.log('Toolbar module initialized');
}

/**
 * Validate map dimensions from input fields
 */
export function validateDimensions() {
  const width = parseInt(mapWidthInput.value) || 20;
  const height = parseInt(mapHeightInput.value) || 15;
  
  // Validate dimensions
  const validatedWidth = Math.max(5, Math.min(100, width));
  const validatedHeight = Math.max(5, Math.min(100, height));
  
  // Update input values if they were adjusted
  if (width !== validatedWidth) {
    mapWidthInput.value = validatedWidth;
    showNotification('Width adjusted to valid range (5-100)', 'info');
  }
  
  if (height !== validatedHeight) {
    mapHeightInput.value = validatedHeight;
    showNotification('Height adjusted to valid range (5-100)', 'info');
  }
  
  // Update state
  state.mapWidth = validatedWidth;
  state.mapHeight = validatedHeight;
}

/**
 * Update toolbar button states based on application state
 * This is a public API that can be called from other modules to keep toolbar in sync
 */
export function updateToolbarState() {
  // Skip if not initialized yet
  if (!isInitialized) return;
  
  // Enable/disable export and preview buttons based on map and tileset state
  btnExportMap.disabled = !state.mapData || !state.tilesetImage;
  btnPreviewMap.disabled = !state.mapData || !state.tilesetImage;
  
  // Update create map button text based on whether map exists
  btnCreateMap.textContent = state.mapData ? 'Restart Map' : 'Create Map';
}

/**
 * Enables or disables the export button explicitly
 * @param {boolean} enabled - Whether the button should be enabled
 */
export function setExportEnabled(enabled) {
  if (!isInitialized) return;
  btnExportMap.disabled = !enabled;
}


/**
 * Load and display tileset image
 */
export async function openTileset() {
  try {
    const result = await window.electronAPI.openTileset();
    
    if (result.success && result.filePath) {
      const img = new Image();
      
      // Extract filename from the path
      const filePath = result.filePath;
      state.tilesetFilename = filePath.substring(filePath.lastIndexOf('/') + 1);
      
      img.onload = () => {
        // Hide empty state message
        document.querySelector('.empty-state').style.display = 'none';
        
        // Remove any no-tileset message if it exists
        const noTilesetMsg = document.getElementById('no-tileset-message');
        if (noTilesetMsg) {
          noTilesetMsg.remove();
        }
        
        // Store tileset image
        state.tilesetImage = img;
        
        // Resize tileset canvas to match image dimensions
        tilesetCanvas.width = img.width;
        tilesetCanvas.height = img.height;
        
        // Draw the tileset
        tilesetCtx.drawImage(img, 0, 0);
        
        // Calculate the number of columns in the tileset
        state.tilesetCols = Math.floor(img.width / state.tileSize);
        
        // Enable export button if map has been created
        if (state.mapData) {
          state.btnExportMap.disabled = false;
        }
        
        showNotification(`Tileset "${state.tilesetFilename}" loaded successfully`, 'success');
      };
      
      // Convert file path to base64 data URL since we can't directly load from a file path in the renderer
      img.src = 'file://' + result.filePath;
    }
  } catch (error) {
    console.error('Error opening tileset:', error);
    showNotification('Error loading tileset', 'error');
  }
}

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
  
  // Map has been created, notify toolbar module
  updateToolbarState();
  
  // Clear the canvas and draw grid
  clearMapCanvas();
  drawGrid();
  
  // Update tileset to show collision tiles if in collision tab
  if (state.currentTilesetTab === 'collision' && state.tilesetImage) {
    state.tilesetCtx.drawImage(state.tilesetImage, 0, 0);
    highlightSelectedTiles();
  }
  
  // Enable export and preview buttons if tileset is loaded
  if (state.tilesetImage) {
    btnExportMap.disabled = false;
    btnPreviewMap.disabled = false;
  }
}

/**
 * Open a new window with a full preview of the map
 */
export function previewMap() {
  // Check if map exists
  if (!state.mapData) {
    showNotification('No map to preview. Please create a map first.', 'warning');
    return;
  }
  
  // Check if tileset is loaded
  if (!state.tilesetImage) {
    showNotification('No tileset loaded. Please load a tileset first.', 'warning');
    return;
  }
  
  // Calculate the preview window size based on map dimensions
  const windowWidth = Math.min(1024, state.mapWidth * state.tileSize + 100); // add padding
  const windowHeight = Math.min(768, state.mapHeight * state.tileSize + 160); // add padding for title
  
  // Open a new window
  const previewWindow = window.open('', 'MapPreview', 
    `width=${windowWidth},height=${windowHeight},menubar=no,toolbar=no,location=no,status=no`);
  
  if (!previewWindow) {
    showNotification('Unable to open preview window. Please check your popup blocker settings.', 'error');
    return;
  }
  
  // Write HTML content to the new window
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Map Preview</title>
      <style>
        body {
          margin: 0;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: #1a1a2e;
          color: #e6e6e6;
          font-family: Arial, sans-serif;
          overflow: auto;
        }
        h2 {
          margin-top: 0;
          color: #4da6ff;
          text-shadow: 0 0 5px rgba(77, 166, 255, 0.5);
        }
        .preview-container {
          position: relative;
          border: 2px solid #4da6ff;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(77, 166, 255, 0.5);
          overflow: auto;
          margin-bottom: 15px;
        }
        canvas {
          display: block;
        }
        .info-bar {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 5px 10px;
          background-color: #16213e;
          border-top: 1px solid #4da6ff;
          box-sizing: border-box;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <h2>Map Preview</h2>
      <div class="preview-container">
        <canvas id="preview-canvas"></canvas>
      </div>
      <div class="info-bar">
        <span>Dimensions: ${state.mapWidth} x ${state.mapHeight}</span>
        <span>Visual Layers Only</span>
        <span>Tile Size: ${state.tileSize}px</span>
      </div>
    </body>
    </html>
  `);
  
  // Close the document
  previewWindow.document.close();
  
  // Wait for the window to load before drawing
  previewWindow.onload = function() {
    const canvas = previewWindow.document.getElementById('preview-canvas');
    if (!canvas) {
      previewWindow.alert('Error initializing preview canvas');
      return;
    }
    
    // Set canvas dimensions to match map size
    canvas.width = state.mapWidth * state.tileSize;
    canvas.height = state.mapHeight * state.tileSize;
    
    const ctx = canvas.getContext('2d');
    
    // Draw the map layers
    // Draw visual layers (0-2) with full opacity
    for (let layer = 0; layer < 3; layer++) {
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
            
            // Draw tile with full opacity
            ctx.drawImage(
              state.tilesetImage, 
              tileX, tileY, state.tileSize, state.tileSize,
              col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize
            );
          }
        }
      }
    }
    
    // Reset opacity after drawing all visual layers
    ctx.globalAlpha = 1.0;
    
    // No grid or other editor elements in the preview
  };
}