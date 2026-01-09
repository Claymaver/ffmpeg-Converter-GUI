const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync, exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

let mainWindow;
let isConverting = false;
let ffmpegPath = null;
let ffprobePath = null;
let currentFileProgress = null;

// Find FFmpeg in system
function findSystemFFmpeg() {
  const possiblePaths = [];
  
  if (process.platform === 'win32') {
    possiblePaths.push(
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'ffmpeg', 'bin', 'ffmpeg.exe')
    );
  } else if (process.platform === 'darwin') {
    possiblePaths.push(
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      '/usr/bin/ffmpeg'
    );
  } else {
    possiblePaths.push(
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/snap/bin/ffmpeg'
    );
  }

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  try {
    const command = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const result = execSync(command, { encoding: 'utf8' }).trim();
    if (result && fs.existsSync(result.split('\n')[0])) {
      return result.split('\n')[0];
    }
  } catch (error) {
    // Command failed
  }

  return null;
}

function findSystemFFprobe() {
  const possiblePaths = [];
  
  if (process.platform === 'win32') {
    possiblePaths.push(
      'C:\\ffmpeg\\bin\\ffprobe.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffprobe.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'ffmpeg', 'bin', 'ffprobe.exe')
    );
  } else if (process.platform === 'darwin') {
    possiblePaths.push(
      '/usr/local/bin/ffprobe',
      '/opt/homebrew/bin/ffprobe',
      '/usr/bin/ffprobe'
    );
  } else {
    possiblePaths.push(
      '/usr/bin/ffprobe',
      '/usr/local/bin/ffprobe',
      '/snap/bin/ffprobe'
    );
  }

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  try {
    const command = process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe';
    const result = execSync(command, { encoding: 'utf8' }).trim();
    if (result && fs.existsSync(result.split('\n')[0])) {
      return result.split('\n')[0];
    }
  } catch (error) {
    // Command failed
  }

  return null;
}

function initializeFFmpeg() {
  ffmpegPath = findSystemFFmpeg();
  ffprobePath = findSystemFFprobe();

  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('✓ Found FFmpeg:', ffmpegPath);
  } else {
    console.log('✗ FFmpeg not found on system');
  }

  if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('✓ Found FFprobe:', ffprobePath);
  } else {
    console.log('✗ FFprobe not found on system');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1400,
    minHeight: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#121212',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initializeFFmpeg();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================
// IPC HANDLERS
// ============================================

// Install FFmpeg
ipcMain.handle('install-ffmpeg', async () => {
  const platform = process.platform;
  let instructions = '';
  let canAutoInstall = false;

  if (platform === 'win32') {
    // Check if winget is available
    try {
      execSync('winget --version', { encoding: 'utf8' });
      canAutoInstall = true;
    } catch (error) {
      canAutoInstall = false;
    }

    if (canAutoInstall) {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Install FFmpeg',
        message: 'Would you like to install FFmpeg automatically using winget?',
        detail: 'This will install FFmpeg to your system using Windows Package Manager.',
        buttons: ['Install Automatically', 'Manual Instructions', 'Cancel'],
        defaultId: 0
      });

      if (result.response === 0) {
        // Auto install with winget
        try {
          mainWindow.webContents.send('conversion-log', 'Installing FFmpeg via winget...');
          
          // Run in new cmd window so user can see progress
          const installCmd = 'start cmd /k "winget install ffmpeg && echo. && echo FFmpeg installed successfully! && echo Please restart the app. && pause"';
          exec(installCmd);
          
          return { 
            success: true, 
            message: 'Installation started in new window. Please restart the app when complete.' 
          };
        } catch (error) {
          return { error: `Installation failed: ${error.message}` };
        }
      } else if (result.response === 1) {
        // Show manual instructions
        instructions = 'Windows Manual Installation:\n\n' +
          '1. Download FFmpeg from:\n' +
          '   https://www.gyan.dev/ffmpeg/builds/\n\n' +
          '2. Extract to C:\\ffmpeg\n\n' +
          '3. Add C:\\ffmpeg\\bin to System PATH:\n' +
          '   - Right-click "This PC" → Properties\n' +
          '   - Advanced system settings → Environment Variables\n' +
          '   - Under System Variables, find "Path"\n' +
          '   - Click Edit → New → Add: C:\\ffmpeg\\bin\n' +
          '   - Click OK on all dialogs\n\n' +
          '4. Restart this app';
        
        await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Manual Installation Instructions',
          message: instructions,
          buttons: ['Open Download Page', 'Close']
        }).then(result => {
          if (result.response === 0) {
            shell.openExternal('https://www.gyan.dev/ffmpeg/builds/');
          }
        });
        
        return { success: true, manual: true };
      } else {
        return { canceled: true };
      }
    } else {
      // No winget, show manual instructions
      instructions = 'Windows Installation:\n\n' +
        'Option 1 - Install winget (recommended):\n' +
        '1. Install from Microsoft Store: "App Installer"\n' +
        '2. Restart this app and try again\n\n' +
        'Option 2 - Manual:\n' +
        '1. Download from: https://www.gyan.dev/ffmpeg/builds/\n' +
        '2. Extract to C:\\ffmpeg\n' +
        '3. Add C:\\ffmpeg\\bin to System PATH\n' +
        '4. Restart this app';
      
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Install FFmpeg',
        message: instructions,
        buttons: ['Open Download Page', 'Close']
      });
      
      if (result.response === 0) {
        shell.openExternal('https://www.gyan.dev/ffmpeg/builds/');
      }
      
      return { success: true, manual: true };
    }
  } else if (platform === 'darwin') {
    // macOS - check for Homebrew
    let hasHomebrew = false;
    try {
      execSync('brew --version', { encoding: 'utf8' });
      hasHomebrew = true;
    } catch (error) {
      hasHomebrew = false;
    }

    if (hasHomebrew) {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Install FFmpeg',
        message: 'Would you like to install FFmpeg using Homebrew?',
        detail: 'This will run: brew install ffmpeg',
        buttons: ['Install', 'Cancel'],
        defaultId: 0
      });

      if (result.response === 0) {
        try {
          mainWindow.webContents.send('conversion-log', 'Installing FFmpeg via Homebrew...');
          
          // Open terminal and run brew install
          const installCmd = 'osascript -e \'tell app "Terminal" to do script "brew install ffmpeg && echo && echo FFmpeg installed! && echo Please restart the app. && read -p \\"Press Enter to close...\\""\'';
          exec(installCmd);
          
          return { 
            success: true, 
            message: 'Installation started in Terminal. Please restart the app when complete.' 
          };
        } catch (error) {
          return { error: `Installation failed: ${error.message}` };
        }
      }
      return { canceled: true };
    } else {
      instructions = 'macOS Installation:\n\n' +
        '1. Install Homebrew first:\n' +
        '   Open Terminal and run:\n' +
        '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n\n' +
        '2. Then install FFmpeg:\n' +
        '   brew install ffmpeg\n\n' +
        '3. Restart this app';
      
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Install FFmpeg',
        message: instructions,
        buttons: ['Open Homebrew Website', 'Close']
      });
      
      if (result.response === 0) {
        shell.openExternal('https://brew.sh');
      }
      
      return { success: true, manual: true };
    }
  } else {
    // Linux
    instructions = 'Linux Installation:\n\n' +
      'Ubuntu/Debian:\n' +
      'sudo apt update && sudo apt install ffmpeg\n\n' +
      'Fedora:\n' +
      'sudo dnf install ffmpeg\n\n' +
      'Arch:\n' +
      'sudo pacman -S ffmpeg\n\n' +
      'After installation, restart this app.';
    
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Install FFmpeg',
      message: instructions,
      buttons: ['OK']
    });
    
    return { success: true, manual: true };
  }
});

// Select folder
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result.canceled ? { canceled: true } : { canceled: false, path: result.filePaths[0] };
  } catch (error) {
    console.error('Select folder error:', error);
    return { error: error.message };
  }
});

// Select files
ipcMain.handle('select-files', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm', 'm4v', 'mpg', 'mpeg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { canceled: true };
    }
    
    const filesWithSizes = result.filePaths.map(filePath => {
      try {
        const stat = fs.statSync(filePath);
        return { path: filePath, size: stat.size };
      } catch (error) {
        return { path: filePath, size: 0 };
      }
    });
    
    return { canceled: false, files: filesWithSizes };
  } catch (error) {
    console.error('Select files error:', error);
    return { error: error.message };
  }
});

// Scan folder for videos
ipcMain.handle('scan-folder', async (event, folderPath, recursive) => {
  try {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg'];
    const files = [];

    function scanDir(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && recursive) {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (videoExtensions.includes(ext)) {
            files.push({ path: fullPath, size: stat.size });
          }
        }
      }
    }

    scanDir(folderPath);
    return { files };
  } catch (error) {
    console.error('Scan folder error:', error);
    return { error: error.message };
  }
});

// Check FFmpeg
ipcMain.handle('check-ffmpeg', async () => {
  // Re-scan in case FFmpeg was just installed
  initializeFFmpeg();
  
  return {
    ffmpegPath,
    ffprobePath,
    available: ffmpegPath && ffprobePath && fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)
  };
});

// Set custom FFmpeg path
ipcMain.handle('set-ffmpeg-path', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Select FFmpeg Executable',
      filters: [
        { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths[0]) {
      ffmpegPath = result.filePaths[0];
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      // Try to find ffprobe in same directory
      const dir = path.dirname(ffmpegPath);
      const probeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
      const probePath = path.join(dir, probeName);
      
      if (fs.existsSync(probePath)) {
        ffprobePath = probePath;
        ffmpeg.setFfprobePath(ffprobePath);
      }
      
      return {
        success: true,
        ffmpegPath,
        ffprobePath
      };
    }
    
    return { canceled: true };
  } catch (error) {
    return { error: error.message };
  }
});

// Probe file for track info
ipcMain.handle('probe-file', async (event, filePath) => {
  if (!ffprobePath) {
    return { error: 'FFprobe not available' };
  }

  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        resolve({ error: err.message });
      } else {
        resolve({ metadata });
      }
    });
  });
});

// Convert file
ipcMain.handle('convert-file', async (event, filePath, settings) => {
  if (!ffmpegPath) {
    return { error: 'FFmpeg not available. Please install FFmpeg.' };
  }

  if (isConverting) {
    return { error: 'Conversion already in progress' };
  }

  return new Promise((resolve) => {
    isConverting = true;
    currentFileProgress = 0;
    
    try {
      const inputDir = path.dirname(filePath);
      const inputName = path.basename(filePath, path.extname(filePath));
      const outputDir = settings.outputToSubfolder 
        ? path.join(inputDir, 'converted')
        : inputDir;
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let outputName = inputName;
      if (settings.cleanFilenames) {
        outputName = outputName
          .replace(/\[.*?\]/g, '')
          .replace(/\(.*?\)/g, '')
          .replace(/\d{3,4}p/gi, '')
          .replace(/[hx]\.?26[45]/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const outputPath = path.join(outputDir, `${outputName}.${settings.container}`);

      let command = ffmpeg(filePath);

      // Video codec
      if (settings.videoCodec === 'copy') {
        command = command.videoCodec('copy');
      } else {
        command = command
          .videoCodec(settings.videoCodec)
          .addOption('-crf', settings.crf)
          .addOption('-preset', settings.preset);

        if (settings.resolution && settings.resolution !== 'original') {
          command = command.size(`?x${settings.resolution}`);
        }
      }

      // Audio codec
      if (settings.audioCodec === 'copy') {
        command = command.audioCodec('copy');
      } else {
        command = command
          .audioCodec(settings.audioCodec)
          .audioBitrate(settings.audioBitrate);
      }

      // Copy ALL streams
      command = command.addOption('-map', '0');
      command = command.addOption('-c:s', 'copy');
      command = command.addOption('-map_metadata', '0');
      command = command.addOption('-map_chapters', '0');

      // Execute conversion
      command
        .on('start', (commandLine) => {
          mainWindow.webContents.send('conversion-log', `Starting: ${path.basename(filePath)}`);
        })
        .on('progress', (progress) => {
          currentFileProgress = progress.percent || 0;
          mainWindow.webContents.send('conversion-progress', {
            percent: currentFileProgress,
            currentFps: progress.currentFps,
            currentKbps: progress.currentKbps,
            timemark: progress.timemark
          });
        })
        .on('end', () => {
          mainWindow.webContents.send('conversion-log', `✓ Completed: ${path.basename(outputPath)}`);
          
          let outputSize = 0;
          try {
            const outputStats = fs.statSync(outputPath);
            outputSize = outputStats.size;
          } catch (err) {
            // Ignore
          }
          
          if (settings.replaceOriginal) {
            try {
              fs.unlinkSync(filePath);
              const newPath = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.${settings.container}`);
              fs.renameSync(outputPath, newPath);
              mainWindow.webContents.send('conversion-log', '✓ Replaced original file');
            } catch (err) {
              mainWindow.webContents.send('conversion-log', `⚠ Could not replace original: ${err.message}`);
            }
          }
          
          isConverting = false;
          currentFileProgress = null;
          resolve({ success: true, outputPath, outputSize });
        })
        .on('error', (err) => {
          mainWindow.webContents.send('conversion-log', `✗ Error: ${err.message}`);
          isConverting = false;
          currentFileProgress = null;
          resolve({ error: err.message });
        })
        .save(outputPath);

    } catch (error) {
      isConverting = false;
      currentFileProgress = null;
      resolve({ error: error.message });
    }
  });
});

// Show error dialog
ipcMain.handle('show-error', async (event, message) => {
  await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Error',
    message: message
  });
});

// Show info dialog
ipcMain.handle('show-info', async (event, title, message) => {
  await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: title,
    message: message
  });
});
