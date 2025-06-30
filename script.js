// ===== GLOBAL VARIABLES =====
let canvas;
let currentTool = 'select';
let currentColor = '#800080';
let brushSize = 10;
let isDrawing = false;
let history = [];
let historyStep = -1;
let layers = [];
let currentLayer = null;
let selectedObject = null;
let clipboard = null;
let zoomLevel = 100;
let gridVisible = false;
let rulersVisible = false;
let cropMode = false;
let cropRect = null;

// Touch and gesture variables
let lastTouchDistance = 0;
let initialPinchZoom = 1;
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };
let panStartPoint = { x: 0, y: 0 };
let gestureStartZoom = 1;

// UI state variables
let toolbarHideTimeout = null;
let isToolbarVisible = true;

// Mobile panel states
let mobilePanelStates = {
    'tools-panel': false,
    'layers-container': false,
    'properties-container': false,
    'ai-panel': false
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    init();
});

function init() {
    // Initialize canvas
    initializeCanvas();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup template selection
    setupTemplateSelection();
    
    // Setup tools
    setupTools();
    
    // Setup panels
    setupPanels();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Setup theme
    setupTheme();
    
    // Setup mobile interface
    setupMobileInterface();
    
    // Setup touch and gesture handling
    setupTouchHandling();
    
    // Setup zoom functionality
    setupZoomFunctionality();
    
    // Initialize default layer
    addNewLayer('Background');
    
    // Add ripple effects to buttons
    addRippleEffects();
    
    console.log('Visual Composer Pro initialized successfully');
}

// ===== CANVAS INITIALIZATION =====
function initializeCanvas() {
    const canvasElement = document.getElementById('main-canvas');
    canvas = new fabric.Canvas(canvasElement, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
        allowTouchScrolling: false,
        enableRetinaScaling: true
    });
    
    // Canvas event listeners
    canvas.on('selection:created', handleObjectSelection);
    canvas.on('selection:updated', handleObjectSelection);
    canvas.on('selection:cleared', handleObjectDeselection);
    canvas.on('object:modified', saveCanvasState);
    canvas.on('object:added', saveCanvasState);
    canvas.on('object:removed', saveCanvasState);
    canvas.on('path:created', saveCanvasState);
    
    // Mouse events for drawing
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    updateCanvasInfo();
    saveCanvasState();
    
    // Fit canvas to screen initially
    setTimeout(() => {
        fitToScreen();
    }, 100);
}

// ===== ZOOM FUNCTIONALITY =====
function setupZoomFunctionality() {
    const canvasElement = document.getElementById('main-canvas');
    let zoom = 1;

    function applyZoom() {
        canvasElement.style.transform = `scale(${zoom})`;
        canvasElement.style.transformOrigin = "center center";
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.innerText = `${Math.round(zoom * 100)}%`;
        }
        
        // Update zoom slider
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(zoom * 100);
        }
        
        // Update global zoom level
        zoomLevel = Math.round(zoom * 100);
        
        // Update zoom buttons
        updateZoomButtons();
    }

    // Zoom controls
    document.getElementById('zoom-in').onclick = () => {
        zoom = Math.min(zoom + 0.1, 3);
        applyZoom();
    };

    document.getElementById('zoom-out').onclick = () => {
        zoom = Math.max(zoom - 0.1, 0.1);
        applyZoom();
    };

    document.getElementById('zoom-100').onclick = () => {
        zoom = 1;
        applyZoom();
    };

    // Fit to screen
    document.getElementById('zoom-fit').onclick = () => {
        const container = document.getElementById('canvas-container');
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvasElement.getBoundingClientRect();
        
        const scaleX = (containerRect.width - 80) / canvasElement.width;
        const scaleY = (containerRect.height - 80) / canvasElement.height;
        zoom = Math.min(scaleX, scaleY, 1);
        applyZoom();
    };

    // Mouse Wheel Zoom (Desktop)
    canvasElement.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            zoom += e.deltaY > 0 ? -0.1 : 0.1;
            zoom = Math.min(Math.max(zoom, 0.1), 3);
            applyZoom();
        }
    });

    // Touch Pinch Zoom (Mobile)
    let lastDistance = null;
    canvasElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (lastDistance !== null) {
                const delta = distance - lastDistance;
                zoom += delta * 0.002;
                zoom = Math.min(Math.max(zoom, 0.1), 3);
                applyZoom();
            }
            lastDistance = distance;
        }
    });

    canvasElement.addEventListener('touchend', () => {
        lastDistance = null;
    });

    // Zoom slider
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            zoom = parseInt(e.target.value) / 100;
            applyZoom();
        });
    }

    // Bottom bar zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    
    if (zoomInBtn) {
        zoomInBtn.onclick = () => {
            zoom = Math.min(zoom + 0.1, 3);
            applyZoom();
        };
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
            zoom = Math.max(zoom - 0.1, 0.1);
            applyZoom();
        };
    }

    function updateZoomButtons() {
        if (zoomInBtn) zoomInBtn.disabled = zoom >= 3;
        if (zoomOutBtn) zoomOutBtn.disabled = zoom <= 0.1;
    }

    applyZoom();
}

// ===== TOUCH AND GESTURE HANDLING =====
function setupTouchHandling() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;
    
    // Touch events
    canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasContainer.addEventListener('touchen', handleTouchEnd, { passive: false });
    
    // Mouse wheel for zoom
    canvasContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
    
    // Prevent context menu on long press
    canvasContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

function handleTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
        // Single touch
        const touch = e.touches[0];
        touchStartTime = Date.now();
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        if (currentTool === 'hand') {
            isPanning = true;
            panStartPoint = { x: touch.clientX, y: touch.clientY };
            lastPanPoint = { x: touch.clientX, y: touch.clientY };
        }
    } else if (e.touches.length === 2) {
        // Two finger pinch
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        gestureStartZoom = zoomLevel;
        
        // Hide toolbar during gesture
        hideToolbarTemporarily();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 1 && isPanning && currentTool === 'hand') {
        // Single finger panning
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastPanPoint.x;
        const deltaY = touch.clientY - lastPanPoint.y;
        
        // Pan the canvas viewport
        const vpt = canvas.viewportTransform;
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        canvas.setViewportTransform(vpt);
        canvas.renderAll();
        
        lastPanPoint = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
        // Two finger pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (lastTouchDistance > 0) {
            const scale = currentDistance / lastTouchDistance;
            const newZoom = Math.max(10, Math.min(300, gestureStartZoom * scale));
            
            // Get center point between fingers
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            // Apply zoom
            const canvasElement = document.getElementById('main-canvas');
            const zoom = newZoom / 100;
            canvasElement.style.transform = `scale(${zoom})`;
            
            // Update zoom display
            const zoomDisplay = document.getElementById('zoom-level');
            if (zoomDisplay) {
                zoomDisplay.innerText = `${newZoom}%`;
            }
            
            zoomLevel = newZoom;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    
    if (e.touches.length === 0) {
        // All touches ended
        isPanning = false;
        lastTouchDistance = 0;
        
        // Show toolbar again
        showToolbar();
        
        // Check for tap gesture
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 200 && !isPanning) {
            handleTouchTap(e);
        }
    }
}

function handleTouchTap(e) {
    const rect = canvas.getElement().getBoundingClientRect();
    const x = (e.changedTouches[0].clientX - rect.left) / (zoomLevel / 100);
    const y = (e.changedTouches[0].clientY - rect.top) / (zoomLevel / 100);
    
    // Handle tool-specific touch actions
    switch (currentTool) {
        case 'text':
            addText({ x, y });
            break;
        case 'rect':
            addRectangleAtPosition(x, y);
            break;
        case 'circle':
            addEllipseAtPosition(x, y);
            break;
    }
}

function handleWheelZoom(e) {
    if (!e.ctrlKey) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.max(10, Math.min(300, zoomLevel + delta));
    
    // Apply zoom
    const canvasElement = document.getElementById('main-canvas');
    const zoom = newZoom / 100;
    canvasElement.style.transform = `scale(${zoom})`;
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-level');
    if (zoomDisplay) {
        zoomDisplay.innerText = `${newZoom}%`;
    }
    
    zoomLevel = newZoom;
}

function hideToolbarTemporarily() {
    const toolbar = document.querySelector('.canvas-toolbar');
    if (toolbar) {
        toolbar.classList.add('gesture-hidden');
        isToolbarVisible = false;
    }
}

function showToolbar() {
    const toolbar = document.querySelector('.canvas-toolbar');
    if (toolbar) {
        toolbar.classList.remove('gesture-hidden', 'temp-hidden');
        isToolbarVisible = true;
    }
}

// ===== TEMPLATE SELECTION =====
function setupTemplateSelection() {
    const modal = document.getElementById('canvas-size-modal');
    const templateBtns = document.querySelectorAll('.template-btn');
    const customInputs = document.getElementById('custom-size-inputs');
    const createBtn = document.getElementById('create-canvas-btn');
    const categoryTabs = document.querySelectorAll('.category-tab');
    
    let selectedTemplate = null;
    
    // Category tab switching
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            showCategory(category);
        });
    });
    
    // Template selection
    templateBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove previous selection
            templateBtns.forEach(b => b.classList.remove('selected'));
            
            // Select current template
            this.classList.add('selected');
            selectedTemplate = this.dataset.size;
            
            // Show custom inputs if custom template
            if (selectedTemplate === 'custom') {
                customInputs.classList.add('active');
            } else {
                customInputs.classList.remove('active');
            }
            
            // Enable create button
            createBtn.disabled = false;
        });
    });
    
    // Create canvas button
    createBtn.addEventListener('click', function() {
        let width, height, name;
        
        if (selectedTemplate === 'custom') {
            width = parseInt(document.getElementById('custom-width').value);
            height = parseInt(document.getElementById('custom-height').value);
            name = 'Custom Canvas';
        } else {
            const dimensions = selectedTemplate.split('x');
            width = parseInt(dimensions[0]);
            height = parseInt(dimensions[1]);
            name = this.closest('.template-btn')?.dataset.name || 'New Canvas';
        }
        
        // Update canvas size
        canvas.setDimensions({ width, height });
        canvas.renderAll();
        
        // Update UI
        updateCanvasInfo();
        document.getElementById('canvas-name').textContent = name;
        
        // Close modal with animation
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
        }, 300);
        
        // Save initial state
        saveCanvasState();
        
        // Fit canvas to screen
        setTimeout(() => {
            fitToScreen();
        }, 100);
    });
}

function showCategory(categoryName) {
    // Update tab states
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === categoryName);
    });
    
    // Show/hide categories
    const categories = document.querySelectorAll('.template-category');
    categories.forEach(category => {
        category.classList.toggle('active', category.dataset.category === categoryName);
    });
    
    // Show/hide custom inputs
    const customInputs = document.querySelector('.custom-size-inputs');
    if (customInputs) {
        customInputs.classList.toggle('active', categoryName === 'custom');
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Menu items
    setupMenuItems();
    
    // Header actions
    document.getElementById('ai-toggle-btn').addEventListener('click', toggleAIPanel);
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // AI Panel
    document.getElementById('ai-close-btn').addEventListener('click', closeAIPanel);
    document.getElementById('generate-ai-image-btn').addEventListener('click', generateAIImage);
    document.getElementById('regenerate-btn').addEventListener('click', regenerateAIImage);
    document.getElementById('add-to-canvas-btn').addEventListener('click', addAIImageToCanvas);
    
    // Canvas controls
    document.getElementById('grid-toggle').addEventListener('click', toggleGrid);
    document.getElementById('rulers-toggle').addEventListener('click', toggleRulers);
    document.getElementById('fit-to-screen').addEventListener('click', fitToScreen);
    
    // Export
    document.getElementById('export-btn').addEventListener('click', showExportOptions);
    
    // Layer controls
    document.getElementById('add-new-layer-btn').addEventListener('click', () => addNewLayer());
    document.getElementById('move-layer-up-btn').addEventListener('click', moveLayerUp);
    document.getElementById('move-layer-down-btn').addEventListener('click', moveLayerDown);
    document.getElementById('duplicate-layer-btn').addEventListener('click', duplicateLayer);
    document.getElementById('delete-layer-btn').addEventListener('click', deleteLayer);
    
    // Color picker
    document.getElementById('color-picker').addEventListener('change', handleColorChange);
    
    // Image upload
    document.getElementById('image-upload-btn').addEventListener('click', () => {
        document.getElementById('image-upload').click();
    });
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    
    // Crop actions
    document.getElementById('apply-crop-btn').addEventListener('click', applyCrop);
    document.getElementById('cancel-crop-btn').addEventListener('click', cancelCrop);
    
    // Modal close buttons
    document.querySelectorAll('.modal .close-btn, .modal .ai-close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Collapsible panels
    setupCollapsiblePanels();
    
    // Blur intensity slider
    document.getElementById('ai-blur').addEventListener('input', function() {
        document.getElementById('blur-value').textContent = this.value;
    });
}

function setupMenuItems() {
    // File menu
    document.getElementById('new-project').addEventListener('click', newProject);
    document.getElementById('open-image').addEventListener('click', openImage);
    document.getElementById('save-project').addEventListener('click', saveProject);
    document.getElementById('export-png').addEventListener('click', () => exportCanvas('png'));
    document.getElementById('export-jpg').addEventListener('click', () => exportCanvas('jpg'));
    document.getElementById('export-svg').addEventListener('click', () => exportCanvas('svg'));
    
    // Edit menu
    document.getElementById('undo-action').addEventListener('click', undo);
    document.getElementById('redo-action').addEventListener('click', redo);
    document.getElementById('cut-object').addEventListener('click', cutObject);
    document.getElementById('copy-object').addEventListener('click', copyObject);
    document.getElementById('paste-object').addEventListener('click', pasteObject);
    document.getElementById('duplicate-object').addEventListener('click', duplicateObject);
    document.getElementById('delete-object').addEventListener('click', deleteObject);
    
    // Image menu
    document.getElementById('crop-image').addEventListener('click', startCrop);
    document.getElementById('resize-canvas').addEventListener('click', resizeCanvas);
    document.getElementById('rotate-image').addEventListener('click', rotateImage);
    document.getElementById('flip-horizontal').addEventListener('click', flipHorizontal);
    document.getElementById('flip-vertical').addEventListener('click', flipVertical);
    
    // Layer menu
    document.getElementById('add-layer').addEventListener('click', () => addNewLayer());
    document.getElementById('delete-layer').addEventListener('click', deleteLayer);
    document.getElementById('duplicate-layer').addEventListener('click', duplicateLayer);
    document.getElementById('move-layer-up').addEventListener('click', moveLayerUp);
    document.getElementById('move-layer-down').addEventListener('click', moveLayerDown);
    
    // Select menu
    document.getElementById('select-all').addEventListener('click', selectAll);
    document.getElementById('deselect').addEventListener('click', deselectAll);
    
    // Effects menu
    document.getElementById('blur-effect').addEventListener('click', () => applyEffect('blur'));
    document.getElementById('sharpen-effect').addEventListener('click', () => applyEffect('sharpen'));
    document.getElementById('brightness-effect').addEventListener('click', () => applyEffect('brightness'));
    document.getElementById('contrast-effect').addEventListener('click', () => applyEffect('contrast'));
    document.getElementById('grayscale-effect').addEventListener('click', () => applyEffect('grayscale'));
    document.getElementById('sepia-effect').addEventListener('click', () => applyEffect('sepia'));
    document.getElementById('invert-effect').addEventListener('click', () => applyEffect('invert'));
    
    // View menu
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('zoom-fit').addEventListener('click', fitToScreen);
    document.getElementById('zoom-100').addEventListener('click', () => setZoom(100));
    document.getElementById('toggle-grid').addEventListener('click', toggleGrid);
    document.getElementById('toggle-rulers').addEventListener('click', toggleRulers);
    
    // Help menu
    document.getElementById('keyboard-shortcuts').addEventListener('click', showKeyboardShortcuts);
    document.getElementById('documentation').addEventListener('click', showDocumentation);
    document.getElementById('share-prompt').addEventListener('click', showSharePrompt);
    document.getElementById('about').addEventListener('click', showAbout);
}

// ===== TOOLS SETUP =====
function setupTools() {
    const toolBtns = document.querySelectorAll('.tool-btn');
    
    toolBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tools
            toolBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked tool
            this.classList.add('active');
            
            // Set current tool
            const tool = this.dataset.tool;
            const shape = this.dataset.shape;
            
            if (tool === 'shape' && shape) {
                currentTool = shape;
            } else {
                currentTool = tool;
            }
            
            // Update canvas interaction mode
            updateCanvasMode();
            
            console.log('Tool changed to:', currentTool);
        });
    });
}

function updateCanvasMode() {
    // Reset canvas modes
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    
    switch (currentTool) {
        case 'select':
            canvas.selection = true;
            break;
        case 'brush':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.width = brushSize;
            canvas.freeDrawingBrush.color = currentColor;
            break;
        case 'eraser':
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
            canvas.freeDrawingBrush.width = brushSize;
            break;
        case 'hand':
            canvas.selection = false;
            canvas.defaultCursor = 'grab';
            break;
        case 'zoom':
            canvas.selection = false;
            canvas.defaultCursor = 'zoom-in';
            break;
        case 'text':
            canvas.selection = false;
            canvas.defaultCursor = 'text';
            break;
        case 'rect':
        case 'circle':
        case 'line':
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            break;
        default:
            canvas.selection = true;
            break;
    }
}

// ===== MOUSE EVENTS =====
function handleMouseDown(event) {
    const pointer = canvas.getPointer(event.e);
    isDrawing = true;
    
    switch (currentTool) {
        case 'rect':
            startDrawingRect(pointer);
            break;
        case 'circle':
            startDrawingCircle(pointer);
            break;
        case 'line':
            startDrawingLine(pointer);
            break;
        case 'text':
            addText(pointer);
            break;
        case 'zoom':
            handleZoomClick(event.e);
            break;
        case 'hand':
            canvas.defaultCursor = 'grabbing';
            break;
    }
}

function handleMouseMove(event) {
    if (!isDrawing) return;
    
    const pointer = canvas.getPointer(event.e);
    
    switch (currentTool) {
        case 'rect':
            updateDrawingRect(pointer);
            break;
        case 'circle':
            updateDrawingCircle(pointer);
            break;
        case 'line':
            updateDrawingLine(pointer);
            break;
    }
}

function handleMouseUp(event) {
    isDrawing = false;
    
    switch (currentTool) {
        case 'rect':
        case 'circle':
        case 'line':
            finishDrawingShape();
            break;
        case 'hand':
            canvas.defaultCursor = 'grab';
            break;
    }
}

// ===== SHAPE DRAWING =====
let startPoint = null;
let currentShape = null;

function startDrawingRect(pointer) {
    startPoint = pointer;
    currentShape = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: currentColor,
        strokeWidth: 2
    });
    canvas.add(currentShape);
}

function updateDrawingRect(pointer) {
    if (!currentShape || !startPoint) return;
    
    const width = Math.abs(pointer.x - startPoint.x);
    const height = Math.abs(pointer.y - startPoint.y);
    const left = Math.min(pointer.x, startPoint.x);
    const top = Math.min(pointer.y, startPoint.y);
    
    currentShape.set({
        left: left,
        top: top,
        width: width,
        height: height
    });
    
    canvas.renderAll();
}

function startDrawingCircle(pointer) {
    startPoint = pointer;
    currentShape = new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 0,
        fill: 'transparent',
        stroke: currentColor,
        strokeWidth: 2
    });
    canvas.add(currentShape);
}

function updateDrawingCircle(pointer) {
    if (!currentShape || !startPoint) return;
    
    const radius = Math.sqrt(
        Math.pow(pointer.x - startPoint.x, 2) + 
        Math.pow(pointer.y - startPoint.y, 2)
    ) / 2;
    
    currentShape.set({
        radius: radius,
        left: startPoint.x - radius,
        top: startPoint.y - radius
    });
    
    canvas.renderAll();
}

function startDrawingLine(pointer) {
    startPoint = pointer;
    currentShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: currentColor,
        strokeWidth: 2
    });
    canvas.add(currentShape);
}

function updateDrawingLine(pointer) {
    if (!currentShape || !startPoint) return;
    
    currentShape.set({
        x2: pointer.x,
        y2: pointer.y
    });
    
    canvas.renderAll();
}

function finishDrawingShape() {
    if (currentShape) {
        canvas.setActiveObject(currentShape);
        saveCanvasState();
        currentShape = null;
        startPoint = null;
    }
}

// ===== TEXT HANDLING =====
function addText(pointer) {
    const text = new fabric.IText('Click to edit text', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Inter',
        fontSize: 24,
        fill: currentColor
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    saveCanvasState();
}

function addRectangleAtPosition(x, y) {
    const rect = new fabric.Rect({
        left: x - 50,
        top: y - 25,
        width: 100,
        height: 50,
        fill: 'transparent',
        stroke: currentColor,
        strokeWidth: 2
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    saveCanvasState();
}

function addEllipseAtPosition(x, y) {
    const ellipse = new fabric.Ellipse({
        left: x,
        top: y,
        rx: 50,
        ry: 25,
        fill: 'transparent',
        stroke: currentColor,
        strokeWidth: 2
    });
    
    canvas.add(ellipse);
    canvas.setActiveObject(ellipse);
    saveCanvasState();
}

// ===== OBJECT SELECTION HANDLING =====
function handleObjectSelection(event) {
    selectedObject = event.selected ? event.selected[0] : event.target;
    updatePropertiesPanel();
}

function handleObjectDeselection() {
    selectedObject = null;
    updatePropertiesPanel();
}

// ===== PROPERTIES PANEL =====
function updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel-content');
    const placeholder = document.getElementById('properties-panel-placeholder');
    
    if (!selectedObject) {
        panel.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }
    
    panel.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Clear existing properties
    panel.innerHTML = '';
    
    // Add common properties
    addPropertyGroup(panel, 'Position & Size', [
        { label: 'X', type: 'number', value: Math.round(selectedObject.left), property: 'left' },
        { label: 'Y', type: 'number', value: Math.round(selectedObject.top), property: 'top' },
        { label: 'Width', type: 'number', value: Math.round(selectedObject.width * selectedObject.scaleX), property: 'width' },
        { label: 'Height', type: 'number', value: Math.round(selectedObject.height * selectedObject.scaleY), property: 'height' }
    ]);
    
    addPropertyGroup(panel, 'Transform', [
        { label: 'Rotation', type: 'number', value: Math.round(selectedObject.angle), property: 'angle', min: -180, max: 180 },
        { label: 'Opacity', type: 'range', value: selectedObject.opacity, property: 'opacity', min: 0, max: 1, step: 0.1 }
    ]);
    
    // Add object-specific properties
    if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
        addTextProperties(panel);
    } else if (selectedObject.type === 'rect' || selectedObject.type === 'circle') {
        addShapeProperties(panel);
    } else if (selectedObject.type === 'image') {
        addImageProperties(panel);
    }
}

function addPropertyGroup(panel, title, properties) {
    const group = document.createElement('div');
    group.className = 'prop-group';
    
    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    titleEl.style.marginBottom = '12px';
    titleEl.style.color = 'var(--text-secondary)';
    titleEl.style.fontSize = '14px';
    titleEl.style.fontWeight = '600';
    group.appendChild(titleEl);
    
    properties.forEach(prop => {
        const propDiv = document.createElement('div');
        propDiv.className = 'prop-group';
        
        const label = document.createElement('label');
        label.textContent = prop.label;
        propDiv.appendChild(label);
        
        const input = document.createElement('input');
        input.type = prop.type;
        input.value = prop.value;
        if (prop.min !== undefined) input.min = prop.min;
        if (prop.max !== undefined) input.max = prop.max;
        if (prop.step !== undefined) input.step = prop.step;
        
        input.addEventListener('input', function() {
            updateObjectProperty(prop.property, this.value, prop.type);
        });
        
        propDiv.appendChild(input);
        group.appendChild(propDiv);
    });
    
    panel.appendChild(group);
}

function addTextProperties(panel) {
    addPropertyGroup(panel, 'Text', [
        { label: 'Font Size', type: 'number', value: selectedObject.fontSize, property: 'fontSize', min: 8, max: 200 },
        { label: 'Font Weight', type: 'select', value: selectedObject.fontWeight, property: 'fontWeight', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] }
    ]);
    
    // Add color picker for text
    const colorGroup = document.createElement('div');
    colorGroup.className = 'prop-group';
    
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Text Color';
    colorGroup.appendChild(colorLabel);
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = selectedObject.fill;
    colorInput.addEventListener('change', function() {
        updateObjectProperty('fill', this.value);
    });
    colorGroup.appendChild(colorInput);
    
    panel.appendChild(colorGroup);
}

function addShapeProperties(panel) {
    const fillGroup = document.createElement('div');
    fillGroup.className = 'prop-group';
    
    const fillLabel = document.createElement('label');
    fillLabel.textContent = 'Fill Color';
    fillGroup.appendChild(fillLabel);
    
    const fillInput = document.createElement('input');
    fillInput.type = 'color';
    fillInput.value = selectedObject.fill || '#ffffff';
    fillInput.addEventListener('change', function() {
        updateObjectProperty('fill', this.value);
    });
    fillGroup.appendChild(fillInput);
    
    const strokeGroup = document.createElement('div');
    strokeGroup.className = 'prop-group';
    
    const strokeLabel = document.createElement('label');
    strokeLabel.textContent = 'Stroke Color';
    strokeGroup.appendChild(strokeLabel);
    
    const strokeInput = document.createElement('input');
    strokeInput.type = 'color';
    strokeInput.value = selectedObject.stroke || '#000000';
    strokeInput.addEventListener('change', function() {
        updateObjectProperty('stroke', this.value);
    });
    strokeGroup.appendChild(strokeInput);
    
    panel.appendChild(fillGroup);
    panel.appendChild(strokeGroup);
    
    addPropertyGroup(panel, 'Stroke', [
        { label: 'Stroke Width', type: 'number', value: selectedObject.strokeWidth || 0, property: 'strokeWidth', min: 0, max: 50 }
    ]);
}

function addImageProperties(panel) {
    addPropertyGroup(panel, 'Image', [
        { label: 'Brightness', type: 'range', value: 0, property: 'brightness', min: -1, max: 1, step: 0.1 },
        { label: 'Contrast', type: 'range', value: 0, property: 'contrast', min: -1, max: 1, step: 0.1 },
        { label: 'Saturation', type: 'range', value: 0, property: 'saturation', min: -1, max: 1, step: 0.1 }
    ]);
}

function updateObjectProperty(property, value, type = 'text') {
    if (!selectedObject) return;
    
    let processedValue = value;
    
    if (type === 'number') {
        processedValue = parseFloat(value);
    } else if (type === 'range') {
        processedValue = parseFloat(value);
    }
    
    // Handle special cases
    if (property === 'width' || property === 'height') {
        const currentScale = property === 'width' ? selectedObject.scaleX : selectedObject.scaleY;
        const originalDimension = property === 'width' ? selectedObject.width : selectedObject.height;
        const newScale = processedValue / originalDimension;
        
        if (property === 'width') {
            selectedObject.set('scaleX', newScale);
        } else {
            selectedObject.set('scaleY', newScale);
        }
    } else {
        selectedObject.set(property, processedValue);
    }
    
    canvas.renderAll();
    saveCanvasState();
}

// ===== LAYERS MANAGEMENT =====
function addNewLayer(name = null) {
    const layerName = name || `Layer ${layers.length + 1}`;
    const layer = {
        id: Date.now(),
        name: layerName,
        visible: true,
        locked: false,
        objects: []
    };
    
    layers.push(layer);
    currentLayer = layer;
    
    updateLayersPanel();
    saveCanvasState();
}

function updateLayersPanel() {
    const layersList = document.getElementById('layers-list');
    layersList.innerHTML = '';
    
    layers.slice().reverse().forEach((layer, index) => {
        const layerItem = document.createElement('li');
        layerItem.className = 'layer-item';
        layerItem.dataset.layerId = layer.id;
        
        if (layer === currentLayer) {
            layerItem.classList.add('selected');
        }
        
        layerItem.innerHTML = `
            <div class="layer-name">
                <i class="fas fa-layer-group"></i>
                <span>${layer.name}</span>
            </div>
            <div class="layer-controls">
                <button class="layer-visibility-btn" title="${layer.visible ? 'Hide' : 'Show'}">
                    <i class="fas fa-${layer.visible ? 'eye' : 'eye-slash'}"></i>
                </button>
                <button class="layer-lock-btn" title="${layer.locked ? 'Unlock' : 'Lock'}">
                    <i class="fas fa-${layer.locked ? 'lock' : 'unlock'}"></i>
                </button>
            </div>
        `;
        
        // Layer selection
        layerItem.addEventListener('click', function(e) {
            if (e.target.closest('.layer-controls')) return;
            selectLayer(layer);
        });
        
        // Visibility toggle
        layerItem.querySelector('.layer-visibility-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            toggleLayerVisibility(layer);
        });
        
        // Lock toggle
        layerItem.querySelector('.layer-lock-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            toggleLayerLock(layer);
        });
        
        layersList.appendChild(layerItem);
    });
}

function selectLayer(layer) {
    currentLayer = layer;
    updateLayersPanel();
}

function toggleLayerVisibility(layer) {
    layer.visible = !layer.visible;
    updateLayersPanel();
    // TODO: Implement actual visibility toggle for objects
}

function toggleLayerLock(layer) {
    layer.locked = !layer.locked;
    updateLayersPanel();
    // TODO: Implement actual lock functionality for objects
}

function moveLayerUp() {
    if (!currentLayer) return;
    
    const index = layers.indexOf(currentLayer);
    if (index < layers.length - 1) {
        [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
        updateLayersPanel();
        saveCanvasState();
    }
}

function moveLayerDown() {
    if (!currentLayer) return;
    
    const index = layers.indexOf(currentLayer);
    if (index > 0) {
        [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
        updateLayersPanel();
        saveCanvasState();
    }
}

function duplicateLayer() {
    if (!currentLayer) return;
    
    const newLayer = {
        id: Date.now(),
        name: `${currentLayer.name} Copy`,
        visible: true,
        locked: false,
        objects: [...currentLayer.objects]
    };
    
    const index = layers.indexOf(currentLayer);
    layers.splice(index + 1, 0, newLayer);
    currentLayer = newLayer;
    
    updateLayersPanel();
    saveCanvasState();
}

function deleteLayer() {
    if (!currentLayer || layers.length <= 1) return;
    
    const index = layers.indexOf(currentLayer);
    layers.splice(index, 1);
    
    // Select previous layer or first layer
    currentLayer = layers[Math.max(0, index - 1)];
    
    updateLayersPanel();
    saveCanvasState();
}

// ===== HISTORY MANAGEMENT =====
function saveCanvasState() {
    const state = JSON.stringify(canvas.toJSON());
    
    // Remove any states after current step
    history = history.slice(0, historyStep + 1);
    
    // Add new state
    history.push(state);
    historyStep++;
    
    // Limit history size
    if (history.length > 50) {
        history.shift();
        historyStep--;
    }
    
    updateHistoryPanel();
    updateUndoRedoButtons();
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        const state = history[historyStep];
        canvas.loadFromJSON(state, function() {
            canvas.renderAll();
            updateHistoryPanel();
            updateUndoRedoButtons();
        });
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        const state = history[historyStep];
        canvas.loadFromJSON(state, function() {
            canvas.renderAll();
            updateHistoryPanel();
            updateUndoRedoButtons();
        });
    }
}

function updateHistoryPanel() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    history.forEach((state, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        if (index === historyStep) {
            historyItem.classList.add('current');
        }
        
        historyItem.innerHTML = `
            <i class="fas fa-history"></i>
            <span>Step ${index + 1}</span>
        `;
        
        historyItem.addEventListener('click', function() {
            historyStep = index;
            canvas.loadFromJSON(state, function() {
                canvas.renderAll();
                updateHistoryPanel();
                updateUndoRedoButtons();
            });
        });
        
        historyList.appendChild(historyItem);
    });
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    undoBtn.disabled = historyStep <= 0;
    redoBtn.disabled = historyStep >= history.length - 1;
}

// ===== AI PANEL =====
function toggleAIPanel() {
    const aiPanel = document.getElementById('ai-panel');
    const aiBtn = document.getElementById('ai-toggle-btn');
    const mainLayout = document.querySelector('.main-layout');
    
    const isActive = aiPanel.classList.contains('active');
    
    if (isActive) {
        aiPanel.classList.remove('active');
        aiBtn.classList.remove('active');
        mainLayout.classList.remove('ai-active');
    } else {
        aiPanel.classList.add('active');
        aiBtn.classList.add('active');
        mainLayout.classList.add('ai-active');
    }
}

function closeAIPanel() {
    const aiPanel = document.getElementById('ai-panel');
    const aiBtn = document.getElementById('ai-toggle-btn');
    const mainLayout = document.querySelector('.main-layout');
    
    aiPanel.classList.remove('active');
    aiBtn.classList.remove('active');
    mainLayout.classList.remove('ai-active');
}

function generateAIImage() {
    const prompt = document.getElementById('ai-prompt').value;
    const negativePrompt = document.getElementById('ai-negative-prompt').value;
    const model = document.getElementById('ai-model').value;
    const style = document.getElementById('ai-style-preset').value;
    const aspectRatio = document.getElementById('ai-aspect-ratio').value;
    const quality = document.getElementById('ai-quality').value;
    
    if (!prompt.trim()) {
        showAlert('Please enter a prompt to generate an image.');
        return;
    }
    
    // Show loading state
    const generateBtn = document.getElementById('generate-ai-image-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Generating...</span>';
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    
    // Simulate AI generation (replace with actual API call)
    setTimeout(() => {
        // Generate a placeholder image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions based on aspect ratio
        let width = 512, height = 512;
        switch (aspectRatio) {
            case '16:9':
                width = 512; height = 288;
                break;
            case '9:16':
                width = 288; height = 512;
                break;
            case '4:3':
                width = 512; height = 384;
                break;
            case '3:2':
                width = 512; height = 341;
                break;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#800080');
        gradient.addColorStop(0.5, '#ba55d3');
        gradient.addColorStop(1, '#da70d6');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add some text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('AI Generated', width / 2, height / 2 - 10);
        ctx.font = '16px Inter';
        ctx.fillText('Sample Image', width / 2, height / 2 + 20);
        
        const dataURL = canvas.toDataURL();
        
        // Show result
        const aiResult = document.getElementById('ai-result');
        const aiImage = document.getElementById('ai-generated-image');
        
        aiImage.src = dataURL;
        aiResult.style.display = 'block';
        
        // Reset button
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
        
    }, 2000);
}

function regenerateAIImage() {
    generateAIImage();
}

function addAIImageToCanvas() {
    const aiImage = document.getElementById('ai-generated-image');
    
    if (aiImage.src) {
        fabric.Image.fromURL(aiImage.src, function(img) {
            img.set({
                left: canvas.width / 2 - img.width / 2,
                top: canvas.height / 2 - img.height / 2
            });
            
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveCanvasState();
        });
        
        // Hide AI result
        document.getElementById('ai-result').style.display = 'none';
    }
}

// ===== CANVAS CONTROLS =====
function toggleGrid() {
    const grid = document.getElementById('canvas-grid');
    const btn = document.getElementById('grid-toggle');
    
    gridVisible = !gridVisible;
    
    if (gridVisible) {
        grid.classList.add('active');
        btn.classList.add('active');
    } else {
        grid.classList.remove('active');
        btn.classList.remove('active');
    }
}

function toggleRulers() {
    const rulers = document.getElementById('canvas-rulers');
    const btn = document.getElementById('rulers-toggle');
    
    rulersVisible = !rulersVisible;
    
    if (rulersVisible) {
        rulers.classList.add('active');
        btn.classList.add('active');
    } else {
        rulers.classList.remove('active');
        btn.classList.remove('active');
    }
}

function fitToScreen() {
    const container = document.getElementById('canvas-container');
    const canvasElement = document.getElementById('main-canvas');
    const containerRect = container.getBoundingClientRect();
    
    const scaleX = (containerRect.width - 80) / canvasElement.width;
    const scaleY = (containerRect.height - 80) / canvasElement.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    canvasElement.style.transform = `scale(${scale})`;
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-level');
    if (zoomDisplay) {
        zoomDisplay.innerText = `${Math.round(scale * 100)}%`;
    }
    
    zoomLevel = Math.round(scale * 100);
}

// ===== ZOOM CONTROLS =====
function zoomIn() {
    const newZoom = Math.min(zoomLevel + 10, 300);
    setZoom(newZoom);
}

function zoomOut() {
    const newZoom = Math.max(zoomLevel - 10, 10);
    setZoom(newZoom);
}

function setZoom(zoom) {
    zoomLevel = zoom;
    const scale = zoom / 100;
    
    const canvasElement = document.getElementById('main-canvas');
    canvasElement.style.transform = `scale(${scale})`;
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-level');
    if (zoomDisplay) {
        zoomDisplay.innerText = `${zoom}%`;
    }
    
    // Update zoom slider
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
        zoomSlider.value = zoom;
    }
}

function handleZoomClick(event) {
    if (event.shiftKey) {
        zoomOut();
    } else {
        zoomIn();
    }
}

// ===== COLOR HANDLING =====
function handleColorChange(event) {
    currentColor = event.target.value;
    
    // Update color preview
    document.getElementById('color-current').style.background = currentColor;
    
    // Update selected object color if applicable
    if (selectedObject) {
        if (selectedObject.type === 'i-text' || selectedObject.type === 'text') {
            selectedObject.set('fill', currentColor);
        } else {
            selectedObject.set('stroke', currentColor);
        }
        canvas.renderAll();
        saveCanvasState();
    }
    
    // Update brush color
    if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = currentColor;
    }
    
    // Add to recent colors
    addToRecentColors(currentColor);
}

function addToRecentColors(color) {
    const recentColors = document.getElementById('recent-colors');
    
    // Check if color already exists
    const existing = recentColors.querySelector(`[data-color="${color}"]`);
    if (existing) return;
    
    // Create new swatch
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    swatch.dataset.color = color;
    
    swatch.addEventListener('click', function() {
        document.getElementById('color-picker').value = color;
        handleColorChange({ target: { value: color } });
    });
    
    // Add to beginning
    recentColors.insertBefore(swatch, recentColors.firstChild);
    
    // Limit to 8 recent colors
    while (recentColors.children.length > 8) {
        recentColors.removeChild(recentColors.lastChild);
    }
}

// Setup color swatches
document.querySelectorAll('.color-swatch[data-color]').forEach(swatch => {
    swatch.addEventListener('click', function() {
        const color = this.dataset.color;
        document.getElementById('color-picker').value = color;
        handleColorChange({ target: { value: color } });
    });
});

// ===== IMAGE UPLOAD =====
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        fabric.Image.fromURL(e.target.result, function(img) {
            // Scale image to fit canvas if too large
            const maxWidth = canvas.width * 0.8;
            const maxHeight = canvas.height * 0.8;
            
            if (img.width > maxWidth || img.height > maxHeight) {
                const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                img.scale(scale);
            }
            
            // Center the image
            img.set({
                left: canvas.width / 2 - (img.width * img.scaleX) / 2,
                top: canvas.height / 2 - (img.height * img.scaleY) / 2
            });
            
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveCanvasState();
        });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
}

// ===== CROP FUNCTIONALITY =====
function startCrop() {
    if (!selectedObject || selectedObject.type !== 'image') {
        showAlert('Please select an image to crop.');
        return;
    }
    
    cropMode = true;
    canvas.selection = false;
    
    // Create crop rectangle
    cropRect = new fabric.Rect({
        left: selectedObject.left,
        top: selectedObject.top,
        width: selectedObject.width * selectedObject.scaleX,
        height: selectedObject.height * selectedObject.scaleY,
        fill: 'transparent',
        stroke: '#800080',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: true,
        evented: true
    });
    
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    
    // Show crop actions
    document.getElementById('crop-actions').style.display = 'flex';
}

function applyCrop() {
    if (!cropMode || !cropRect || !selectedObject) return;
    
    // TODO: Implement actual cropping logic
    // This would involve creating a new image with the cropped dimensions
    
    cancelCrop();
    showAlert('Crop functionality will be implemented in a future update.');
}

function cancelCrop() {
    if (cropRect) {
        canvas.remove(cropRect);
        cropRect = null;
    }
    
    cropMode = false;
    canvas.selection = true;
    document.getElementById('crop-actions').style.display = 'none';
}

// ===== OBJECT OPERATIONS =====
function cutObject() {
    if (selectedObject) {
        copyObject();
        deleteObject();
    }
}

function copyObject() {
    if (selectedObject) {
        selectedObject.clone(function(cloned) {
            clipboard = cloned;
        });
    }
}

function pasteObject() {
    if (clipboard) {
        clipboard.clone(function(cloned) {
            cloned.set({
                left: cloned.left + 10,
                top: cloned.top + 10,
                evented: true
            });
            
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
            saveCanvasState();
        });
    }
}

function duplicateObject() {
    if (selectedObject) {
        selectedObject.clone(function(cloned) {
            cloned.set({
                left: cloned.left + 10,
                top: cloned.top + 10,
                evented: true
            });
            
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
            saveCanvasState();
        });
    }
}

function deleteObject() {
    if (selectedObject) {
        canvas.remove(selectedObject);
        selectedObject = null;
        updatePropertiesPanel();
        saveCanvasState();
    }
}

function selectAll() {
    const objects = canvas.getObjects();
    if (objects.length > 0) {
        canvas.discardActiveObject();
        const selection = new fabric.ActiveSelection(objects, {
            canvas: canvas
        });
        canvas.setActiveObject(selection);
        canvas.renderAll();
    }
}

function deselectAll() {
    canvas.discardActiveObject();
    canvas.renderAll();
}

// ===== TRANSFORM OPERATIONS =====
function rotateImage() {
    if (selectedObject) {
        selectedObject.set('angle', selectedObject.angle + 90);
        canvas.renderAll();
        saveCanvasState();
    }
}

function flipHorizontal() {
    if (selectedObject) {
        selectedObject.set('flipX', !selectedObject.flipX);
        canvas.renderAll();
        saveCanvasState();
    }
}

function flipVertical() {
    if (selectedObject) {
        selectedObject.set('flipY', !selectedObject.flipY);
        canvas.renderAll();
        saveCanvasState();
    }
}

// ===== EFFECTS =====
function applyEffect(effect) {
    if (!selectedObject || selectedObject.type !== 'image') {
        showAlert('Please select an image to apply effects.');
        return;
    }
    
    // TODO: Implement actual image effects
    // This would require fabric.js filters or custom image processing
    
    switch (effect) {
        case 'blur':
            showAlert('Blur effect will be implemented in a future update.');
            break;
        case 'sharpen':
            showAlert('Sharpen effect will be implemented in a future update.');
            break;
        case 'brightness':
            showAlert('Brightness effect will be implemented in a future update.');
            break;
        case 'contrast':
            showAlert('Contrast effect will be implemented in a future update.');
            break;
        case 'grayscale':
            showAlert('Grayscale effect will be implemented in a future update.');
            break;
        case 'sepia':
            showAlert('Sepia effect will be implemented in a future update.');
            break;
        case 'invert':
            showAlert('Invert effect will be implemented in a future update.');
            break;
    }
}

// ===== EXPORT FUNCTIONALITY =====
function showExportOptions() {
    // Create a simple export menu
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-xl);
        padding: var(--spacing-xl);
        box-shadow: var(--shadow-xl);
        z-index: var(--z-modal);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        min-width: 200px;
    `;
    
    menu.innerHTML = `
        <h3 style="margin: 0; color: var(--text-primary); text-align: center; margin-bottom: var(--spacing-md);">Export Options</h3>
        <button onclick="exportCanvas('png')" class="primary-btn">
            <i class="fas fa-download"></i>
            <span>Export as PNG</span>
        </button>
        <button onclick="exportCanvas('jpg')" class="primary-btn">
            <i class="fas fa-download"></i>
            <span>Export as JPG</span>
        </button>
        <button onclick="exportCanvas('svg')" class="primary-btn">
            <i class="fas fa-download"></i>
            <span>Export as SVG</span>
        </button>
        <button onclick="this.parentElement.remove()" class="secondary-btn">Cancel</button>
    `;
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
            }
        }, { once: true });
    }, 100);
}

function exportCanvas(format) {
    let dataURL;
    let filename;
    
    switch (format) {
        case 'png':
            dataURL = canvas.toDataURL('image/png');
            filename = 'canvas-export.png';
            break;
        case 'jpg':
            dataURL = canvas.toDataURL('image/jpeg', 0.9);
            filename = 'canvas-export.jpg';
            break;
        case 'svg':
            dataURL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(canvas.toSVG());
            filename = 'canvas-export.svg';
            break;
        default:
            return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.click();
    
    // Remove export menu if it exists
    const exportMenu = document.querySelector('.export-menu');
    if (exportMenu) {
        exportMenu.remove();
    }
}

// ===== PROJECT MANAGEMENT =====
function newProject() {
    if (confirm('Are you sure you want to create a new project? Unsaved changes will be lost.')) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        
        // Reset variables
        layers = [];
        currentLayer = null;
        selectedObject = null;
        history = [];
        historyStep = -1;
        
        // Add default layer
        addNewLayer('Background');
        
        // Update UI
        updateCanvasInfo();
        updatePropertiesPanel();
        updateLayersPanel();
        updateHistoryPanel();
        
        saveCanvasState();
    }
}

function openImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleImageUpload;
    input.click();
}

function saveProject() {
    const projectData = {
        canvas: canvas.toJSON(),
        layers: layers,
        metadata: {
            name: document.getElementById('canvas-name').textContent,
            created: new Date().toISOString(),
            version: '1.0'
        }
    };
    
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'visual-composer-project.json';
    link.click();
}

function resizeCanvas() {
    const width = prompt('Enter new width:', canvas.width);
    const height = prompt('Enter new height:', canvas.height);
    
    if (width && height) {
        canvas.setDimensions({
            width: parseInt(width),
            height: parseInt(height)
        });
        canvas.renderAll();
        updateCanvasInfo();
        saveCanvasState();
    }
}

// ===== UTILITY FUNCTIONS =====
function updateCanvasInfo() {
    document.getElementById('canvas-dimensions').textContent = `${canvas.width} × ${canvas.height}`;
}

function showAlert(message) {
    const modal = document.getElementById('custom-alert-modal');
    const messageEl = document.getElementById('custom-alert-message');
    
    messageEl.innerHTML = message;
    modal.classList.add('active');
    
    document.getElementById('custom-alert-ok-btn').onclick = function() {
        modal.classList.remove('active');
    };
}

function showConfirm(title, message, callback) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add('active');
    
    document.getElementById('confirm-ok-btn').onclick = function() {
        modal.classList.remove('active');
        callback(true);
    };
    
    document.getElementById('confirm-cancel-btn').onclick = function() {
        modal.classList.remove('active');
        callback(false);
    };
}

// ===== PANELS SETUP =====
function setupPanels() {
    updateLayersPanel();
    updatePropertiesPanel();
    updateHistoryPanel();
}

function setupCollapsiblePanels() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function() {
            const panel = this.closest('.collapsible-panel');
            panel.classList.toggle('collapsed');
        });
    });
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Prevent default for our shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 'c':
                    e.preventDefault();
                    copyObject();
                    break;
                case 'v':
                    e.preventDefault();
                    pasteObject();
                    break;
                case 'x':
                    e.preventDefault();
                    cutObject();
                    break;
                case 'd':
                    e.preventDefault();
                    duplicateObject();
                    break;
                case 'a':
                    e.preventDefault();
                    selectAll();
                    break;
                case 's':
                    e.preventDefault();
                    saveProject();
                    break;
                case 'n':
                    e.preventDefault();
                    newProject();
                    break;
            }
        }
        
        // Tool shortcuts
        switch (e.key.toLowerCase()) {
            case 'v':
                if (!e.ctrlKey && !e.metaKey) {
                    selectTool('select');
                }
                break;
            case 'b':
                selectTool('brush');
                break;
            case 'e':
                selectTool('eraser');
                break;
            case 't':
                selectTool('text');
                break;
            case 'h':
                selectTool('hand');
                break;
            case 'z':
                if (!e.ctrlKey && !e.metaKey) {
                    selectTool('zoom');
                }
                break;
            case 'delete':
            case 'backspace':
                if (selectedObject) {
                    deleteObject();
                }
                break;
            case 'escape':
                deselectAll();
                break;
        }
    });
}

function selectTool(tool) {
    // Find and click the tool button
    const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
    if (toolBtn) {
        toolBtn.click();
    }
}

// ===== THEME MANAGEMENT =====
function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

// ===== MOBILE INTERFACE =====
function setupMobileInterface() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle-btn');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    
    // Copy desktop navigation to mobile
    const desktopNav = document.getElementById('desktop-nav');
    if (desktopNav) {
        mobileNavContent.innerHTML = desktopNav.innerHTML;
    }
    
    // Mobile menu toggle
    mobileMenuToggle?.addEventListener('click', function() {
        mobileMenuOverlay.classList.add('open');
    });
    
    // Close mobile menu
    mobileMenuOverlay.querySelector('.close-btn')?.addEventListener('click', function() {
        mobileMenuOverlay.classList.remove('open');
    });
    
    // Mobile panel toggles with toggle functionality
    document.querySelectorAll('.mobile-panel-btn[data-panel-target]').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetPanel = this.dataset.panelTarget;
            toggleMobilePanel(targetPanel, this);
        });
    });
    
    // Mobile export button
    document.getElementById('mobile-export-btn')?.addEventListener('click', showExportOptions);
}

function toggleMobilePanel(panelTarget, button) {
    const panel = document.querySelector(`.${panelTarget}`) || document.getElementById(panelTarget);
    
    // Check if this panel is currently active
    const isCurrentlyActive = mobilePanelStates[panelTarget];
    
    // Close all panels first
    Object.keys(mobilePanelStates).forEach(key => {
        mobilePanelStates[key] = false;
        const p = document.querySelector(`.${key}`) || document.getElementById(key);
        if (p) {
            p.classList.remove('mobile-active');
        }
    });
    
    // Remove active class from all mobile buttons
    document.querySelectorAll('.mobile-panel-btn').forEach(b => {
        b.classList.remove('active');
    });
    
    // If the panel wasn't active, open it
    if (!isCurrentlyActive && panel) {
        mobilePanelStates[panelTarget] = true;
        panel.classList.add('mobile-active');
        button.classList.add('active');
        
        // For right panels, show the specific panel
        if (panelTarget !== 'tools-panel' && panelTarget !== 'ai-panel') {
            const rightPanels = document.querySelector('.right-panels');
            if (rightPanels) {
                rightPanels.classList.add('mobile-active');
            }
        }
    }
}

// ===== RIPPLE EFFECTS =====
function addRippleEffects() {
    document.querySelectorAll('.primary-btn, .secondary-btn, .tool-btn, .action-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// ===== HELP FUNCTIONS =====
function showKeyboardShortcuts() {
    const shortcuts = `
        <div style="text-align: left; max-width: 600px;">
            <h3 style="text-align: center; margin-bottom: 24px;">Keyboard Shortcuts</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div>
                    <h4 style="color: var(--primary-color); margin-bottom: 12px;">General</h4>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+Z</kbd> - Undo</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+Y</kbd> - Redo</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+S</kbd> - Save Project</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+N</kbd> - New Project</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Delete</kbd> - Delete Selected</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Escape</kbd> - Deselect All</p>
                </div>
                <div>
                    <h4 style="color: var(--primary-color); margin-bottom: 12px;">Tools</h4>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">V</kbd> - Select Tool</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">B</kbd> - Brush Tool</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">E</kbd> - Eraser Tool</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">T</kbd> - Text Tool</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">H</kbd> - Hand Tool</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Z</kbd> - Zoom Tool</p>
                </div>
                <div>
                    <h4 style="color: var(--primary-color); margin-bottom: 12px;">Edit</h4>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+C</kbd> - Copy</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+V</kbd> - Paste</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+X</kbd> - Cut</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+D</kbd> - Duplicate</p>
                    <p><kbd style="background: var(--background-light); padding: 2px 6px; border-radius: 4px;">Ctrl+A</kbd> - Select All</p>
                </div>
            </div>
        </div>
    `;
    
    showAlert(shortcuts);
}

function showDocumentation() {
    showAlert('Documentation will be available in a future update. Visit our website for more information.');
}

function showSharePrompt() {
    const modal = document.getElementById('share-prompt-modal');
    const promptText = document.getElementById('share-prompt-text');
    
    // Generate a sample prompt based on current canvas
    const prompt = generateCanvasPrompt();
    promptText.value = prompt;
    
    modal.classList.add('active');
    
    // Copy to clipboard
    document.getElementById('copy-prompt-btn').onclick = function() {
        promptText.select();
        document.execCommand('copy');
        showAlert('Prompt copied to clipboard!');
    };
    
    // Download as text
    document.getElementById('download-prompt-btn').onclick = function() {
        const blob = new Blob([prompt], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ai-prompt.txt';
        link.click();
    };
    
    // Close modal
    document.getElementById('share-close-btn').onclick = function() {
        modal.classList.remove('active');
    };
}

function generateCanvasPrompt() {
    const objects = canvas.getObjects();
    let prompt = 'Create a digital artwork with the following elements:\n\n';
    
    objects.forEach((obj, index) => {
        switch (obj.type) {
            case 'rect':
                prompt += `- Rectangle shape with ${obj.fill} fill color\n`;
                break;
            case 'circle':
                prompt += `- Circle shape with ${obj.fill} fill color\n`;
                break;
            case 'i-text':
            case 'text':
                prompt += `- Text element saying "${obj.text}" in ${obj.fontFamily} font\n`;
                break;
            case 'image':
                prompt += `- Image element positioned at coordinates (${Math.round(obj.left)}, ${Math.round(obj.top)})\n`;
                break;
            case 'path':
                prompt += `- Hand-drawn path or brush stroke\n`;
                break;
        }
    });
    
    prompt += `\nCanvas dimensions: ${canvas.width} × ${canvas.height} pixels`;
    prompt += `\nBackground color: ${canvas.backgroundColor}`;
    prompt += '\n\nStyle: Professional, clean design with modern aesthetics';
    
    return prompt;
}

function showAbout() {
    const aboutText = `
        <div style="text-align: center; max-width: 500px;">
            <h3 style="color: var(--primary-color); margin-bottom: 16px;">Visual Composer Pro</h3>
            <p style="margin-bottom: 8px;"><strong>Version 2.0.0</strong></p>
            <p style="margin-bottom: 24px;">A professional visual design editor with AI generation capabilities.</p>
            
            <div style="text-align: left; margin: 24px 0;">
                <h4 style="color: var(--primary-color); margin-bottom: 12px;">Features:</h4>
                <ul style="margin-left: 20px; line-height: 1.8;">
                    <li>Advanced drawing and design tools</li>
                    <li>Layer management system</li>
                    <li>AI-powered image generation</li>
                    <li>Professional export options</li>
                    <li>Responsive mobile interface</li>
                    <li>Comprehensive keyboard shortcuts</li>
                    <li>Touch and gesture support</li>
                    <li>Real-time collaboration ready</li>
                </ul>
            </div>
            
            <p style="margin-top: 24px; color: var(--text-secondary);">Built with Fabric.js and modern web technologies.</p>
        </div>
    `;
    
    showAlert(aboutText);
}

// Initialize the application
console.log('Visual Composer Pro script loaded successfully');
