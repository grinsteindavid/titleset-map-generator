# Tileset Map Generator

A simple Electron-based application for creating tile-based maps with multiple layers using custom tilesets.

## Features

- Split interface with tileset selection panel and map editing area
- Support for three separate layers (background, main, foreground)
- Layer visualization with reduced opacity for non-active layers
- Grid-based map editing
- Custom map dimensions
- Export maps to JSON format
- Tile preview when hovering over the map

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

```bash
# Clone the repository or download the source code

# Install dependencies
npm install

# Start the application
npm start
```

## Usage

1. **Set Map Size**: Enter the desired width and height for your map and click "Create Map".
2. **Open Tileset**: Click "Open Tileset" to select a tileset image (PNG or JPEG).
3. **Select Tiles**: Click on a tile in the tileset panel to select it.
4. **Place Tiles**: Click on the map canvas to place the selected tile.
5. **Switch Layers**: Use the layer tabs to switch between different layers.
6. **Export Map**: Click "Export Map" to save your map data as a JSON file.

## Map JSON Format

The exported map data follows this structure:

```json
{
  "width": 20,
  "height": 15,
  "tileSize": 32,
  "layers": [
    [[0, 1, 2, ...], [...]],  // Layer 1 (background)
    [[null, 5, null, ...], [...]],  // Layer 2 (main)
    [[null, null, 10, ...], [...]]  // Layer 3 (foreground)
  ],
  "exportDate": "2025-03-25T12:00:00.000Z"
}
```

## License

MIT
# titleset-map-generator
