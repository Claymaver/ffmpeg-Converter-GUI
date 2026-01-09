// State
let files = [];
let converting = false;
let currentFileIndex = 0;
let successCount = 0;
let failCount = 0;
let totalSpaceSaved = 0;
let customPresets = loadPresets();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeButtons();
  initializeSettings();
  initializePresets();
  updateCustomPresetList();
  checkFFmpeg();
  log('Application ready', 'info');
  
  // Set up conversion progress listener
  window.electronAPI.onConversionProgress((data) => {
    if (currentFileIndex >= 0 && currentFileIndex < files.length) {
      const progress = Math.round(data.percent || 0);
      files[currentFileIndex].progress = progress;
      updateFileItem(currentFileIndex);
      
      // Log progress every 10%
      if (progress % 10 === 0 && progress > 0) {
        console.log(`File ${currentFileIndex + 1} progress: ${progress}%`);
      }
    }
  });
  
  // Set up log listener
  window.electronAPI.onConversionLog((message) => {
    // Don't log the "Starting:" message as it's too verbose
    if (!message.startsWith('Starting:')) {
      log(message, 'info');
    }
  });
});

// Load presets from localStorage
function loadPresets() {
  try {
    const saved = localStorage.getItem('customPresets');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

// Save presets to localStorage
function savePresets() {
  try {
    localStorage.setItem('customPresets', JSON.stringify(customPresets));
  } catch (error) {
    log('Failed to save presets', 'error');
  }
}

// Update custom preset list
function updateCustomPresetList() {
  const container = document.getElementById('custom-preset-list');
  if (customPresets.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">No custom presets</div>';
    return;
  }
  
  container.innerHTML = '';
  customPresets.forEach((preset, index) => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 p-2 bg-gray-900 rounded';
    div.innerHTML = `
      <button class="flex-1 text-left text-sm" onclick="applyCustomPreset(${index})">
        ${preset.name}
      </button>
      <button onclick="deletePreset(${index})" class="text-red-400 hover:text-red-300 text-xs px-2">
        ✕
      </button>
    `;
    container.appendChild(div);
  });
}

// Apply custom preset
function applyCustomPreset(index) {
  const preset = customPresets[index];
  if (preset) {
    applyPreset(preset.settings);
    log(`Applied preset: ${preset.name}`, 'info');
  }
}

// Delete preset
function deletePreset(index) {
  if (confirm(`Delete preset "${customPresets[index].name}"?`)) {
    customPresets.splice(index, 1);
    savePresets();
    updateCustomPresetList();
    log('Preset deleted', 'info');
  }
}

// Save new preset
function saveNewPreset() {
  const name = document.getElementById('preset-name').value.trim();
  if (!name) {
    log('Please enter a preset name', 'warn');
    return;
  }
  
  const settings = getCurrentSettings();
  customPresets.push({ name, settings });
  savePresets();
  updateCustomPresetList();
  document.getElementById('preset-name').value = '';
  log(`Saved preset: ${name}`, 'success');
}

// Get current settings
function getCurrentSettings() {
  return {
    container: document.getElementById('container').value,
    videoCodec: document.getElementById('videoCodec').value,
    audioCodec: document.getElementById('audioCodec').value,
    resolution: document.getElementById('resolution').value,
    crf: document.getElementById('crf').value,
    preset: document.getElementById('preset').value,
    audioBitrate: document.getElementById('audio-bitrate').value,
    outputToSubfolder: document.getElementById('output-subfolder').checked,
    cleanFilenames: document.getElementById('clean-filenames').checked,
    replaceOriginal: document.getElementById('replace-original').checked
  };
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tab switching
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      contents.forEach(c => c.classList.remove('active'));
      const activeContent = document.getElementById(`tab-${tabName}`);
      if (activeContent) {
        activeContent.classList.add('active');
      }
    });
  });
}

// Check FFmpeg availability
async function checkFFmpeg() {
  const result = await window.electronAPI.checkFFmpeg();
  const statusEl = document.getElementById('ffmpeg-status');
  
  if (result.available) {
    statusEl.innerHTML = `
      <div class="text-green-400">✓ FFmpeg Available</div>
      <div class="text-xs text-gray-500 mt-1">${result.ffmpegPath}</div>
    `;
    log('✓ FFmpeg detected', 'success');
  } else {
    statusEl.innerHTML = `
      <div class="text-yellow-400">⚠ FFmpeg Not Found</div>
      <div class="text-xs text-gray-400 mt-1">Click "Install FFmpeg" button to install</div>
    `;
    log('⚠ FFmpeg not found', 'warn');
  }
}

// Install FFmpeg
async function installFFmpeg() {
  log('Starting FFmpeg installation...', 'info');
  const result = await window.electronAPI.installFFmpeg();
  
  if (result.error) {
    log(`Installation error: ${result.error}`, 'error');
  } else if (result.canceled) {
    log('Installation canceled', 'warn');
  } else if (result.message) {
    log(result.message, 'success');
  } else {
    log('Please follow the installation instructions', 'info');
  }
  
  // Re-check FFmpeg after installation attempt
  setTimeout(checkFFmpeg, 2000);
}

// Set custom FFmpeg path
async function setFFmpegPath() {
  const result = await window.electronAPI.setFFmpegPath();
  
  if (result.success) {
    log(`FFmpeg path set: ${result.ffmpegPath}`, 'success');
    checkFFmpeg();
  } else if (result.error) {
    log(`Error: ${result.error}`, 'error');
  }
}

// Button event listeners
function initializeButtons() {
  document.getElementById('folder-btn').addEventListener('click', selectFolder);
  document.getElementById('files-btn').addEventListener('click', selectFiles);
  document.getElementById('clear-btn').addEventListener('click', clearFiles);
  document.getElementById('convert-btn').addEventListener('click', startConversion);
  document.getElementById('clear-log-btn').addEventListener('click', clearLog);
  document.getElementById('save-preset').addEventListener('click', saveNewPreset);
  document.getElementById('install-ffmpeg-btn').addEventListener('click', installFFmpeg);
  document.getElementById('set-ffmpeg-path-btn').addEventListener('click', setFFmpegPath);
}

// Settings event listeners
function initializeSettings() {
  document.getElementById('crf').addEventListener('input', (e) => {
    document.getElementById('crf-value').textContent = e.target.value;
  });
}

// Preset system
function initializePresets() {
  const presets = {
    tv: { resolution: '720', crf: '28', preset: 'fast', videoCodec: 'libx264', audioCodec: 'aac', container: 'mkv', audioBitrate: '192k' },
    movie: { resolution: '1080', crf: '23', preset: 'slow', videoCodec: 'libx264', audioCodec: 'aac', container: 'mkv', audioBitrate: '192k' },
    quality: { resolution: '1080', crf: '18', preset: 'slower', videoCodec: 'libx264', audioCodec: 'aac', container: 'mkv', audioBitrate: '256k' },
    small: { resolution: '720', crf: '30', preset: 'fast', videoCodec: 'libx265', audioCodec: 'aac', container: 'mp4', audioBitrate: '128k' }
  };
  
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = presets[btn.dataset.preset];
      applyPreset(preset);
      log(`Applied ${btn.querySelector('.font-bold').textContent} preset`, 'info');
    });
  });
}

function applyPreset(preset) {
  Object.keys(preset).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      element.value = preset[key];
      if (key === 'crf') {
        document.getElementById('crf-value').textContent = preset[key];
      }
    }
  });
}

// Select folder
async function selectFolder() {
  const result = await window.electronAPI.selectFolder();
  if (!result.canceled && result.path) {
    const recursive = confirm('Scan subfolders recursively?');
    const scanResult = await window.electronAPI.scanFolder(result.path, recursive);
    
    if (scanResult.error) {
      log(`Error scanning folder: ${scanResult.error}`, 'error');
    } else if (scanResult.files.length === 0) {
      log('No video files found in folder', 'warn');
    } else {
      files = scanResult.files.map(file => ({ 
        path: file.path, 
        status: 'pending', 
        originalSize: file.size, 
        newSize: 0,
        progress: 0
      }));
      updateFileList();
      log(`Found ${files.length} video files`, 'success');
    }
  }
}

// Select files
async function selectFiles() {
  const result = await window.electronAPI.selectFiles();
  if (!result.canceled && result.files) {
    files = result.files.map(file => ({ 
      path: file.path, 
      status: 'pending', 
      originalSize: file.size, 
      newSize: 0,
      progress: 0
    }));
    updateFileList();
    log(`Added ${files.length} files`, 'success');
  }
}

// Clear files
function clearFiles() {
  if (converting) {
    log('Cannot clear files during conversion', 'warn');
    return;
  }
  files = [];
  successCount = 0;
  failCount = 0;
  totalSpaceSaved = 0;
  updateFileList();
  updateStats();
  log('Cleared file list', 'info');
}

// Update file list UI
function updateFileList() {
  const container = document.getElementById('file-list');
  const emptyState = document.getElementById('empty-state');
  
  if (files.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = '';
  
  files.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.id = `file-${index}`;
    
    const filename = file.path.split(/[\\/]/).pop();
    const originalSize = formatBytes(file.originalSize);
    const newSize = file.newSize > 0 ? formatBytes(file.newSize) : '-';
    const saved = file.newSize > 0 && file.originalSize > file.newSize 
      ? formatBytes(file.originalSize - file.newSize)
      : '-';
    
    let statusBadge = '';
    switch (file.status) {
      case 'pending':
        statusBadge = '<span class="status-badge status-pending">Pending</span>';
        break;
      case 'processing':
        statusBadge = '<span class="status-badge status-processing">Processing</span>';
        break;
      case 'success':
        statusBadge = '<span class="status-badge status-success">Complete</span>';
        break;
      case 'error':
        statusBadge = '<span class="status-badge status-error">Failed</span>';
        break;
    }
    
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex-1">
          <div class="font-semibold text-sm">${filename}</div>
          <div class="text-xs text-gray-400">Original: ${originalSize} → New: ${newSize} | Saved: ${saved}</div>
        </div>
        <div class="flex items-center gap-3">
          ${file.status === 'processing' ? `<span class="text-blue-400 font-bold text-sm">${Math.round(file.progress || 0)}%</span>` : ''}
          ${statusBadge}
        </div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${Math.round(file.progress || 0)}%"></div>
      </div>
    `;
    
    container.appendChild(div);
  });
  
  updateStats();
}

// Update single file item
function updateFileItem(index) {
  const file = files[index];
  const div = document.getElementById(`file-${index}`);
  if (!div) return;
  
  const filename = file.path.split(/[\\/]/).pop();
  const originalSize = formatBytes(file.originalSize);
  const newSize = file.newSize > 0 ? formatBytes(file.newSize) : '-';
  const saved = file.newSize > 0 && file.originalSize > file.newSize 
    ? formatBytes(file.originalSize - file.newSize)
    : '-';
  
  let statusBadge = '';
  switch (file.status) {
    case 'pending':
      statusBadge = '<span class="status-badge status-pending">Pending</span>';
      break;
    case 'processing':
      statusBadge = '<span class="status-badge status-processing">Processing</span>';
      break;
    case 'success':
      statusBadge = '<span class="status-badge status-success">Complete</span>';
      break;
    case 'error':
      statusBadge = '<span class="status-badge status-error">Failed</span>';
      break;
  }
  
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="font-semibold text-sm">${filename}</div>
        <div class="text-xs text-gray-400">Original: ${originalSize} → New: ${newSize} | Saved: ${saved}</div>
      </div>
      <div class="flex items-center gap-3">
        ${file.status === 'processing' ? `<span class="text-blue-400 font-bold text-sm">${Math.round(file.progress || 0)}%</span>` : ''}
        ${statusBadge}
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${Math.round(file.progress || 0)}%"></div>
    </div>
  `;
}

// Update statistics
function updateStats() {
  document.getElementById('total-files').textContent = files.length;
  document.getElementById('space-saved').textContent = formatBytes(totalSpaceSaved);
}

// Start conversion
async function startConversion() {
  if (files.length === 0) {
    log('No files to convert', 'warn');
    return;
  }
  
  // Check FFmpeg
  const ffmpegCheck = await window.electronAPI.checkFFmpeg();
  if (!ffmpegCheck.available) {
    log('FFmpeg not available. Please install FFmpeg first.', 'error');
    alert('FFmpeg is not installed. Click "Install FFmpeg" button to install it.');
    return;
  }
  
  const settings = getCurrentSettings();
  
  if (settings.replaceOriginal) {
    const confirm = window.confirm('⚠️ WARNING: This will DELETE your original files! Are you sure?');
    if (!confirm) {
      return;
    }
  }
  
  converting = true;
  successCount = 0;
  failCount = 0;
  totalSpaceSaved = 0;
  
  log(`Starting batch conversion of ${files.length} files...`, 'info');
  
  await processFiles(settings);
  
  converting = false;
  log(`Batch complete! Success: ${successCount}, Failed: ${failCount}`, successCount > 0 ? 'success' : 'error');
}

// Process files sequentially
async function processFiles(settings) {
  for (let i = 0; i < files.length && converting; i++) {
    currentFileIndex = i;
    const file = files[i];
    
    file.status = 'processing';
    file.progress = 0;
    updateFileItem(i);
    
    const filename = file.path.split(/[\\/]/).pop();
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');
    log(`[${i + 1}/${files.length}] Starting: ${filename}`, 'info');
    log(`Settings: ${settings.videoCodec} / ${settings.audioCodec} / ${settings.resolution}p`, 'info');
    
    const startTime = Date.now();
    const result = await window.electronAPI.convertFile(file.path, settings);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (result.error) {
      file.status = 'error';
      file.progress = 0;
      failCount++;
      log(`✗ FAILED after ${elapsed}s: ${result.error}`, 'error');
    } else {
      file.status = 'success';
      file.progress = 100;
      successCount++;
      
      if (result.outputSize) {
        file.newSize = result.outputSize;
        
        if (file.originalSize > file.newSize) {
          const saved = file.originalSize - file.newSize;
          const percent = ((saved / file.originalSize) * 100).toFixed(1);
          totalSpaceSaved += saved;
          log(`✓ COMPLETE in ${elapsed}s - Saved ${formatBytes(saved)} (${percent}%)`, 'success');
        } else {
          log(`✓ COMPLETE in ${elapsed}s`, 'success');
        }
      } else {
        log(`✓ COMPLETE in ${elapsed}s`, 'success');
      }
    }
    
    updateFileItem(i);
    updateStats();
  }
}

// Logging
function log(message, type = 'info') {
  const container = document.getElementById('log-container');
  const div = document.createElement('div');
  
  const timestamp = new Date().toLocaleTimeString();
  let className = 'log-line ';
  
  switch (type) {
    case 'success':
      className += 'log-success';
      break;
    case 'error':
      className += 'log-error';
      break;
    case 'warn':
      className += 'log-warn';
      break;
    default:
      className += 'log-info';
  }
  
  div.className = className;
  div.textContent = `[${timestamp}] ${message}`;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function clearLog() {
  const container = document.getElementById('log-container');
  container.innerHTML = '';
  log('Log cleared', 'info');
}
