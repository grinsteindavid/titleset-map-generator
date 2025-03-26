/**
 * This module manages the map panel UI and event handlers
 */

import { state } from './app-state.js';
import { mapCanvas } from './dom-elements.js';
import { placeTile, handleMapHover } from './map-manager.js';
import { clearAllCollisions, resetLayer } from './collision-manager.js';
import { switchLayer, drawMap } from './shared-utils.js';
import { showNotification } from './ui-utils.js';

// Track initialization state
let isInitialized = false;

/**
 * Initialize map panel event handlers
 */
export function initMapPanel() {
  // Prevent multiple initialization
  if (isInitialized) return;
  
  // Set up core map interaction
  mapCanvas.addEventListener('click', placeTile);
  mapCanvas.addEventListener('mousemove', handleMapHover);
  
  // Set up map layer tab event listeners
  document.querySelectorAll('.tab-button').forEach(button => {
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
  
  // Mark as initialized
  isInitialized = true;
  
  console.log('Map panel initialized');
}

/**
 * Update the map panel UI based on the current state
 */
export function updateMapPanel() {
  if (!isInitialized || !state.mapData) return;
  
  // Update layer tab indicators
  document.querySelectorAll('.tab-button').forEach(button => {
    // Only process buttons that have a layer attribute (map tabs)
    if (button.dataset.layer !== undefined) {
      button.classList.toggle('active', parseInt(button.dataset.layer) === state.currentLayer);
    }
  });
  
  // Redraw the map
  drawMap();
}

/**
 * Set the active map layer
 * @param {number} layerIndex - The layer index to make active
 */
export function setActiveMapLayer(layerIndex) {
  if (!isInitialized) return;
  
  // Validate layer index
  if (layerIndex < 0 || layerIndex > 3) {
    showNotification('Invalid layer index', 'error');
    return;
  }
  
  // Switch to the specified layer
  switchLayer(layerIndex);
}
