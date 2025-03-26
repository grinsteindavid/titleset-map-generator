// Import DOM elements
import {
  btnOpenTileset,
  btnExportMap,
  btnImportMap,
  btnCreateMap,
  tilesetCanvas,
  mapCanvas,
  tabButtons
} from './dom-elements.js';

// Import application state
import { state } from './app-state.js';

// Import module functions
import { openTileset, selectTile, clearSelectedTiles, switchTilesetTab } from './tileset-manager.js';
import { createMap, placeTile, handleMapHover } from './map-manager.js';
import { clearAllCollisions, resetLayer } from './collision-manager.js';
import { exportMap, importMap } from './io-manager.js';
// Import showNotification for the multi-select mode toggle
import { showNotification } from './ui-utils.js';
import { switchLayer } from './shared-utils.js';

/**
 * Initialize the application
 */
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
    if (state.currentTilesetTab === 'collision' && e.target.checked) {
      e.target.checked = false;
      showNotification('Multi-select is only available in Tiles tab', 'info');
      return;
    }
    
    state.multiSelectMode = e.target.checked;
    document.getElementById('selected-tiles-container').classList.toggle('hidden', !state.multiSelectMode);
    if (!state.multiSelectMode) {
      clearSelectedTiles();
    }
  });
  
  // Clear selection button
  document.getElementById('clear-selection').addEventListener('click', clearSelectedTiles);
}

// Initialize application
init();


