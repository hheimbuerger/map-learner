const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isErasing = false;
let currentColor = '#000000';

// Set canvas size to match display
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

// Initial resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Set up canvas drawing context
ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Get coordinates relative to canvas
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Mouse event listeners
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    isErasing = e.button === 2; // Right mouse button
    [lastX, lastY] = [e.offsetX, e.offsetY];
    // Prevent context menu on right click
    if (isErasing) e.preventDefault();
    draw(e); // Draw a single point on click
});

canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});
canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch events
canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', stopDrawing);

function handleTouch(e) {
    e.preventDefault();

    if (e.type === 'touchstart') {
        startDrawing(e);
    } else if (e.type === 'touchmove') {
        draw(e);
    }
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing) return;

    if (isErasing) {
        // Use composite operation to erase
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20; // Make eraser a bit larger
    } else {
        // Normal drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 5;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();

    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
}

// Save and load functions
async function saveDrawing() {
    try {
        const imageData = canvas.toDataURL('image/png');
        const drawingData = {
            imageData: imageData,
            timestamp: new Date().toISOString(),
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
        };
        
        console.log('Saving drawing data:', {
            timestamp: drawingData.timestamp,
            canvasSize: `${drawingData.canvasWidth}x${drawingData.canvasHeight}`,
            imageDataLength: drawingData.imageData.length
        });
        
        const result = await window.unifiedAPI.saveDrawing(drawingData);
        console.log('Save result:', result);
        return result;
    } catch (error) {
        console.error('Error saving drawing:', error);
        throw error;
    }
}

// Load a saved drawing
function loadDrawing(data) {
    if (!data || !data.imageData) {
        console.log('No drawing data to load');
        return false;
    }

    console.log('Loading drawing data...');
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            console.log('Image loaded, drawing to canvas...');
            // Save the current composite operation
            const oldComposite = ctx.globalCompositeOperation;
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the saved image
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Restore the composite operation
            ctx.globalCompositeOperation = oldComposite;

            console.log('Drawing loaded successfully');
            resolve(true);
        };
        img.onerror = function(err) {
            console.error('Error loading image:', err);
            resolve(false);
        };
        img.src = data.imageData;
    });
}

// Listen for saved drawing data from main process or web storage
window.unifiedAPI.receive('load-drawing', async (data) => {
    console.log('Received load-drawing event with data:', data ? 'has data' : 'no data');
    const success = await loadDrawing(data);
    if (success) {
        console.log('Drawing loaded successfully from saved data');
    } else {
        console.log('No saved drawing data to load or loading failed');
    }
});

// Clear canvas
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.unifiedAPI.clearDrawing();
    status.textContent = '';
    status.className = 'status';
});

// Modal functionality
const modal = document.getElementById('resultModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBtn2 = document.getElementById('closeModalBtn2');
const evaluationResult = document.getElementById('evaluationResult');

function showModal(content) {
    evaluationResult.innerHTML = typeof content === 'string' ? content : '';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

function hideModal() {
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Re-enable scrolling
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
}
if (closeModalBtn2) {
    closeModalBtn2.addEventListener('click', hideModal);
}

// Close modal when clicking outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});

// Configuration - works in both Electron and web modes
let backendUrl = window.unifiedAPI.getBackendUrl();

// Listen for config from main process (Electron mode only)
if (window.unifiedAPI.isElectron) {
    window.electronAPI.receive('config', (config) => {
        backendUrl = config.backendUrl;
        console.log('Using backend URL:', backendUrl);
    });
} else {
    console.log('Web mode - using backend URL:', backendUrl);
}

// Submit drawing
submitBtn.addEventListener('click', async () => {
    // Save before submitting
    await saveDrawing();
    
    // Convert canvas to blob with white background
    const blob = await new Promise(resolve => {
        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set same dimensions as original canvas
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Fill with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the original canvas on top
        tempCtx.drawImage(canvas, 0, 0);
        
        // Convert to blob
        tempCanvas.toBlob(resolve, 'image/png');
    });
    
    // Create form data and append the image
    const formData = new FormData();
    formData.append('image', blob, 'drawing.png');
    
    status.textContent = 'Evaluating...';
    status.className = 'status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const response = await fetch(backendUrl + '/evaluate', {
            method: 'POST',
            // Don't set Content-Type header - let the browser set it with the correct boundary
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Received evaluation result:', result);
        
        // Format the evaluation result
        let evaluationHTML = `
            <div class="evaluation-result">
                <div class="score">Score: ${result.score || 'N/A'}/100</div>
                <div class="feedback">
        `;
        
        // Format feedback as list if it's an array, otherwise as paragraph
        if (Array.isArray(result.feedback)) {
            evaluationHTML += '<ul>';
            result.feedback.forEach(fb => {
                evaluationHTML += `<li>${fb}</li>`;
            });
            evaluationHTML += '</ul>';
        } else {
            evaluationHTML += `<p>${result.feedback || 'No feedback available.'}</p>`;
        }
        
        evaluationHTML += `
                </div>
            </div>
        `;
        
        // Update the modal content
        document.getElementById('evaluationResult').innerHTML = evaluationHTML;
        
        // Show the modal
        modal.classList.add('show');
        
        // Update status
        status.textContent = 'Evaluation complete!';
        status.className = 'status success';
        
    } catch (error) {
        console.error('Error:', error);
        status.textContent = 'Error: ' + (error.message || 'Failed to send image');
        status.className = 'status error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Drawing';
    }
});

// Prevent scrolling when touching the canvas
document.body.addEventListener('touchstart', e => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', e => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', e => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });
