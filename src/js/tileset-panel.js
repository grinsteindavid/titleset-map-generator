/**
 * This module manages the tileset panel UI and event handlers
 */

import { state } from './app-state.js';
import {
  tilesetCanvas,
  selectedTileInfo,
  selectedTilesCount
} from './dom-elements.js';
import {
  selectTile,
  clearSelectedTiles,
  switchTilesetTab
} from './tileset-manager.js';
import { showNotification } from './ui-utils.js';

// Track initialization state
let isInitialized = false;

/**
 * Initialize tileset panel event handlers
 */
export function initTilesetPanel() {
  // Prevent multiple initialization
  if (isInitialized) return;
  
  // Set up core tileset interaction
  tilesetCanvas.addEventListener('click', selectTile);
  
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
  
  // Mark as initialized
  isInitialized = true;
  
  console.log('Tileset panel initialized');
}

/**
 * Update the tileset panel UI based on current state
 */
export function updateTilesetPanel() {
  if (!isInitialized) return;
  
  // Update selected tiles count if in multi-select mode
  if (state.multiSelectMode) {
    selectedTilesCount.textContent = state.selectedTiles.length;
  }
  
  // Show/hide selected tiles container based on multi-select mode
  document.getElementById('selected-tiles-container').classList.toggle('hidden', !state.multiSelectMode);
}
