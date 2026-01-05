const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// Auto-install FFmpeg and FFprobe
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log('FFmpeg path:', ffmpegPath);
console.log('FFprobe path:', ffprobePath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#1e1e1e',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC HANDLERS
// ============================================

// Select folder
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (result.canceled) {
      return { canceled: true };
    }
    
    return { canceled: false, path: result.filePaths[0] };
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
        { 
          name: 'Video Files', 
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm', 'm4v', 'mpg', 'mpeg', 'ts', 'mts'] 
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { canceled: true };
    }
    
    return { canceled: false, files: result.filePaths };
  } catch (error) {
    console.error('Select files error:', error);
    return { error: error.message };
  }
});

// Scan folder for video files
ipcMain.handle('scan-folder', async (event, folderPath, recursive) => {
  try {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg', '.ts', '.mts'];
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
            files.push({
              path: fullPath,
              name: item,
              size: (stat.size / (1024 * 1024)).toFixed(2)
            });
          }
        }
      }
    }
    
    scanDir(folderPath);
    return { success: true, files };
  } catch (error) {
    console.error('Scan folder error:', error);
    return { success: false, error: error.message };
  }
});

// Probe file for track information
ipcMain.handle('probe-file', async (event, filePath) => {
  return new Promise((resolve) => {
    console.log('Probing file:', filePath);
    
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('FFprobe error:', err);
        resolve({ 
          success: false, 
          error: err.message 
        });
        return;
      }
      
      try {
        const audioStreams = [];
        const subtitleStreams = [];
        
        metadata.streams.forEach((stream, index) => {
          if (stream.codec_type === 'audio') {
            audioStreams.push({
              index: stream.index,
              streamIndex: audioStreams.length,
              codec: stream.codec_name || 'unknown',
              language: stream.tags?.language || 'und',
              channels: stream.channels || 2,
              bitrate: stream.bit_rate ? parseInt(stream.bit_rate) : null,
              title: stream.tags?.title || null
            });
          } else if (stream.codec_type === 'subtitle') {
            subtitleStreams.push({
              index: stream.index,
              streamIndex: subtitleStreams.length,
              codec: stream.codec_name || 'unknown',
              language: stream.tags?.language || 'und',
              title: stream.tags?.title || null
            });
          }
        });
        
        console.log('Found tracks:', {
          audio: audioStreams.length,
          subtitle: subtitleStreams.length
        });
        
        resolve({
          success: true,
          audio: audioStreams,
          subtitle: subtitleStreams,
          format: metadata.format
        });
      } catch (parseError) {
        console.error('Parse error:', parseError);
        resolve({ 
          success: false, 
          error: parseError.message 
        });
      }
    });
  });
});

// Convert single file
ipcMain.handle('convert-file', async (event, filePath, settings) => {
  return new Promise((resolve) => {
    console.log('Converting:', filePath);
    console.log('Settings:', JSON.stringify(settings, null, 2));
    
    try {
      const inputDir = path.dirname(filePath);
      const inputName = path.basename(filePath);
      const inputExt = path.extname(inputName);
      const inputBase = path.basename(inputName, inputExt);
      
      // Determine output name
      let outputName;
      if (settings.cleanFilenames) {
        outputName = cleanFileName(inputBase, settings.container);
      } else {
        outputName = `${inputBase}.${settings.container}`;
      }
      
      // Create output directory
      const outputDir = path.join(inputDir, 'converted');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, outputName);
      
      // Start FFmpeg conversion
      let command = ffmpeg(filePath)
        .output(outputPath)
        .videoCodec(settings.codec)
        .outputOptions([
          `-crf ${settings.crf}`,
          `-preset ${settings.preset}`
        ]);
      
      // Resolution
      const width = Math.round(settings.resolution * 16 / 9);
      command.size(`${width}x${settings.resolution}`);
      
      // Track mapping
      if (settings.trackMode === 'all') {
        command.outputOptions(['-map 0']);
      } else if (settings.trackMode === 'language') {
        command.outputOptions(['-map 0:v']);
        
        // Audio by language
        if (settings.audioLanguages && settings.audioLanguages.length > 0) {
          settings.audioLanguages.forEach(lang => {
            command.outputOptions([`-map 0:a:m:language:${lang}?`]);
          });
        }
        
        // Fallback to first audio
        if (settings.keepFirstAudio) {
          command.outputOptions(['-map 0:a:0?']);
        }
        
        // Subtitles by language
        if (settings.subtitleLanguages && settings.subtitleLanguages.length > 0) {
          settings.subtitleLanguages.forEach(lang => {
            command.outputOptions([`-map 0:s:m:language:${lang}?`]);
          });
        }
      } else if (settings.trackMode === 'custom') {
        command.outputOptions(['-map 0:v']);
        
        // Map specific audio tracks
        if (settings.selectedAudioTracks && settings.selectedAudioTracks.length > 0) {
          settings.selectedAudioTracks.forEach(idx => {
            command.outputOptions([`-map 0:${idx}`]);
          });
        } else {
          command.outputOptions(['-map 0:a?']);
        }
        
        // Map specific subtitle tracks
        if (settings.selectedSubtitleTracks && settings.selectedSubtitleTracks.length > 0) {
          settings.selectedSubtitleTracks.forEach(idx => {
            command.outputOptions([`-map 0:${idx}`]);
          });
        }
      }
      
      // Audio codec
      if (settings.audioCodec === 'copy') {
        command.audioCodec('copy');
      } else {
        command.audioCodec(settings.audioCodec).audioBitrate(`${settings.audioBitrate}k`);
      }
      
      // Subtitle codec
      command.outputOptions(['-c:s copy']);
      
      // Format
      command.format(settings.container);
      
      // Progress tracking
      command.on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
        mainWindow.webContents.send('conversion-log', `Starting: ${inputName}`);
      });
      
      command.on('progress', (progress) => {
        mainWindow.webContents.send('conversion-progress', {
          file: inputName,
          percent: progress.percent || 0,
          currentFps: progress.currentFps,
          currentKbps: progress.currentKbps,
          timemark: progress.timemark
        });
      });
      
      command.on('end', () => {
        console.log('Conversion complete:', outputPath);
        
        try {
          const inputStats = fs.statSync(filePath);
          const outputStats = fs.statSync(outputPath);
          
          const inputSize = inputStats.size / (1024 * 1024);
          const outputSize = outputStats.size / (1024 * 1024);
          const saved = inputSize - outputSize;
          const percent = (saved / inputSize * 100);
          
          // Auto-replace if enabled
          if (settings.autoReplace) {
            try {
              fs.unlinkSync(filePath);
              const finalPath = path.join(inputDir, outputName);
              fs.renameSync(outputPath, finalPath);
              
              // Remove converted folder if empty
              const convertedFiles = fs.readdirSync(outputDir);
              if (convertedFiles.length === 0) {
                fs.rmdirSync(outputDir);
              }
              
              mainWindow.webContents.send('conversion-log', `Replaced original file`);
            } catch (replaceError) {
              console.error('Replace error:', replaceError);
            }
          }
          
          resolve({
            success: true,
            inputSize: inputSize.toFixed(2),
            outputSize: outputSize.toFixed(2),
            saved: saved.toFixed(2),
            percent: percent.toFixed(1),
            outputPath
          });
        } catch (statError) {
          console.error('Stat error:', statError);
          resolve({
            success: true,
            outputPath
          });
        }
      });
      
      command.on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err);
        console.error('FFmpeg stderr:', stderr);
        
        mainWindow.webContents.send('conversion-log', `Error: ${err.message}`);
        
        resolve({
          success: false,
          error: err.message
        });
      });
      
      // Run the command
      command.run();
      
    } catch (error) {
      console.error('Setup error:', error);
      resolve({
        success: false,
        error: error.message
      });
    }
  });
});

// Clean filename function
function cleanFileName(name, extension) {
  // Remove brackets
  name = name.replace(/\[.*?\]/g, '');
  
  // Remove quality tags but keep year
  name = name.replace(/\((?:19|20)\d{2}\)/g, (match) => match); // Keep years
  name = name.replace(/\([^)]*(?:1080p|720p|480p|WEB|BluRay|BRRip)[^)]*\)/gi, '');
  
  // Remove common tags
  const patterns = [
    /\.?(?:BluRay|BRRip|WEBRip|WEB-DL|HDTV|DVDRip|HDRip)\.?/gi,
    /\.?(?:1080p|720p|480p|2160p|4K)\.?/gi,
    /\.?(?:x264|x265|H\.?264|H\.?265|HEVC|XviD)\.?/gi,
    /\.?(?:AAC|AC3|DTS|MP3|FLAC)\.?/gi,
  ];
  
  patterns.forEach(pattern => {
    name = name.replace(pattern, ' ');
  });
  
  // Clean up
  name = name.replace(/'/g, '');
  name = name.replace(/[._-]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/\s*-\s*$/g, '');
  
  return `${name}.${extension}`;
}

// Check FFmpeg installation
ipcMain.handle('check-ffmpeg', async () => {
  try {
    return {
      success: true,
      ffmpegPath,
      ffprobePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Show error dialog
ipcMain.handle('show-error', async (event, message) => {
  dialog.showErrorBox('Error', message);
});

// Show info dialog
ipcMain.handle('show-info', async (event, title, message) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title,
    message,
    buttons: ['OK']
  });
});

console.log('Main process ready');
