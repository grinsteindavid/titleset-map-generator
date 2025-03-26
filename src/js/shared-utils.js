/**
 * This module contains utility functions shared across multiple modules
 * to help avoid circular dependencies
 */

import { state } from './app-state.js';

// Forward declarations for functions that will be set later
// This allows us to break circular dependencies
export let drawMap = null;
export let switchLayer = null;

// Function to register the map drawing function
export function registerDrawMap(drawMapFn) {
  drawMap = drawMapFn;
}

// Function to register the layer switching function
export function registerSwitchLayer(switchLayerFn) {
  switchLayer = switchLayerFn;
}
