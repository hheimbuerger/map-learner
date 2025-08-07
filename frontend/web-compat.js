// Web compatibility layer for dual mode (Electron + Web)
// This file provides fallbacks for Electron APIs when running in web mode

(function() {
    'use strict';

    // Detect if we're running in Electron
    const isElectron = !!(window.electronAPI);
    
    // Create a unified API that works in both modes
    window.unifiedAPI = {
        isElectron: isElectron,
        
        // Drawing persistence - fallback to localStorage for web mode
        saveDrawing: async (drawingData) => {
            if (isElectron && window.electronAPI) {
                console.log('Electron mode: Saving drawing via IPC');
                return await window.electronAPI.saveDrawing(drawingData);
            } else {
                console.log('Web mode: Saving drawing to localStorage');
                try {
                    localStorage.setItem('maplearner_drawing', JSON.stringify(drawingData));
                    return { success: true };
                } catch (error) {
                    console.error('Failed to save to localStorage:', error);
                    return { success: false, error: error.message };
                }
            }
        },
        
        clearDrawing: async () => {
            if (isElectron && window.electronAPI) {
                console.log('Electron mode: Clearing drawing via IPC');
                return await window.electronAPI.clearDrawing();
            } else {
                console.log('Web mode: Clearing drawing from localStorage');
                try {
                    localStorage.removeItem('maplearner_drawing');
                    return { success: true };
                } catch (error) {
                    console.error('Failed to clear localStorage:', error);
                    return { success: false, error: error.message };
                }
            }
        },
        
        // Load saved drawing
        loadSavedDrawing: () => {
            if (isElectron) {
                // In Electron mode, this is handled by the main process
                // The drawing is loaded automatically via IPC
                return null;
            } else {
                console.log('Web mode: Loading drawing from localStorage');
                try {
                    const saved = localStorage.getItem('maplearner_drawing');
                    return saved ? JSON.parse(saved) : null;
                } catch (error) {
                    console.error('Failed to load from localStorage:', error);
                    return null;
                }
            }
        },
        
        // Event handling - fallback to custom events for web mode
        receive: (channel, callback) => {
            if (isElectron && window.electronAPI) {
                window.electronAPI.receive(channel, callback);
            } else {
                // In web mode, we'll use custom events
                window.addEventListener(`unified-${channel}`, (event) => {
                    callback(event.detail);
                });
            }
        },
        
        // Emit custom events for web mode
        emit: (channel, data) => {
            if (!isElectron) {
                const event = new CustomEvent(`unified-${channel}`, { detail: data });
                window.dispatchEvent(event);
            }
        },
        
        // Get backend URL - fallback to current origin for web mode
        getBackendUrl: () => {
            if (isElectron) {
                // In Electron, we can use the configured backend URL
                return 'http://localhost:8000'; // Default, could be from config
            } else {
                // In web mode, assume backend is on same origin or configure as needed
                return window.location.origin.replace(':3000', ':8000'); // Adjust port if needed
            }
        }
    };

    // Initialize web mode if not in Electron
    if (!isElectron) {
        console.log('Running in web mode - initializing fallbacks');
        
        // Simulate loading saved drawing after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const savedDrawing = window.unifiedAPI.loadSavedDrawing();
                    if (savedDrawing) {
                        window.unifiedAPI.emit('load-drawing', savedDrawing);
                    }
                }, 100);
            });
        } else {
            setTimeout(() => {
                const savedDrawing = window.unifiedAPI.loadSavedDrawing();
                if (savedDrawing) {
                    window.unifiedAPI.emit('load-drawing', savedDrawing);
                }
            }, 100);
        }
    }

    console.log(`Unified API initialized - Mode: ${isElectron ? 'Electron' : 'Web'}`);
})();
