// Visual Composer Pro - Enhanced JavaScript
class VisualComposerPro {
    constructor() {
        this.canvas = null;
        this.fabricCanvas = null;
        this.currentTool = 'select';
        this.currentColor = '#800080';
        this.previousColor = '#800080';
        this.layers = [];
        this.currentLayer = null;
        this.history = [];
        this.historyIndex = -1;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.recentColors = [];
        this.isGridVisible = false;
        this.areRulersVisible = false;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.selectedObject = null;
        this.cropMode = false;
        this.cropRect = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupTools();
        this.setupLayers();
        this.setupColorPicker();
        this.setupHistory();
        this.setupAI();
        this.setupZoomAndPan();
        this.setupMobileSupport();
        this.setupKeyboardShortcuts();
        this.initializeDefaultLayer();
    }

    setupCanvas() {
        const canvasElement = document.getElementById('main-canvas');
        this.fabricCanvas = new fabric.Canvas('main-canvas', {
            width: this.canvasWidth,
            height: this.canvasHeight,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true
        });

        // Enable high DPI support
        const ratio = window.devicePixelRatio || 1;
        this.fabricCanvas.setDimensions({
            width: this.canvasWidth * ratio,
            height: this.canvasHeight * ratio
        }, { cssOnly: false });
        this.fabricCanvas.setZoom(ratio);

        this.canvas = canvasElement;
        this.updateCanvasInfo();
    }

    setupZoomAndPan() {
        const container = document.getElementById('canvas-container');
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomLevel = document.getElementById('zoom-level');

        // Mouse wheel zoom
        this.fabricCanvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.fabricCanvas.getZoom();
            zoom *= 0.999 ** delta;
            
            if (zoom > 20) zoom = 20;
            if (zoom < 0.01) zoom = 0.01;
            
            const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
            this.fabricCanvas.zoomToPoint(point, zoom);
            
            this.zoom = zoom;
            zoomSlider.value = Math.round(zoom * 100);
            zoomLevel.textContent = Math.round(zoom * 100) + '%';
            
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // Pan functionality
        this.fabricCanvas.on('mouse:down', (opt) => {
            const evt = opt.e;
            if (this.currentTool === 'hand' || (evt.altKey && this.currentTool !== 'text')) {
                this.isPanning = true;
                this.fabricCanvas.isDragging = true;
                this.fabricCanvas.selection = false;
                this.lastPanPoint = { x: evt.clientX, y: evt.clientY };
                this.fabricCanvas.setCursor('grabbing');
            }
        });

        this.fabricCanvas.on('mouse:move', (opt) => {
            if (this.isPanning && this.fabricCanvas.isDragging) {
                const evt = opt.e;
                const vpt = this.fabricCanvas.viewportTransform;
                vpt[4] += evt.clientX - this.lastPanPoint.x;
                vpt[5] += evt.clientY - this.lastPanPoint.y;
                this.fabricCanvas.requestRenderAll();
                this.lastPanPoint = { x: evt.clientX, y: evt.clientY };
            }
        });

        this.fabricCanvas.on('mouse:up', () => {
            if (this.isPanning) {
                this.fabricCanvas.setViewportTransform(this.fabricCanvas.viewportTransform);
                this.fabricCanvas.isDragging = false;
                this.fabricCanvas.selection = true;
                this.isPanning = false;
                if (this.currentTool !== 'hand') {
                    this.fabricCanvas.setCursor('default');
                }
            }
        });

        // Zoom controls
        zoomSlider.addEventListener('input', (e) => {
            const zoomValue = parseInt(e.target.value) / 100;
            this.fabricCanvas.setZoom(zoomValue);
            this.zoom = zoomValue;
            zoomLevel.textContent = e.target.value + '%';
        });

        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('fit-to-screen').addEventListener('click', () => {
            this.fitToScreen();
        });
    }

    zoomIn() {
        let zoom = this.fabricCanvas.getZoom();
        zoom = zoom * 1.1;
        if (zoom > 20) zoom = 20;
        this.fabricCanvas.setZoom(zoom);
        this.updateZoomControls(zoom);
    }

    zoomOut() {
        let zoom = this.fabricCanvas.getZoom();
        zoom = zoom / 1.1;
        if (zoom < 0.01) zoom = 0.01;
        this.fabricCanvas.setZoom(zoom);
        this.updateZoomControls(zoom);
    }

    fitToScreen() {
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.canvasWidth;
        const scaleY = containerHeight / this.canvasHeight;
        const scale = Math.min(scaleX, scaleY);
        
        this.fabricCanvas.setZoom(scale);
        this.fabricCanvas.setViewportTransform([scale, 0, 0, scale, 
            (containerWidth - this.canvasWidth * scale) / 2,
            (containerHeight - this.canvasHeight * scale) / 2
        ]);
        
        this.updateZoomControls(scale);
    }

    updateZoomControls(zoom) {
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomLevel = document.getElementById('zoom-level');
        zoomSlider.value = Math.round(zoom * 100);
        zoomLevel.textContent = Math.round(zoom * 100) + '%';
    }

    setupEventListeners() {
        // Canvas size modal
        this.setupCanvasSizeModal();
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Export functionality
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportCanvas();
        });

        // Mobile export
        document.getElementById('mobile-export-btn').addEventListener('click', () => {
            this.exportCanvas();
        });

        // File menu actions
        document.getElementById('new-project').addEventListener('click', () => {
            this.newProject();
        });

        document.getElementById('open-image').addEventListener('click', () => {
            document.getElementById('image-upload').click();
        });

        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('image-upload-btn').addEventListener('click', () => {
            document.getElementById('image-upload').click();
        });

        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });

        // Grid and rulers
        document.getElementById('grid-toggle').addEventListener('click', () => {
            this.toggleGrid();
        });

        document.getElementById('rulers-toggle').addEventListener('click', () => {
            this.toggleRulers();
        });

        // Mobile panel toggles
        this.setupMobilePanelToggles();

        // Collapsible panels
        this.setupCollapsiblePanels();
    }

    setupCanvasSizeModal() {
        const modal = document.getElementById('canvas-size-modal');
        const createBtn = document.getElementById('create-canvas-btn');
        const templateBtns = document.querySelectorAll('.template-btn');
        const categoryTabs = document.querySelectorAll('.category-tab');
        const templateCategories = document.querySelectorAll('.template-category');

        // Category tab switching
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                
                categoryTabs.forEach(t => t.classList.remove('active'));
                templateCategories.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.querySelector(`[data-category="${category}"].template-category`).classList.add('active');
            });
        });

        // Template selection
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                templateBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                createBtn.disabled = false;
                
                if (btn.dataset.size === 'custom') {
                    document.getElementById('custom-size-inputs').style.display = 'block';
                } else {
                    document.getElementById('custom-size-inputs').style.display = 'none';
                }
            });
        });

        // Create canvas
        createBtn.addEventListener('click', () => {
            const selectedBtn = document.querySelector('.template-btn.selected');
            if (selectedBtn) {
                let size = selectedBtn.dataset.size;
                let name = selectedBtn.dataset.name;
                
                if (size === 'custom') {
                    const width = document.getElementById('custom-width').value;
                    const height = document.getElementById('custom-height').value;
                    size = `${width}x${height}`;
                    name = `Custom ${width}×${height}`;
                }
                
                this.createNewCanvas(size, name);
                modal.classList.remove('active');
            }
        });

        // Close modal on backdrop click
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    createNewCanvas(size, name) {
        const [width, height] = size.split('x').map(Number);
        
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        this.fabricCanvas.setDimensions({
            width: width,
            height: height
        });
        
        this.fabricCanvas.clear();
        this.fabricCanvas.backgroundColor = '#ffffff';
        
        document.getElementById('canvas-name').textContent = name;
        document.getElementById('canvas-dimensions').textContent = `${width} × ${height}`;
        
        this.layers = [];
        this.initializeDefaultLayer();
        this.updateLayersList();
        this.saveState();
        this.fitToScreen();
    }

    setupTools() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                const shape = btn.dataset.shape;
                
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.setTool(tool, shape);
            });
        });
    }

    setTool(tool, shape = null) {
        this.currentTool = tool;
        this.fabricCanvas.isDrawingMode = false;
        this.fabricCanvas.selection = true;
        
        // Reset cursor
        this.fabricCanvas.defaultCursor = 'default';
        this.fabricCanvas.hoverCursor = 'move';
        this.fabricCanvas.moveCursor = 'move';
        
        switch (tool) {
            case 'select':
                this.fabricCanvas.selection = true;
                break;
                
            case 'hand':
                this.fabricCanvas.defaultCursor = 'grab';
                this.fabricCanvas.hoverCursor = 'grab';
                break;
                
            case 'brush':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush.width = 5;
                this.fabricCanvas.freeDrawingBrush.color = this.currentColor;
                break;
                
            case 'eraser':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush = new fabric.EraserBrush(this.fabricCanvas);
                this.fabricCanvas.freeDrawingBrush.width = 10;
                break;
                
            case 'text':
                this.fabricCanvas.defaultCursor = 'text';
                break;
                
            case 'shape':
                this.currentShape = shape;
                this.fabricCanvas.defaultCursor = 'crosshair';
                break;
                
            case 'zoom':
                this.fabricCanvas.defaultCursor = 'zoom-in';
                break;
                
            case 'color-picker':
                this.fabricCanvas.defaultCursor = 'crosshair';
                break;
        }
        
        this.setupToolEvents();
    }

    setupToolEvents() {
        // Remove existing event listeners
        this.fabricCanvas.off('mouse:down');
        this.fabricCanvas.off('mouse:move');
        this.fabricCanvas.off('mouse:up');
        
        // Re-add zoom and pan events
        this.setupZoomAndPan();
        
        // Add tool-specific events
        if (this.currentTool === 'text') {
            this.fabricCanvas.on('mouse:down', (options) => {
                if (!this.isPanning) {
                    this.addText(options.e.offsetX, options.e.offsetY);
                }
            });
        } else if (this.currentTool === 'shape') {
            this.setupShapeDrawing();
        } else if (this.currentTool === 'zoom') {
            this.fabricCanvas.on('mouse:down', (options) => {
                const pointer = this.fabricCanvas.getPointer(options.e);
                if (options.e.shiftKey) {
                    this.zoomOut();
                } else {
                    this.zoomIn();
                }
            });
        } else if (this.currentTool === 'color-picker') {
            this.fabricCanvas.on('mouse:down', (options) => {
                this.pickColor(options.e.offsetX, options.e.offsetY);
            });
        }
    }

    setupShapeDrawing() {
        let isDrawing = false;
        let startPoint = null;
        let shape = null;

        this.fabricCanvas.on('mouse:down', (options) => {
            if (this.isPanning) return;
            
            isDrawing = true;
            const pointer = this.fabricCanvas.getPointer(options.e);
            startPoint = pointer;
            
            // Create shape based on current shape type
            switch (this.currentShape) {
                case 'rect':
                    shape = new fabric.Rect({
                        left: startPoint.x,
                        top: startPoint.y,
                        width: 0,
                        height: 0,
                        fill: 'transparent',
                        stroke: this.currentColor,
                        strokeWidth: 2
                    });
                    break;
                    
                case 'circle':
                    shape = new fabric.Circle({
                        left: startPoint.x,
                        top: startPoint.y,
                        radius: 0,
                        fill: 'transparent',
                        stroke: this.currentColor,
                        strokeWidth: 2
                    });
                    break;
                    
                case 'line':
                    shape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                        stroke: this.currentColor,
                        strokeWidth: 2
                    });
                    break;
            }
            
            if (shape) {
                this.fabricCanvas.add(shape);
            }
        });

        this.fabricCanvas.on('mouse:move', (options) => {
            if (!isDrawing || !shape) return;
            
            const pointer = this.fabricCanvas.getPointer(options.e);
            
            switch (this.currentShape) {
                case 'rect':
                    const width = pointer.x - startPoint.x;
                    const height = pointer.y - startPoint.y;
                    shape.set({
                        width: Math.abs(width),
                        height: Math.abs(height),
                        left: width < 0 ? pointer.x : startPoint.x,
                        top: height < 0 ? pointer.y : startPoint.y
                    });
                    break;
                    
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(pointer.x - startPoint.x, 2) + 
                        Math.pow(pointer.y - startPoint.y, 2)
                    ) / 2;
                    shape.set({ radius: radius });
                    break;
                    
                case 'line':
                    shape.set({
                        x2: pointer.x,
                        y2: pointer.y
                    });
                    break;
            }
            
            this.fabricCanvas.renderAll();
        });

        this.fabricCanvas.on('mouse:up', () => {
            if (isDrawing && shape) {
                this.saveState();
                isDrawing = false;
                shape = null;
            }
        });
    }

    addText(x, y) {
        const text = new fabric.IText('Click to edit text', {
            left: x,
            top: y,
            fontFamily: 'Inter',
            fontSize: 24,
            fill: this.currentColor
        });
        
        this.fabricCanvas.add(text);
        this.fabricCanvas.setActiveObject(text);
        text.enterEditing();
        this.saveState();
    }

    pickColor(x, y) {
        const canvas = this.fabricCanvas.lowerCanvasEl;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        
        const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        this.setColor(color);
    }

    setupLayers() {
        const layersList = document.getElementById('layers-list');
        const addLayerBtn = document.getElementById('add-new-layer-btn');
        const moveUpBtn = document.getElementById('move-layer-up-btn');
        const moveDownBtn = document.getElementById('move-layer-down-btn');
        const duplicateBtn = document.getElementById('duplicate-layer-btn');
        const deleteBtn = document.getElementById('delete-layer-btn');

        addLayerBtn.addEventListener('click', () => {
            this.addLayer();
        });

        moveUpBtn.addEventListener('click', () => {
            this.moveLayerUp();
        });

        moveDownBtn.addEventListener('click', () => {
            this.moveLayerDown();
        });

        duplicateBtn.addEventListener('click', () => {
            this.duplicateLayer();
        });

        deleteBtn.addEventListener('click', () => {
            this.deleteLayer();
        });

        // Object selection events
        this.fabricCanvas.on('selection:created', (e) => {
            this.selectedObject = e.selected[0];
            this.updatePropertiesPanel();
        });

        this.fabricCanvas.on('selection:updated', (e) => {
            this.selectedObject = e.selected[0];
            this.updatePropertiesPanel();
        });

        this.fabricCanvas.on('selection:cleared', () => {
            this.selectedObject = null;
            this.updatePropertiesPanel();
        });
    }

    initializeDefaultLayer() {
        const layer = {
            id: 'layer-' + Date.now(),
            name: 'Background',
            visible: true,
            locked: false,
            opacity: 1,
            objects: []
        };
        
        this.layers.push(layer);
        this.currentLayer = layer;
        this.updateLayersList();
    }

    addLayer() {
        const layer = {
            id: 'layer-' + Date.now(),
            name: `Layer ${this.layers.length}`,
            visible: true,
            locked: false,
            opacity: 1,
            objects: []
        };
        
        this.layers.push(layer);
        this.currentLayer = layer;
        this.updateLayersList();
        this.saveState();
    }

    updateLayersList() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';
        
        // Reverse order to show top layers first
        const reversedLayers = [...this.layers].reverse();
        
        reversedLayers.forEach((layer, index) => {
            const layerItem = document.createElement('li');
            layerItem.className = 'layer-item';
            layerItem.dataset.layerId = layer.id;
            
            if (layer === this.currentLayer) {
                layerItem.classList.add('active');
            }
            
            layerItem.innerHTML = `
                <div class="layer-preview">
                    <div class="layer-thumbnail"></div>
                </div>
                <div class="layer-info">
                    <span class="layer-name" contenteditable="true">${layer.name}</span>
                    <div class="layer-controls">
                        <button class="layer-visibility-btn ${layer.visible ? 'visible' : 'hidden'}" 
                                title="Toggle Visibility">
                            <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                        <button class="layer-lock-btn ${layer.locked ? 'locked' : 'unlocked'}" 
                                title="Toggle Lock">
                            <i class="fas ${layer.locked ? 'fa-lock' : 'fa-unlock'}"></i>
                        </button>
                    </div>
                </div>
                <div class="layer-opacity">
                    <input type="range" min="0" max="100" value="${layer.opacity * 100}" 
                           class="opacity-slider" title="Opacity">
                </div>
            `;
            
            // Layer selection
            layerItem.addEventListener('click', (e) => {
                if (!e.target.matches('button, input, [contenteditable]')) {
                    this.selectLayer(layer);
                }
            });
            
            // Layer name editing
            const nameElement = layerItem.querySelector('.layer-name');
            nameElement.addEventListener('blur', () => {
                layer.name = nameElement.textContent;
            });
            
            nameElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    nameElement.blur();
                }
            });
            
            // Visibility toggle
            layerItem.querySelector('.layer-visibility-btn').addEventListener('click', () => {
                this.toggleLayerVisibility(layer);
            });
            
            // Lock toggle
            layerItem.querySelector('.layer-lock-btn').addEventListener('click', () => {
                this.toggleLayerLock(layer);
            });
            
            // Opacity slider
            layerItem.querySelector('.opacity-slider').addEventListener('input', (e) => {
                this.setLayerOpacity(layer, e.target.value / 100);
            });
            
            layersList.appendChild(layerItem);
        });
    }

    selectLayer(layer) {
        this.currentLayer = layer;
        this.updateLayersList();
    }

    toggleLayerVisibility(layer) {
        layer.visible = !layer.visible;
        this.updateLayersList();
        // Update canvas objects visibility
        this.fabricCanvas.renderAll();
    }

    toggleLayerLock(layer) {
        layer.locked = !layer.locked;
        this.updateLayersList();
    }

    setLayerOpacity(layer, opacity) {
        layer.opacity = opacity;
        // Update canvas objects opacity
        this.fabricCanvas.renderAll();
    }

    moveLayerUp() {
        if (!this.currentLayer) return;
        
        const index = this.layers.indexOf(this.currentLayer);
        if (index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            this.updateLayersList();
            this.saveState();
        }
    }

    moveLayerDown() {
        if (!this.currentLayer) return;
        
        const index = this.layers.indexOf(this.currentLayer);
        if (index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            this.updateLayersList();
            this.saveState();
        }
    }

    duplicateLayer() {
        if (!this.currentLayer) return;
        
        const newLayer = {
            ...this.currentLayer,
            id: 'layer-' + Date.now(),
            name: this.currentLayer.name + ' Copy'
        };
        
        const index = this.layers.indexOf(this.currentLayer);
        this.layers.splice(index + 1, 0, newLayer);
        this.currentLayer = newLayer;
        this.updateLayersList();
        this.saveState();
    }

    deleteLayer() {
        if (!this.currentLayer || this.layers.length <= 1) return;
        
        const index = this.layers.indexOf(this.currentLayer);
        this.layers.splice(index, 1);
        this.currentLayer = this.layers[Math.min(index, this.layers.length - 1)];
        this.updateLayersList();
        this.saveState();
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('color-picker');
        const colorCurrent = document.getElementById('color-current');
        const colorPrevious = document.getElementById('color-previous');
        const colorSwatches = document.querySelectorAll('.color-swatch');
        const recentColorsContainer = document.getElementById('recent-colors');

        colorPicker.addEventListener('change', (e) => {
            this.setColor(e.target.value);
        });

        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.setColor(swatch.dataset.color);
            });
        });

        // Initialize color display
        this.updateColorDisplay();
    }

    setColor(color) {
        this.previousColor = this.currentColor;
        this.currentColor = color;
        
        // Add to recent colors
        if (!this.recentColors.includes(color)) {
            this.recentColors.unshift(color);
            if (this.recentColors.length > 8) {
                this.recentColors.pop();
            }
        }
        
        this.updateColorDisplay();
        this.updateRecentColors();
        
        // Update brush color if in drawing mode
        if (this.fabricCanvas.isDrawingMode) {
            this.fabricCanvas.freeDrawingBrush.color = color;
        }
        
        // Update selected object color
        if (this.selectedObject) {
            if (this.selectedObject.type === 'i-text' || this.selectedObject.type === 'text') {
                this.selectedObject.set('fill', color);
            } else {
                this.selectedObject.set('stroke', color);
            }
            this.fabricCanvas.renderAll();
        }
    }

    updateColorDisplay() {
        const colorPicker = document.getElementById('color-picker');
        const colorCurrent = document.getElementById('color-current');
        const colorPrevious = document.getElementById('color-previous');
        
        colorPicker.value = this.currentColor;
        colorCurrent.style.backgroundColor = this.currentColor;
        colorPrevious.style.backgroundColor = this.previousColor;
    }

    updateRecentColors() {
        const recentColorsContainer = document.getElementById('recent-colors');
        recentColorsContainer.innerHTML = '';
        
        this.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => {
                this.setColor(color);
            });
            recentColorsContainer.appendChild(swatch);
        });
    }

    setupHistory() {
        this.fabricCanvas.on('path:created', () => {
            this.saveState();
        });

        this.fabricCanvas.on('object:added', () => {
            this.saveState();
        });

        this.fabricCanvas.on('object:removed', () => {
            this.saveState();
        });

        this.fabricCanvas.on('object:modified', () => {
            this.saveState();
        });
    }

    saveState() {
        const state = JSON.stringify(this.fabricCanvas.toJSON());
        
        // Remove states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryPanel();
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.fabricCanvas.loadFromJSON(state, () => {
                this.fabricCanvas.renderAll();
            });
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.fabricCanvas.loadFromJSON(state, () => {
                this.fabricCanvas.renderAll();
            });
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    updateHistoryPanel() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            if (index === this.historyIndex) {
                historyItem.classList.add('active');
            }
            
            historyItem.innerHTML = `
                <i class="fas fa-layer-group"></i>
                <span>State ${index + 1}</span>
            `;
            
            historyItem.addEventListener('click', () => {
                this.historyIndex = index;
                this.fabricCanvas.loadFromJSON(state, () => {
                    this.fabricCanvas.renderAll();
                });
                this.updateHistoryPanel();
                this.updateUndoRedoButtons();
            });
            
            historyList.appendChild(historyItem);
        });
    }

    setupAI() {
        const aiToggleBtn = document.getElementById('ai-toggle-btn');
        const aiPanel = document.getElementById('ai-panel');
        const aiCloseBtn = document.getElementById('ai-close-btn');
        const generateBtn = document.getElementById('generate-ai-image-btn');
        const regenerateBtn = document.getElementById('regenerate-btn');
        const addToCanvasBtn = document.getElementById('add-to-canvas-btn');
        const blurSlider = document.getElementById('ai-blur');
        const blurValue = document.getElementById('blur-value');

        // Toggle AI panel
        aiToggleBtn.addEventListener('click', () => {
            aiPanel.classList.toggle('active');
        });

        aiCloseBtn.addEventListener('click', () => {
            aiPanel.classList.remove('active');
        });

        // Blur slider
        blurSlider.addEventListener('input', (e) => {
            blurValue.textContent = e.target.value;
        });

        // Generate AI image
        generateBtn.addEventListener('click', () => {
            this.generateAIImage();
        });

        regenerateBtn.addEventListener('click', () => {
            this.generateAIImage();
        });

        addToCanvasBtn.addEventListener('click', () => {
            this.addAIImageToCanvas();
        });
    }

    async generateAIImage() {
        const prompt = document.getElementById('ai-prompt').value;
        const negativePrompt = document.getElementById('ai-negative-prompt').value;
        const model = document.getElementById('ai-model').value;
        const style = document.getElementById('ai-style-preset').value;
        const aspectRatio = document.getElementById('ai-aspect-ratio').value;
        const quality = document.getElementById('ai-quality').value;
        const blur = document.getElementById('ai-blur').value;

        if (!prompt.trim()) {
            this.showAlert('Please enter a prompt to generate an image.');
            return;
        }

        const generateBtn = document.getElementById('generate-ai-image-btn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            // Use free AI image generation service
            const response = await this.callFreeAIService(prompt, {
                negativePrompt,
                model,
                style,
                aspectRatio,
                quality,
                blur
            });

            if (response.success) {
                this.displayAIResult(response.imageUrl);
            } else {
                throw new Error(response.error || 'Failed to generate image');
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            this.showAlert('Failed to generate image. Please try again.');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    async callFreeAIService(prompt, options) {
        // Using Pollinations.ai - a free AI image generation service
        try {
            const params = new URLSearchParams({
                prompt: prompt,
                width: this.getWidthFromAspectRatio(options.aspectRatio),
                height: this.getHeightFromAspectRatio(options.aspectRatio),
                seed: Math.floor(Math.random() * 1000000),
                model: this.mapModelToService(options.model),
                enhance: options.quality === 'high' || options.quality === 'ultra' ? 'true' : 'false'
            });

            if (options.negativePrompt) {
                params.append('negative', options.negativePrompt);
            }

            if (options.style && options.style !== 'none') {
                params.append('style', options.style);
            }

            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
            
            // Test if image loads successfully
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ success: true, imageUrl: imageUrl });
                };
                img.onerror = () => {
                    resolve({ success: false, error: 'Failed to load generated image' });
                };
                img.src = imageUrl;
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    mapModelToService(model) {
        const modelMap = {
            'imagen-3.0': 'flux',
            'imagen-2.0': 'flux',
            'dalle-3': 'flux',
            'midjourney': 'flux'
        };
        return modelMap[model] || 'flux';
    }

    getWidthFromAspectRatio(ratio) {
        const ratioMap = {
            '1:1': 1024,
            '16:9': 1920,
            '9:16': 1080,
            '4:3': 1024,
            '3:2': 1024
        };
        return ratioMap[ratio] || 1024;
    }

    getHeightFromAspectRatio(ratio) {
        const ratioMap = {
            '1:1': 1024,
            '16:9': 1080,
            '9:16': 1920,
            '4:3': 768,
            '3:2': 683
        };
        return ratioMap[ratio] || 1024;
    }

    displayAIResult(imageUrl) {
        const aiResult = document.getElementById('ai-result');
        const aiImage = document.getElementById('ai-generated-image');
        
        aiImage.src = imageUrl;
        aiResult.style.display = 'block';
    }

    addAIImageToCanvas() {
        const aiImage = document.getElementById('ai-generated-image');
        
        if (aiImage.src) {
            fabric.Image.fromURL(aiImage.src, (img) => {
                // Scale image to fit canvas
                const maxWidth = this.canvasWidth * 0.8;
                const maxHeight = this.canvasHeight * 0.8;
                
                const scaleX = maxWidth / img.width;
                const scaleY = maxHeight / img.height;
                const scale = Math.min(scaleX, scaleY);
                
                img.scale(scale);
                img.set({
                    left: (this.canvasWidth - img.width * scale) / 2,
                    top: (this.canvasHeight - img.height * scale) / 2
                });
                
                this.fabricCanvas.add(img);
                this.fabricCanvas.setActiveObject(img);
                this.saveState();
                
                // Hide AI result
                document.getElementById('ai-result').style.display = 'none';
                document.getElementById('ai-panel').classList.remove('active');
            });
        }
    }

    updatePropertiesPanel() {
        const propertiesContent = document.getElementById('properties-panel-content');
        const placeholder = document.getElementById('properties-panel-placeholder');
        
        if (!this.selectedObject) {
            propertiesContent.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }
        
        propertiesContent.style.display = 'block';
        placeholder.style.display = 'none';
        
        const obj = this.selectedObject;
        let html = '';
        
        // Common properties
        html += `
            <div class="prop-group">
                <label>Position</label>
                <div class="prop-grid">
                    <div class="prop-item">
                        <label>X</label>
                        <input type="number" id="prop-left" value="${Math.round(obj.left)}" step="1">
                    </div>
                    <div class="prop-item">
                        <label>Y</label>
                        <input type="number" id="prop-top" value="${Math.round(obj.top)}" step="1">
                    </div>
                </div>
            </div>
            
            <div class="prop-group">
                <label>Size</label>
                <div class="prop-grid">
                    <div class="prop-item">
                        <label>Width</label>
                        <input type="number" id="prop-width" value="${Math.round(obj.width * obj.scaleX)}" step="1">
                    </div>
                    <div class="prop-item">
                        <label>Height</label>
                        <input type="number" id="prop-height" value="${Math.round(obj.height * obj.scaleY)}" step="1">
                    </div>
                </div>
            </div>
            
            <div class="prop-group">
                <label>Transform</label>
                <div class="prop-grid">
                    <div class="prop-item">
                        <label>Rotation</label>
                        <input type="number" id="prop-angle" value="${Math.round(obj.angle)}" step="1" min="-360" max="360">
                    </div>
                    <div class="prop-item">
                        <label>Opacity</label>
                        <input type="range" id="prop-opacity" value="${obj.opacity * 100}" min="0" max="100" step="1">
                    </div>
                </div>
            </div>
        `;
        
        // Type-specific properties
        if (obj.type === 'i-text' || obj.type === 'text') {
            html += `
                <div class="prop-group">
                    <label>Text Properties</label>
                    <div class="prop-item">
                        <label>Font Size</label>
                        <input type="number" id="prop-font-size" value="${obj.fontSize}" min="8" max="200" step="1">
                    </div>
                    <div class="prop-item">
                        <label>Font Family</label>
                        <select id="prop-font-family">
                            <option value="Inter" ${obj.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                            <option value="Arial" ${obj.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Helvetica" ${obj.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                            <option value="Times New Roman" ${obj.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                            <option value="Georgia" ${obj.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                        </select>
                    </div>
                    <div class="prop-item">
                        <label>Text Color</label>
                        <input type="color" id="prop-text-color" value="${obj.fill}">
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="prop-group">
                    <label>Appearance</label>
                    <div class="prop-item">
                        <label>Stroke Color</label>
                        <input type="color" id="prop-stroke" value="${obj.stroke || '#000000'}">
                    </div>
                    <div class="prop-item">
                        <label>Stroke Width</label>
                        <input type="number" id="prop-stroke-width" value="${obj.strokeWidth || 0}" min="0" max="20" step="1">
                    </div>
                    <div class="prop-item">
                        <label>Fill Color</label>
                        <input type="color" id="prop-fill" value="${obj.fill || '#ffffff'}">
                    </div>
                </div>
            `;
        }
        
        propertiesContent.innerHTML = html;
        
        // Add event listeners for property changes
        this.setupPropertyListeners();
    }

    setupPropertyListeners() {
        const obj = this.selectedObject;
        if (!obj) return;
        
        // Position
        const leftInput = document.getElementById('prop-left');
        const topInput = document.getElementById('prop-top');
        
        if (leftInput) {
            leftInput.addEventListener('input', (e) => {
                obj.set('left', parseInt(e.target.value));
                this.fabricCanvas.renderAll();
            });
        }
        
        if (topInput) {
            topInput.addEventListener('input', (e) => {
                obj.set('top', parseInt(e.target.value));
                this.fabricCanvas.renderAll();
            });
        }
        
        // Size
        const widthInput = document.getElementById('prop-width');
        const heightInput = document.getElementById('prop-height');
        
        if (widthInput) {
            widthInput.addEventListener('input', (e) => {
                const newWidth = parseInt(e.target.value);
                const scaleX = newWidth / obj.width;
                obj.set('scaleX', scaleX);
                this.fabricCanvas.renderAll();
            });
        }
        
        if (heightInput) {
            heightInput.addEventListener('input', (e) => {
                const newHeight = parseInt(e.target.value);
                const scaleY = newHeight / obj.height;
                obj.set('scaleY', scaleY);
                this.fabricCanvas.renderAll();
            });
        }
        
        // Transform
        const angleInput = document.getElementById('prop-angle');
        const opacityInput = document.getElementById('prop-opacity');
        
        if (angleInput) {
            angleInput.addEventListener('input', (e) => {
                obj.set('angle', parseInt(e.target.value));
                this.fabricCanvas.renderAll();
            });
        }
        
        if (opacityInput) {
            opacityInput.addEventListener('input', (e) => {
                obj.set('opacity', e.target.value / 100);
                this.fabricCanvas.renderAll();
            });
        }
        
        // Text properties
        const fontSizeInput = document.getElementById('prop-font-size');
        const fontFamilySelect = document.getElementById('prop-font-family');
        const textColorInput = document.getElementById('prop-text-color');
        
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', (e) => {
                obj.set('fontSize', parseInt(e.target.value));
                this.fabricCanvas.renderAll();
            });
        }
        
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                obj.set('fontFamily', e.target.value);
                this.fabricCanvas.renderAll();
            });
        }
        
        if (textColorInput) {
            textColorInput.addEventListener('input', (e) => {
                obj.set('fill', e.target.value);
                this.fabricCanvas.renderAll();
            });
        }
        
        // Shape properties
        const strokeInput = document.getElementById('prop-stroke');
        const strokeWidthInput = document.getElementById('prop-stroke-width');
        const fillInput = document.getElementById('prop-fill');
        
        if (strokeInput) {
            strokeInput.addEventListener('input', (e) => {
                obj.set('stroke', e.target.value);
                this.fabricCanvas.renderAll();
            });
        }
        
        if (strokeWidthInput) {
            strokeWidthInput.addEventListener('input', (e) => {
                obj.set('strokeWidth', parseInt(e.target.value));
                this.fabricCanvas.renderAll();
            });
        }
        
        if (fillInput) {
            fillInput.addEventListener('input', (e) => {
                obj.set('fill', e.target.value);
                this.fabricCanvas.renderAll();
            });
        }
    }

    setupMobilePanelToggles() {
        const mobilePanelBtns = document.querySelectorAll('.mobile-panel-btn');
        
        mobilePanelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPanel = btn.dataset.panelTarget;
                const panel = document.getElementById(targetPanel) || document.querySelector(`.${targetPanel}`);
                
                // Remove active class from all buttons
                mobilePanelBtns.forEach(b => b.classList.remove('active'));
                
                // Hide all panels
                document.querySelectorAll('.tools-panel, .right-panels > .panel, .ai-panel').forEach(p => {
                    p.classList.remove('mobile-active');
                });
                
                // Show selected panel and activate button
                if (panel) {
                    panel.classList.add('mobile-active');
                    btn.classList.add('active');
                }
            });
        });
    }

    setupCollapsiblePanels() {
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const panel = header.parentElement;
                const content = panel.querySelector('.collapsible-content');
                const icon = header.querySelector('.toggle-icon');
                
                panel.classList.toggle('collapsed');
                
                if (panel.classList.contains('collapsed')) {
                    content.style.display = 'none';
                    icon.style.transform = 'rotate(-90deg)';
                } else {
                    content.style.display = 'block';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });
    }

    setupMobileSupport() {
        // Touch events for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.fabricCanvas.on('touch:gesture', (e) => {
            if (e.e.touches && e.e.touches.length === 2) {
                // Pinch to zoom
                const touch1 = e.e.touches[0];
                const touch2 = e.e.touches[1];
                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) + 
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                // Implement pinch zoom logic here
            }
        });
        
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle-btn');
        const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        const mobileMenuContent = document.getElementById('mobile-nav-content');
        const desktopNav = document.getElementById('desktop-nav');
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                // Copy desktop navigation to mobile
                mobileMenuContent.innerHTML = desktopNav.innerHTML;
                mobileMenuOverlay.classList.add('active');
            });
        }
        
        // Close mobile menu
        mobileMenuOverlay.querySelector('.close-btn').addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('active');
        });
        
        mobileMenuOverlay.querySelector('.mobile-menu-backdrop').addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('active');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent default for our shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportCanvas();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.fabricCanvas.discardActiveObject();
                        this.fabricCanvas.setActiveObject(new fabric.ActiveSelection(this.fabricCanvas.getObjects(), {
                            canvas: this.fabricCanvas,
                        }));
                        this.fabricCanvas.renderAll();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.copyObject();
                        break;
                    case 'v':
                        e.preventDefault();
                        this.pasteObject();
                        break;
                    case 'x':
                        e.preventDefault();
                        this.cutObject();
                        break;
                }
            }
            
            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v':
                        this.setTool('select');
                        break;
                    case 'h':
                        this.setTool('hand');
                        break;
                    case 'b':
                        this.setTool('brush');
                        break;
                    case 't':
                        this.setTool('text');
                        break;
                    case 'z':
                        this.setTool('zoom');
                        break;
                    case 'delete':
                    case 'backspace':
                        this.deleteSelectedObject();
                        break;
                }
            }
        });
    }

    copyObject() {
        if (this.selectedObject) {
            this.selectedObject.clone((cloned) => {
                this.clipboard = cloned;
            });
        }
    }

    pasteObject() {
        if (this.clipboard) {
            this.clipboard.clone((cloned) => {
                cloned.set({
                    left: cloned.left + 10,
                    top: cloned.top + 10,
                    evented: true,
                });
                if (cloned.type === 'activeSelection') {
                    cloned.canvas = this.fabricCanvas;
                    cloned.forEachObject((obj) => {
                        this.fabricCanvas.add(obj);
                    });
                    cloned.setCoords();
                } else {
                    this.fabricCanvas.add(cloned);
                }
                this.fabricCanvas.setActiveObject(cloned);
                this.fabricCanvas.requestRenderAll();
                this.saveState();
            });
        }
    }

    cutObject() {
        this.copyObject();
        this.deleteSelectedObject();
    }

    deleteSelectedObject() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            if (activeObject.type === 'activeSelection') {
                activeObject.forEachObject((obj) => {
                    this.fabricCanvas.remove(obj);
                });
            } else {
                this.fabricCanvas.remove(activeObject);
            }
            this.fabricCanvas.discardActiveObject();
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                // Scale image to fit canvas
                const maxWidth = this.canvasWidth * 0.8;
                const maxHeight = this.canvasHeight * 0.8;
                
                const scaleX = maxWidth / img.width;
                const scaleY = maxHeight / img.height;
                const scale = Math.min(scaleX, scaleY);
                
                img.scale(scale);
                img.set({
                    left: (this.canvasWidth - img.width * scale) / 2,
                    top: (this.canvasHeight - img.height * scale) / 2
                });
                
                this.fabricCanvas.add(img);
                this.fabricCanvas.setActiveObject(img);
                this.saveState();
            });
        };
        reader.readAsDataURL(file);
    }

    toggleGrid() {
        this.isGridVisible = !this.isGridVisible;
        const grid = document.getElementById('canvas-grid');
        grid.style.display = this.isGridVisible ? 'block' : 'none';
        
        const btn = document.getElementById('grid-toggle');
        btn.classList.toggle('active', this.isGridVisible);
    }

    toggleRulers() {
        this.areRulersVisible = !this.areRulersVisible;
        const rulers = document.getElementById('canvas-rulers');
        rulers.style.display = this.areRulersVisible ? 'block' : 'none';
        
        const btn = document.getElementById('rulers-toggle');
        btn.classList.toggle('active', this.areRulersVisible);
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle.querySelector('i');
        
        if (document.body.classList.contains('dark-theme')) {
            icon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            icon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        }
    }

    newProject() {
        if (confirm('Are you sure you want to create a new project? All unsaved changes will be lost.')) {
            document.getElementById('canvas-size-modal').classList.add('active');
        }
    }

    exportCanvas() {
        const format = 'png'; // Default format
        const dataURL = this.fabricCanvas.toDataURL({
            format: format,
            quality: 1,
            multiplier: 2 // Higher resolution
        });
        
        const link = document.createElement('a');
        link.download = `visual-composer-export.${format}`;
        link.href = dataURL;
        link.click();
    }

    updateCanvasInfo() {
        document.getElementById('canvas-dimensions').textContent = `${this.canvasWidth} × ${this.canvasHeight}`;
    }

    showAlert(message) {
        const modal = document.getElementById('custom-alert-modal');
        const messageEl = document.getElementById('custom-alert-message');
        const okBtn = document.getElementById('custom-alert-ok-btn');
        
        messageEl.textContent = message;
        modal.classList.add('active');
        
        okBtn.onclick = () => {
            modal.classList.remove('active');
        };
        
        modal.querySelector('.modal-backdrop').onclick = () => {
            modal.classList.remove('active');
        };
    }

    showConfirm(title, message, callback) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add('active');
        
        okBtn.onclick = () => {
            modal.classList.remove('active');
            callback(true);
        };
        
        cancelBtn.onclick = () => {
            modal.classList.remove('active');
            callback(false);
        };
        
        modal.querySelector('.modal-backdrop').onclick = () => {
            modal.classList.remove('active');
            callback(false);
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').querySelector('i').className = 'fas fa-sun';
    }
    
    // Initialize the Visual Composer Pro
    window.visualComposer = new VisualComposerPro();
});