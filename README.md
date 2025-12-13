# FFmpeg Video Converter (GUI)

A simple desktop app for converting videos using FFmpeg. No command line needed — just point, click, and convert.

---

## Features

- Works on Windows, macOS, and Linux  
- Built with Electron  
- Uses FFmpeg under the hood  
- Easy video conversion without touching the terminal  

---

## What you need

Make sure you have Node.js (v18 or newer), npm (comes with Node), and FFmpeg installed and available on your PATH. If you don’t have FFmpeg yet, grab it from [ffmpeg.org](https://www.ffmpeg.org/).

---

## Running from source

To run the app from source, first clone the repo with `git clone https://github.com/Claymaver/ffmpeg-Converter-GUI.git` and `cd` into the project folder. Then install the dependencies with `npm install` and start the app by running `npm start`. The app should pop up and be ready to use.

---

## Building for distribution

We use **electron-builder**, so you can make installers for your platform. On Windows, you can run `npm run dist-win` to generate `.exe` and `.nsis` installers in the `dist/` folder. On macOS, `npm run dist-mac` will create a `.dmg` installer, and on Linux, `npm run dist-linux` will make `.AppImage` and `.deb` packages. Everything will end up in the `dist/` folder.

---

## Notes

FFmpeg must be on your PATH, or the app won’t be able to find it. macOS builds aren’t signed by default, so you might see a security warning the first time you open it.

---

## About

Made by **Clay MacDonald**. Built with Electron + FFmpeg for quick, easy video conversions.

---

## Contributing

Pull requests, issues, or suggestions are welcome. Just fork the repo, make your changes, and open a PR, or open an issue if you notice a bug or have an idea.

---

## License

Check the LICENSE file (if one is included).
