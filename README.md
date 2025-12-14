# FFmpeg Video Converter

A cross-platform desktop application for batch video conversion with a modern GUI.

## Features

- Batch convert multiple videos
- Custom presets (save your favorite settings)
- Real-time progress tracking
- Modern dark UI
- One-click FFmpeg installation (Windows/Mac/Linux)
- Built-in presets for TV shows and movies
- Support for H.264, H.265, and VP9 codecs
- Multiple audio codec options

## Installation

### From Release (Recommended)
Download the latest release for your platform:
- **Windows**: `.exe` installer or portable `.zip`
- **macOS**: `.dmg` installer
- **Linux**: `.AppImage` or `.deb` package

### From Source
```bash
npm install
npm start
```

## Usage

1. Install FFmpeg (click the button if not detected)
2. Select a folder with video files
3. Choose a preset or customize settings
4. Click "Convert"
5. Find converted files in the `converted` subfolder

## Building
```bash
# Build for all platforms
npm run dist

# Build for specific platform
npm run dist-win    # Windows
npm run dist-mac    # macOS
npm run dist-linux  # Linux
```

## License

MIT