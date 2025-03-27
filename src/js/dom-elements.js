// DOM element references
export const tilesetCanvas = document.getElementById('tileset-canvas');
export const mapCanvas = document.getElementById('map-canvas');
export const tilesetContainer = document.getElementById('tileset-container');
export const selectedTileInfo = document.getElementById('selected-tile-info');
export const btnOpenTileset = document.getElementById('btn-open-tileset');
export const btnExportMap = document.getElementById('btn-export-map');
export const btnImportMap = document.getElementById('btn-import-map');
export const btnCreateMap = document.getElementById('btn-create-map');
export const btnPreviewMap = document.getElementById('btn-preview-map');
export const mapWidthInput = document.getElementById('map-width');
export const mapHeightInput = document.getElementById('map-height');
export const tabButtons = document.querySelectorAll('.tab-button');
export const selectedTilesCount = document.getElementById('selected-tiles-count');

// Canvas contexts
export const tilesetCtx = tilesetCanvas.getContext('2d');
export const mapCtx = mapCanvas.getContext('2d');
