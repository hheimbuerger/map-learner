const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');

// Ensure app data directory exists
const appDataPath = path.join(app.getPath('userData'), 'drawings');
const SAVE_FILE = path.join(appDataPath, 'last_drawing.json');

// Store a global reference to the main window
let mainWindow;

async function ensureAppDataDir() {
    try {
        console.log('Ensuring app data directory exists at:', appDataPath);
        await fsPromises.mkdir(appDataPath, { recursive: true });
        console.log('App data directory is ready');
    } catch (err) {
        console.error('Error creating app data directory:', err);
    }
}

// Initialize app data directory
ensureAppDataDir();

// Load configuration
const configPath = path.join(__dirname, 'config.json');
let config = {
  backendUrl: 'http://localhost:8000'
};

try {
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(configData) };
  } else {
    // Create default config file if it doesn't exist
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
} catch (error) {
  console.error('Error loading config:', error);
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,  // Disable nodeIntegration for security
      contextIsolation: true,  // Enable contextIsolation for security
      preload: path.join(__dirname, 'preload.js')  // Use preload script
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  // Load the html file
  mainWindow.loadFile('index.html');

  // When the window is ready to show
  mainWindow.once('ready-to-show', () => {
    console.log('Window is ready to show');
    mainWindow.show();
    
    // Try to load and send the saved drawing
    loadAndSendDrawing();
    mainWindow.webContents.send('config', config);
  });

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// Function to load and send the saved drawing
function loadAndSendDrawing() {
  console.log('Attempting to load saved drawing from:', SAVE_FILE);
  
  if (!fs.existsSync(SAVE_FILE)) {
    console.log('No saved drawing found');
    return;
  }

  try {
    console.log('Found saved drawing, reading file...');
    const drawingData = fs.readFileSync(SAVE_FILE, 'utf8');
    console.log('Read drawing data, size:', drawingData.length, 'bytes');
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('Sending drawing data to renderer...');
      mainWindow.webContents.send('load-drawing', JSON.parse(drawingData));
    } else {
      console.error('Cannot send drawing: mainWindow is not available');
    }
  } catch (err) {
    console.error('Error loading/sending saved drawing:', err);
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    console.log('App is ready, creating window...');
    createWindow();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// On macOS it's common to re-create a window when the dock icon is clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Save drawing data to file
ipcMain.handle('save-drawing', async (event, drawingData) => {
    try {
        console.log('Saving drawing data...');
        await ensureAppDataDir();
        console.log('Writing to file:', SAVE_FILE);
        console.log('Drawing data size:', JSON.stringify(drawingData).length, 'bytes');
        await fsPromises.writeFile(SAVE_FILE, JSON.stringify(drawingData), 'utf8');
        console.log('Drawing saved successfully to:', SAVE_FILE);
        return { success: true };
    } catch (err) {
        console.error('Error saving drawing:', err);
        return { success: false, error: err.message };
    }
});

// Clear saved drawing
ipcMain.handle('clear-drawing', async () => {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            await fsPromises.unlink(SAVE_FILE);
        }
        return { success: true };
    } catch (err) {
        console.error('Error clearing drawing:', err);
        return { success: false, error: err.message };
    }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
  // On macOS re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});