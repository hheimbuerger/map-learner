const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Drawing persistence
    saveDrawing: (drawingData) => {
        console.log('Renderer: Requesting to save drawing');
        return ipcRenderer.invoke('save-drawing', drawingData);
    },
    
    clearDrawing: () => {
        console.log('Renderer: Requesting to clear drawing');
        return ipcRenderer.invoke('clear-drawing');
    },
    
    // Communication channels
    receive: (channel, func) => {
        // Only allow these channels
        const validChannels = ['load-drawing', 'config'];
        if (validChannels.includes(channel)) {
            console.log(`Renderer: Setting up listener for channel: ${channel}`);
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => {
                console.log(`Renderer: Received on channel ${channel}`, args[0] ? 'with data' : 'without data');
                func(...args);
            });
        } else {
            console.warn(`Renderer: Attempted to listen to invalid channel: ${channel}`);
        }
    },
    
    // Remove all listeners when page unloads
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('load-drawing');
        ipcRenderer.removeAllListeners('config');
    }
});

// Clean up listeners when the page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.electronAPI && typeof window.electronAPI.removeAllListeners === 'function') {
        window.electronAPI.removeAllListeners();
    }
});
