# 🎬 FFmpeg Converter Pro - Electron

**Professional video converter with auto FFmpeg installation** - Built from the ground up with modern UI/UX

## ✨ Features

### 🎯 Core Features
- ✅ **Auto FFmpeg Install** - No manual setup required!
- ✅ **Modern UI** - Beautiful, intuitive interface
- ✅ **Batch Processing** - Convert multiple files
- ✅ **Real-time Progress** - See exactly what's happening
- ✅ **Error Handling** - Comprehensive error catching and logging

### 🎥 Video Processing
- **Formats**: MP4, MKV, WebM, AVI
- **Codecs**: H.264, H.265, VP9
- **Quality**: CRF 0-51 control
- **Resolution**: Up to 4K support
- **Presets**: Ultrafast to Veryslow

### 🔊 Audio Processing
- **Codecs**: AAC, Opus, MP3, Copy
- **Bitrate**: 64-320 kbps
- **Multi-track**: Keep all audio tracks

### 🌍 Track Selection (3 Modes)
1. **Keep All** - Preserve everything
2. **Language Filter** - Filter by codes (eng, jpn, spa, etc.)
3. **Custom Selection** - Pick specific tracks with FFprobe

### 💾 Post-Processing
- **Filename Cleaning** - Remove quality tags
- **Auto-Replace** - Replace originals (with warning)
- **Recursive Mode** - Scan subdirectories

### 🎨 Preset System
- Built-in presets (TV, Movies, Quality, Small)
- Save custom presets
- One-click loading

## 🚀 Quick Start

### Installation

```bash
# Clone or download the project
cd ffmpeg-converter-electron

# Install dependencies (this auto-downloads FFmpeg!)
npm install

# Run the app
npm start
```

**That's it!** FFmpeg is automatically downloaded and configured!

## 📦 Building

Create installers for your platform:

```bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build
```

Output will be in the `dist/` folder.

## 🎯 How to Use

### Basic Workflow
1. **Select Files**
   - Click "📁 Folder" to scan a directory
   - Or "📄 Files" to pick individual files
   - Enable "Recursive" to scan subdirectories

2. **Choose Settings**
   - Use a **Quick Preset** for common tasks
   - Or customize in the **Video/Audio/Tracks** tabs
   - Save your own presets for reuse

3. **Convert**
   - Click "🎬 Start Conversion"
   - Monitor progress in real-time
   - Check the log for details

4. **Find Output**
   - Converted files are in `converted/` subfolder
   - Or same location if "Auto-replace" enabled

### Presets Guide

**📺 TV Shows**
- 720p resolution
- Fast encoding
- CRF 28 (good quality, small size)
- Perfect for: TV series, anime

**🎬 Movies**
- 1080p resolution
- Slow encoding (better compression)
- CRF 23 (excellent quality)
- Perfect for: Movies, high-quality content

**💎 High Quality**
- 1080p resolution
- Slower encoding
- CRF 18 (near-lossless)
- Perfect for: Archiving, masters

**💾 Small Size**
- 720p resolution
- H.265 codec (50% smaller)
- CRF 30
- Perfect for: Storage-limited devices

### Track Selection Modes

**🌍 Keep All Tracks (Default)**
```
No configuration needed
Preserves all audio and subtitle tracks
```

**🌐 Filter by Language**
```
Audio Languages: eng,jpn
Subtitle Languages: eng
✓ Keep first audio if no match

This will:
- Keep English and Japanese audio
- Keep only English subtitles
- Fallback to first audio if no match
```

**✋ Custom Selection**
```
1. Select a file in the list
2. Click "🔍 Analyze Selected File"
3. Check/uncheck specific tracks
4. Perfect for removing commentary
```

## 🌍 Language Codes

| Code | Language | Code | Language |
|------|----------|------|----------|
| eng | English | jpn | Japanese |
| spa | Spanish | kor | Korean |
| fre | French | chi | Chinese |
| ger | German | rus | Russian |
| ita | Italian | ara | Arabic |
| por | Portuguese | hin | Hindi |

## 💡 Common Workflows

### Remove Japanese Audio
```
1. Tracks tab → Filter by Language
2. Audio: eng
3. Subtitles: eng
4. ✓ Keep first audio if no match
```

### Process Anime Folder
```
1. Select folder
2. ✓ Recursive mode
3. Preset → TV Shows
4. Tracks → Language Filter: eng
5. Convert
```

### Remove All Subtitles
```
Tracks → Language Filter
Audio: eng
Subtitles: (leave empty)
```

### Custom Track Removal
```
1. Tracks → Custom Selection
2. Analyze file
3. Uncheck unwanted tracks (commentary, etc.)
4. Convert
```

## 🐛 Troubleshooting

### FFmpeg Not Installing
If auto-install fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Conversion Fails
1. Check the log panel for error details
2. Try simpler settings first
3. Ensure input file is valid (test in VLC)
4. Check disk space

### Slow Conversion
- Use faster preset (medium, fast, veryfast)
- Lower resolution
- Use H.264 instead of H.265

### App Won't Start
```bash
# Clear electron cache
npm cache clean --force
rm -rf node_modules
npm install
```

## 📊 Performance Guide

### Encoding Speed
- **Ultrafast**: 10x realtime (large files)
- **Fast**: 5x realtime (balanced)
- **Medium**: 3x realtime (good quality)
- **Slow**: 1-2x realtime (better compression) ⭐
- **Veryslow**: 0.5-1x realtime (best compression)

### Quality (CRF)
- **0-17**: Nearly lossless (huge files)
- **18-23**: Excellent quality (recommended) ⭐
- **24-28**: Good quality (smaller files)
- **29-35**: Acceptable quality (small files)
- **36+**: Poor quality (avoid)

### File Size Savings
Typical savings with CRF 23-28:
- Remove extra audio tracks: 15-30%
- Remove subtitles: 2-5%
- 1080p → 720p: 40-60%
- H.264 → H.265: 30-50% (slower encoding)

## 🔧 Development

### Project Structure
```
ffmpeg-converter-electron/
├── src/
│   ├── main.js          # Main process
│   ├── preload.js       # Security bridge
│   ├── renderer.js      # UI logic
│   └── index.html       # Interface
├── package.json         # Config & deps
└── README.md           # This file
```

### Tech Stack
- **Electron 28** - Cross-platform framework
- **@ffmpeg-installer/ffmpeg** - Auto FFmpeg
- **fluent-ffmpeg** - FFmpeg wrapper
- **Tailwind CSS** - Modern styling

### Adding Features
Edit the respective files:
- **UI Changes**: `src/index.html`
- **UI Logic**: `src/renderer.js`
- **FFmpeg Operations**: `src/main.js`

## 🆚 Why Electron?

This **complete rewrite** fixes all the issues:

### Old App Problems → Solutions
- ❌ "Unknown error" → ✅ Comprehensive error handling
- ❌ Manual FFmpeg install → ✅ Auto-installation
- ❌ Poor UI → ✅ Modern, beautiful interface
- ❌ Confusing workflow → ✅ Intuitive tabs
- ❌ No track selection → ✅ 3 powerful modes
- ❌ No presets → ✅ Built-in + custom presets

### vs Python App
| Feature | Electron | Python |
|---------|----------|--------|
| **FFmpeg** | Auto-install | Manual install |
| **UI** | Modern web tech | Basic tkinter |
| **Installers** | electron-builder | Manual |
| **Updates** | Auto-updater | Manual |
| **Cross-platform** | ✓ Easy | ✓ Requires testing |

## 📄 License

MIT License - Use freely!

## 🎉 What's New

This is a **complete ground-up rebuild** featuring:

✨ **New Features**
- Auto FFmpeg installation
- Modern gradient UI
- Real-time progress tracking
- Comprehensive logging
- Better error messages
- Preset system
- Custom track selection with FFprobe
- Improved file scanning

🐛 **Bugs Fixed**
- "Unknown error" completely resolved
- Proper async/await handling
- Better IPC communication
- Track mapping actually works
- FFmpeg output properly captured

🎨 **UI/UX Improvements**
- Beautiful gradient design
- Tabbed interface
- Quick-action buttons
- Visual feedback everywhere
- Color-coded logs
- Progress indicators

## 🚀 Get Started

```bash
npm install
npm start
```

That's it! Start converting! 🎬✨
