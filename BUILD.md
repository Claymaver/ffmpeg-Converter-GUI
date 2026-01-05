# 🔨 Build Guide

Complete guide to building FFmpeg Converter Pro installers.

## 📋 Prerequisites

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

### Platform-Specific Requirements

**Windows:**
- Nothing extra needed!

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential

# Fedora/RHEL
sudo dnf install gcc-c++ make
```

## 🚀 Quick Build

```bash
# 1. Install dependencies
npm install

# 2. Build for your platform
npm run dist-win     # Windows
npm run dist-mac     # macOS
npm run dist-linux   # Linux
```

Output will be in `dist/` folder.

## 📦 Available Build Commands

### Development
```bash
npm start           # Run app in development mode
npm run dev         # Same as start
npm run pack        # Package without creating installer (fast test)
```

### Production Builds
```bash
npm run dist        # Build for current platform
npm run dist-win    # Build Windows installer
npm run dist-mac    # Build macOS installer
npm run dist-linux  # Build Linux installer
```

### Aliases (same as above)
```bash
npm run build       # Same as dist
npm run build:win   # Same as dist-win
npm run build:mac   # Same as dist-mac
npm run build:linux # Same as dist-linux
```

## 🎯 Build Outputs

### Windows
- **NSIS Installer** - `FFmpeg-Converter-Pro-2.0.0.exe` (recommended)
- **Portable** - `FFmpeg-Converter-Pro-2.0.0-portable.exe`
- Both x64 and x86 (32-bit) versions

### macOS
- **DMG** - `FFmpeg-Converter-Pro-2.0.0.dmg` (recommended)
- **ZIP** - `FFmpeg-Converter-Pro-2.0.0-mac.zip`
- Universal build (Intel + Apple Silicon)

### Linux
- **AppImage** - `FFmpeg-Converter-Pro-2.0.0.AppImage` (recommended, runs anywhere)
- **DEB** - `FFmpeg-Converter-Pro-2.0.0.deb` (Ubuntu/Debian)
- **RPM** - `FFmpeg-Converter-Pro-2.0.0.rpm` (Fedora/RHEL)

## 🔧 Build Configuration

Located in `package.json` under `"build"` section.

### Key Settings

```json
{
  "appId": "com.ffmpegconverter.app",
  "productName": "FFmpeg Converter Pro",
  "directories": {
    "output": "dist",
    "buildResources": "assets"
  }
}
```

### Customization

**Change App Name:**
```json
"productName": "Your App Name"
```

**Change Output Directory:**
```json
"directories": {
  "output": "build"
}
```

**Change App ID:**
```json
"appId": "com.yourcompany.yourapp"
```

## 🖼️ Icons

Place icons in `assets/` folder:

```
assets/
├── icon.png   # Linux (512x512 PNG)
├── icon.ico   # Windows (256x256 ICO)
└── icon.icns  # macOS (512x512 ICNS)
```

### Creating Icons

**From a single PNG:**
```bash
# Install tool
npm install -g electron-icon-maker

# Generate all formats
electron-icon-maker --input=icon.png --output=./assets
```

**Online tools:**
- https://iconverticons.com/online/
- https://convertico.com/
- https://cloudconvert.com/

## 🐛 Troubleshooting

### Build Fails on Windows

**Error: "Cannot find module 'electron'"**
```bash
# Clear and reinstall
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Error: "EPERM: operation not permitted"**
```bash
# Run as administrator
npm run dist-win
```

**Error: "FFmpeg not found"**
```bash
# Reinstall FFmpeg binaries
npm uninstall @ffmpeg-installer/ffmpeg
npm install @ffmpeg-installer/ffmpeg
```

### Build Fails on macOS

**Error: "codesign failed"**
```bash
# Build without code signing (development)
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist-mac
```

**Error: "Command failed: xcrun"**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

### Build Fails on Linux

**Error: "Cannot create symlinks"**
```bash
# Install required packages
sudo apt-get install -y icnsutils graphicsmagick
npm run dist-linux
```

**Error: "ENOSPC: System limit for number of file watchers reached"**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### General Issues

**Build is very slow:**
```bash
# Build without compression (faster, larger file)
npm run pack  # Just package, no installer
```

**FFmpeg missing in built app:**
```bash
# Check extraResources in package.json
# Ensure FFmpeg is bundled:
npm install --save @ffmpeg-installer/ffmpeg
```

**"Unknown platform" error:**
```bash
# Build for specific platform explicitly
electron-builder --win --x64
electron-builder --mac --x64
electron-builder --linux --x64
```

## 📊 Build Sizes

Approximate installer sizes:

- **Windows**: 80-120 MB (includes FFmpeg ~70MB)
- **macOS**: 90-130 MB (Universal binary)
- **Linux**: 85-125 MB (AppImage includes everything)

### Reducing Size

**Option 1: Remove unused packages**
```bash
npm uninstall <unused-package>
```

**Option 2: Use asar compression**
```json
"asar": true
```

**Option 3: Exclude unnecessary files**
```json
"files": [
  "src/**/*",
  "!**/*.md",
  "!**/test/**"
]
```

## 🚢 Releasing

### Manual Release

1. **Update version:**
   ```bash
   npm version patch  # 2.0.0 -> 2.0.1
   npm version minor  # 2.0.0 -> 2.1.0
   npm version major  # 2.0.0 -> 3.0.0
   ```

2. **Build:**
   ```bash
   npm run dist-win
   npm run dist-mac
   npm run dist-linux
   ```

3. **Upload to GitHub:**
   - Create a new release
   - Upload files from `dist/`
   - Write release notes

### Automated Release (GitHub Actions)

**Setup:**

1. **Tag and push:**
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```

2. **GitHub Actions builds automatically:**
   - Windows, Mac, and Linux installers
   - Creates GitHub release
   - Uploads all installers

**Configure publish settings:**
```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME",
    "repo": "ffmpeg-Converter-GUI"
  }
]
```

## 🔐 Code Signing

### Windows (Optional)

```bash
# Set certificate
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password

npm run dist-win
```

### macOS (Optional)

```bash
# Set Apple ID
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password

npm run dist-mac
```

### Linux (No signing needed)

Linux builds don't require code signing.

## 📝 Build Checklist

Before building for release:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test app with `npm start`
- [ ] Icons are in `assets/` folder
- [ ] Run `npm install` to ensure dependencies are fresh
- [ ] Build for target platform(s)
- [ ] Test installer on clean machine
- [ ] Create GitHub release
- [ ] Upload installers
- [ ] Update documentation

## 🎯 Platform-Specific Notes

### Windows
- Creates NSIS installer (recommended for distribution)
- Also creates portable .exe (no installation needed)
- Builds both 64-bit and 32-bit by default

### macOS
- Creates .dmg with drag-to-Applications
- Also creates .zip for command-line distribution
- Universal binary (Intel + M1/M2/M3) by default
- Code signing recommended for distribution

### Linux
- AppImage is recommended (runs on any distro)
- DEB for Debian/Ubuntu users
- RPM for Fedora/RHEL users
- All are standalone, include FFmpeg

## 🆘 Getting Help

**Build issues?**
1. Check `npm run` output for errors
2. Look in `dist/builder-debug.yml` for details
3. Read electron-builder logs
4. Check [electron-builder docs](https://www.electron.build/)

**FFmpeg issues?**
1. Check if FFmpeg downloaded: `node_modules/@ffmpeg-installer/`
2. Verify path: `node -e "console.log(require('@ffmpeg-installer/ffmpeg').path)"`
3. Reinstall: `npm install @ffmpeg-installer/ffmpeg --force`

**Still stuck?**
- Open an issue on GitHub
- Include full error output
- Mention OS and Node version

## ✅ Success!

Your installer should now be in `dist/` folder!

Test it on a clean machine to ensure:
- [ ] Installs without errors
- [ ] FFmpeg works (convert a file)
- [ ] All features functional
- [ ] Icons display correctly
- [ ] App starts quickly

Happy building! 🎉
