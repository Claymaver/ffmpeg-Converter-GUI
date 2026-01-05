// State
let files = [];
let converting = false;
let currentTracks = null;
let customPresets = loadPresets();
let successCount = 0;
let failCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeSettings();
  initializeButtons();
  initializePresets();
  updateCustomPresetList();
  
  // Check FFmpeg
  checkFFmpeg();
  
  log('Application ready', 'info');
});

// Tab switching
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      contents.forEach(c => {
        if (c.id === `tab-${tabName}`) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
    });
  });
}

// Settings event listeners
function initializeSettings() {
  // Track mode change
  document.getElementById('track-mode').addEventListener('change', (e) => {
    const mode = e.target.value;
    document.getElementById('language-settings').classList.toggle('hidden', mode !== 'language');
    document.getElementById('custom-settings').classList.toggle('hidden', mode !== 'custom');
  });
  
  // CRF slider
  document.getElementById('crf').addEventListener('input', (e) => {
    document.getElementById('crf-value').textContent = e.target.value;
  });
  
  // Resolution quick buttons
  document.querySelectorAll('.res-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('resolution').value = btn.dataset.res;
    });
  });
  
  // Bitrate quick buttons
  document.querySelectorAll('.br-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('audio-bitrate').value = btn.dataset.br;
    });
  });
}

// Button event listeners
function initializeButtons() {
  document.getElementById('folder-btn').addEventListener('click', selectFolder);
  document.getElementById('files-btn').addEventListener('click', selectFiles);
  document.getElementById('clear-btn').addEventListener('click', clearFiles);
  document.getElementById('convert-btn').addEventListener('click', startConversion);
  document.getElementById('stop-btn').addEventListener('click', stopConversion);
  document.getElementById('analyze-btn').addEventListener('click', analyzeFile);
  document.getElementById('save-preset').addEventListener('click', savePreset);
}

// Preset buttons
function initializePresets() {
  const presets = {
    tv: { resolution: 720, crf: 28, preset: 'fast', codec: 'libx264', container: 'mkv' },
    movie: { resolution: 1080, crf: 23, preset: 'slow', codec: 'libx264', container: 'mkv' },
    quality: { resolution: 1080, crf: 18, preset: 'slower', codec: 'libx264', container: 'mkv' },
    small: { resolution: 720, crf: 30, preset: 'fast', codec: 'libx265', container: 'mp4' }
  };
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = presets[btn.dataset.preset];
      applyPreset(preset);
      log(`Applied ${btn.textContent.trim()} preset`, 'info');
    });
  });
}

// Apply preset
function applyPreset(settings) {
  if (settings.resolution) document.getElementById('resolution').value = settings.resolution;
  if (settings.crf) {
    document.getElementById('crf').value = settings.crf;
    document.getElementById('crf-value').textContent = settings.crf;
  }
  if (settings.preset) document.getElementById('preset').value = settings.preset;
  if (settings.codec) document.getElementById('codec').value = settings.codec;
  if (settings.container) document.getElementById('container').value = settings.container;
  if (settings.audioCodec) document.getElementById('audio-codec').value = settings.audioCodec;
  if (settings.audioBitrate) document.getElementById('audio-bitrate').value = settings.audioBitrate;
}

// Custom presets
function savePreset() {
  const name = document.getElementById('preset-name').value.trim();
  if (!name) {
    alert('Please enter a preset name');
    return;
  }
  
  const settings = getSettings();
  customPresets[name] = settings;
  savePresets(customPresets);
  updateCustomPresetList();
  
  document.getElementById('preset-name').value = '';
  log(`Saved preset: ${name}`, 'success');
}

function updateCustomPresetList() {
  const container = document.getElementById('custom-presets');
  container.innerHTML = '';
  
  Object.keys(customPresets).forEach(name => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 transition';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'flex-1 text-sm cursor-pointer';
    nameSpan.textContent = name;
    nameSpan.onclick = () => {
      applyPreset(customPresets[name]);
      log(`Loaded preset: ${name}`, 'info');
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded';
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => {
      delete customPresets[name];
      savePresets(customPresets);
      updateCustomPresetList();
      log(`Deleted preset: ${name}`, 'info');
    };
    
    div.appendChild(nameSpan);
    div.appendChild(deleteBtn);
    container.appendChild(div);
  });
}

function loadPresets() {
  try {
    const saved = localStorage.getItem('ffmpeg-presets');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function savePresets(presets) {
  localStorage.setItem('ffmpeg-presets', JSON.stringify(presets));
}

// File selection
async function selectFolder() {
  const result = await window.electronAPI.selectFolder();
  if (result.canceled) return;
  
  const recursive = document.getElementById('recursive').checked;
  const scanResult = await window.electronAPI.scanFolder(result.path, recursive);
  
  if (scanResult.success) {
    files = scanResult.files;
    updateFileList();
    log(`Found ${files.length} files`, 'success');
  } else {
    log(`Error scanning folder: ${scanResult.error}`, 'error');
  }
}

async function selectFiles() {
  const result = await window.electronAPI.selectFiles();
  if (result.canceled) return;
  
  files = result.files.map(path => ({
    path,
    name: path.split(/[\\/]/).pop(),
    size: '?'
  }));
  
  updateFileList();
  log(`Selected ${files.length} files`, 'success');
}

function clearFiles() {
  files = [];
  currentTracks = null;
  updateFileList();
  log('Cleared file list', 'info');
}

function updateFileList() {
  const container = document.getElementById('file-list');
  
  if (files.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-gray-500">
        <div class="text-4xl mb-3">📁</div>
        <div>No files selected</div>
        <div class="text-sm mt-2">Click "Folder" or "Files" to start</div>
      </div>
    `;
  } else {
    container.innerHTML = files.map((file, i) => `
      <div class="file-item px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition" data-index="${i}">
        <div class="font-medium">${escapeHtml(file.name)}</div>
        <div class="text-xs text-gray-400 mt-1">${file.size} MB</div>
      </div>
    `).join('');
    
    // Click handler
    container.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }
  
  document.getElementById('total-count').textContent = files.length;
  successCount = 0;
  failCount = 0;
  document.getElementById('success-count').textContent = successCount;
  document.getElementById('fail-count').textContent = failCount;
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = 'Ready';
}

// Analyze file for tracks
async function analyzeFile() {
  const activeItem = document.querySelector('.file-item.active');
  if (!activeItem) {
    alert('Please select a file from the list');
    return;
  }
  
  const index = parseInt(activeItem.dataset.index);
  const file = files[index];
  
  log(`Analyzing: ${file.name}`, 'info');
  
  const result = await window.electronAPI.probeFile(file.path);
  
  if (result.success) {
    currentTracks = result;
    displayTracks();
    log(`Found ${result.audio.length} audio and ${result.subtitle.length} subtitle tracks`, 'success');
  } else {
    log(`Error analyzing file: ${result.error}`, 'error');
    alert(`Failed to analyze file:\n${result.error}`);
  }
}

function displayTracks() {
  const container = document.getElementById('track-list');
  
  if (!currentTracks) {
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-8">No tracks analyzed</p>';
    return;
  }
  
  let html = '';
  
  if (currentTracks.audio.length > 0) {
    html += '<div class="font-medium text-sm mb-2">Audio Tracks:</div>';
    currentTracks.audio.forEach(track => {
      const lang = track.language.toUpperCase();
      const bitrate = track.bitrate ? ` - ${Math.round(track.bitrate/1000)}kbps` : '';
      const title = track.title ? ` - ${track.title}` : '';
      
      html += `
        <label class="flex items-start p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
          <input type="checkbox" class="audio-track mt-1 mr-3" data-index="${track.index}" checked>
          <div class="text-sm">
            <div class="font-medium">Track ${track.streamIndex}: ${lang} - ${track.codec} - ${track.channels}ch${bitrate}</div>
            ${title ? `<div class="text-xs text-gray-400">${title}</div>` : ''}
          </div>
        </label>
      `;
    });
  }
  
  if (currentTracks.subtitle.length > 0) {
    html += '<div class="font-medium text-sm mb-2 mt-4">Subtitle Tracks:</div>';
    currentTracks.subtitle.forEach(track => {
      const lang = track.language.toUpperCase();
      const title = track.title ? ` - ${track.title}` : '';
      
      html += `
        <label class="flex items-start p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer">
          <input type="checkbox" class="subtitle-track mt-1 mr-3" data-index="${track.index}" checked>
          <div class="text-sm">
            <div class="font-medium">Track ${track.streamIndex}: ${lang} - ${track.codec}</div>
            ${title ? `<div class="text-xs text-gray-400">${title}</div>` : ''}
          </div>
        </label>
      `;
    });
  }
  
  if (html === '') {
    html = '<p class="text-sm text-gray-500 text-center py-8">No audio or subtitle tracks found</p>';
  }
  
  container.innerHTML = html;
}

// Get current settings
function getSettings() {
  const trackMode = document.getElementById('track-mode').value;
  const settings = {
    resolution: parseInt(document.getElementById('resolution').value),
    crf: parseInt(document.getElementById('crf').value),
    preset: document.getElementById('preset').value,
    codec: document.getElementById('codec').value,
    container: document.getElementById('container').value,
    audioCodec: document.getElementById('audio-codec').value,
    audioBitrate: parseInt(document.getElementById('audio-bitrate').value),
    trackMode,
    autoReplace: document.getElementById('auto-replace').checked,
    cleanFilenames: document.getElementById('clean-filenames').checked
  };
  
  if (trackMode === 'language') {
    const audioLangs = document.getElementById('audio-languages').value
      .split(',').map(s => s.trim()).filter(s => s);
    const subLangs = document.getElementById('subtitle-languages').value
      .split(',').map(s => s.trim()).filter(s => s);
    
    settings.audioLanguages = audioLangs.length > 0 ? audioLangs : ['eng'];
    settings.subtitleLanguages = subLangs;
    settings.keepFirstAudio = document.getElementById('keep-first-audio').checked;
  } else if (trackMode === 'custom' && currentTracks) {
    const audioTracks = Array.from(document.querySelectorAll('.audio-track:checked'))
      .map(cb => parseInt(cb.dataset.index));
    const subtitleTracks = Array.from(document.querySelectorAll('.subtitle-track:checked'))
      .map(cb => parseInt(cb.dataset.index));
    
    settings.selectedAudioTracks = audioTracks;
    settings.selectedSubtitleTracks = subtitleTracks;
  }
  
  return settings;
}

// Conversion
async function startConversion() {
  if (files.length === 0) {
    alert('Please select files to convert');
    return;
  }
  
  if (converting) {
    alert('Conversion already in progress');
    return;
  }
  
  const settings = getSettings();
  
  if (settings.autoReplace) {
    if (!confirm('⚠️ WARNING: Auto-replace will DELETE original files!\n\nAre you sure you want to continue?')) {
      return;
    }
  }
  
  converting = true;
  successCount = 0;
  failCount = 0;
  
  document.getElementById('convert-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  
  log('='.repeat(60), 'info');
  log('Starting batch conversion...', 'info');
  log('='.repeat(60), 'info');
  
  for (let i = 0; i < files.length; i++) {
    if (!converting) {
      log('Conversion stopped by user', 'warn');
      break;
    }
    
    const file = files[i];
    const progress = ((i) / files.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Converting ${i + 1}/${files.length}`;
    
    // Highlight current file
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => item.classList.remove('active'));
    if (fileItems[i]) fileItems[i].classList.add('active');
    
    log(`\n[${i + 1}/${files.length}] ${file.name}`, 'info');
    
    try {
      const result = await window.electronAPI.convertFile(file.path, settings);
      
      if (result.success) {
        successCount++;
        log(`✓ Success! ${result.inputSize}MB → ${result.outputSize}MB (saved ${result.saved}MB, ${result.percent}%)`, 'success');
      } else {
        failCount++;
        log(`✗ Failed: ${result.error}`, 'error');
      }
    } catch (error) {
      failCount++;
      log(`✗ Error: ${error.message}`, 'error');
    }
    
    document.getElementById('success-count').textContent = successCount;
    document.getElementById('fail-count').textContent = failCount;
  }
  
  converting = false;
  document.getElementById('convert-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('progress-text').textContent = 'Complete';
  
  log('='.repeat(60), 'info');
  log(`Batch conversion complete! ✓${successCount} ✗${failCount}`, 'success');
  
  await window.electronAPI.showInfo('Conversion Complete', 
    `Success: ${successCount}\nFailed: ${failCount}\n\nCheck the 'converted' folder for output files.`);
}

function stopConversion() {
  converting = false;
  log('Stopping conversion...', 'warn');
}

// Listen for progress updates
window.electronAPI.onConversionProgress((data) => {
  if (data.percent) {
    document.getElementById('progress-text').textContent = 
      `${data.file} - ${data.percent.toFixed(1)}%`;
  }
});

// Listen for log messages
window.electronAPI.onConversionLog((message) => {
  log(message, 'info');
});

// Logging
function log(message, type = '') {
  const logPanel = document.getElementById('log-panel');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logPanel.appendChild(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
}

// Check FFmpeg
async function checkFFmpeg() {
  const result = await window.electronAPI.checkFFmpeg();
  if (result.success) {
    log('FFmpeg ready', 'success');
  } else {
    log('FFmpeg error: ' + result.error, 'error');
  }
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('Renderer loaded');
