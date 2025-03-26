

// Import UI panel modules
import { initToolbar } from './toolbar-panel.js';
import { initTilesetPanel } from './tileset-panel.js';
import { initMapPanel } from './map-panel.js';

// Import utility modules
import { showNotification } from './ui-utils.js';

/**
 * Initialize the application
 * Following MVC-like pattern with separated UI components
 */
function init() {
  // Log application start
  console.log('Initializing Tileset Map Generator...');
  
  // Initialize UI components in order
  initToolbar();     // Initialize toolbar controls
  initTilesetPanel(); // Initialize tileset panel and its event handlers
  initMapPanel();    // Initialize map panel and its event handlers
  
  // Display welcome message
  showNotification('Application initialized successfully', 'success');
  
  console.log('Application initialization complete');
}

// Initialize application
init();


