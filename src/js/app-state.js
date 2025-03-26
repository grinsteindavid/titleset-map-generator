// Import DOM elements
import {
  btnExportMap,
  btnCreateMap,
  mapWidthInput,
  mapHeightInput,
  mapCanvas,
  tilesetCtx
} from './dom-elements.js';

// Application state object
export const state = {
  // Tileset state
  tilesetImage: null,
  tilesetFilename: '',
  tilesetCols: 0,
  selectedTile: null,
  selectedTiles: [], // For multi-tile selection
  currentTilesetTab: 'tiles', // 'tiles' or 'collision'
  multiSelectMode: false,
  
  // Map state
  mapData: null,
  mapWidth: 20,
  mapHeight: 15,
  tileSize: 32, // Default tile size (32x32 pixels)
  
  // Layer state
  currentLayer: 0,
  isTabSelected: true, // Track whether a tab is selected
  
  // DOM elements for easier access
  btnExportMap,
  btnCreateMap,
  mapWidthInput,
  mapHeightInput,
  mapCanvas,
  tilesetCtx
};

// Export a function to reset state for testing purposes
export function resetState() {
  state.tilesetImage = null;
  state.tilesetFilename = '';
  state.selectedTile = null;
  state.selectedTiles = [];
  state.currentLayer = 0;
  state.currentTilesetTab = 'tiles';
  state.mapWidth = 20;
  state.mapHeight = 15;
  state.tileSize = 32;
  state.tilesetCols = 0;
  state.mapData = null;
  state.multiSelectMode = false;
  state.isTabSelected = true;
}
