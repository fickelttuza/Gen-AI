// Visual Composer Pro - Enhanced JavaScript
class VisualComposerPro {
    constructor() {
        this.canvas = null;
        this.fabricCanvas = null;
        this.currentTool = 'select';
        this.currentColor = '#800080';
        this.zoomLevel = 100;
        this.canvasSize = { width: 800, height: 600 };
        this.selectedTemplate = null;
        this.isWorkspaceHidden = true;
        this.history = [];
        this.historyIndex = -1;
        this.layers = [];
        this.activeLayer = null;
        this.recentColors = [];
        this.panelStates = {
            layers: true,
            properties: true,
            colors: true,
            history: false,
            ai: false
        };
        this.isMobile = window.innerWidth <= 1024;
        this.touchStartDistance = 0;
        this.lastTouchCenter = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.setupPanels();
        this.setupMobileHandlers();
        this.setupKeyboardShortcuts();
        this.setupAccessibility();
        this.loadLazyFeatures();
        
        // Show canvas size modal on startup
        this.showCanvasSizeModal();
    }

    setupEventListeners() {
        // Canvas size modal
        this.setupCanvasSizeModal();
        
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // AI Panel toggle
        document.getElementById('ai-toggle-btn')?.addEventListener('click', () => {
            this.toggleAIPanel();
        });

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.currentTarget.dataset.tool, e.currentTarget.dataset.shape);
            });
        });

        // Canvas controls
        document.getElementById('grid-toggle')?.addEventListener('click', () => {
            this.toggleGrid();
        });

        document.getElementById('rulers-toggle')?.addEventListener('click', () => {
            this.toggleRulers();
        });

        document.getElementById('fit-to-screen')?.addEventListener('click', () => {
            this.fitToScreen();
        });

        // Zoom controls
        this.setupZoomControls();

        // Export functionality
        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.showExportOptions();
        });

        // Panel toggles
        this.setupPanelToggles();

        // Color picker
        this.setupColorPicker();

        // File operations
        this.setupFileOperations();

        // AI Generation
        this.setupAIGeneration();

        // Canvas size selector in footer
        document.getElementById('canvas-size')?.addEventListener('change', (e) => {
            this.resizeCanvasFromSelector(e.target.value);
        });

        // Mobile menu
        document.getElementById('mobile-menu-toggle-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Prevent context menu on canvas
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.canvas-container')) {
                e.preventDefault();
            }
        });
    }

    setupCanvasSizeModal() {
        const modal = document.getElementById('canvas-size-modal');
        const createBtn = document.getElementById('create-canvas-btn');
        const categoryTabs = document.querySelectorAll('.category-tab');
        const templateBtns = document.querySelectorAll('.template-btn');
        const customInputs = document.getElementById('custom-size-inputs');

        // Category tab switching
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.switchTemplateCategory(category);
            });
        });

        // Template selection
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectTemplate(btn);
            });
        });

        // Custom size inputs
        document.getElementById('custom-width')?.addEventListener('input', () => {
            this.updateCustomPreview();
        });

        document.getElementById('custom-height')?.addEventListener('input', () => {
            this.updateCustomPreview();
        });

        // Create canvas button
        createBtn?.addEventListener('click', () => {
            this.createCanvasFromTemplate();
        });

        // Close modal on backdrop click
        modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            if (!this.isWorkspaceHidden) {
                this.hideCanvasSizeModal();
            }
        });
    }

    switchTemplateCategory(category) {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });

        // Update active category
        document.querySelectorAll('.template-category').forEach(cat => {
            cat.classList.toggle('active', cat.dataset.category === category);
        });

        // Show/hide custom inputs
        const customInputs = document.getElementById('custom-size-inputs');
        if (category === 'custom') {
            customInputs?.classList.add('active');
            // Auto-select custom template
            const customBtn = document.querySelector('.template-btn.custom');
            if (customBtn) {
                this.selectTemplate(customBtn);
            }
        } else {
            customInputs?.classList.remove('active');
        }
    }

    selectTemplate(templateBtn) {
        // Remove previous selection
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select current template
        templateBtn.classList.add('selected');

        const size = templateBtn.dataset.size;
        const name = templateBtn.dataset.name;

        if (size === 'custom') {
            this.selectedTemplate = {
                name: 'Custom Size',
                width: parseInt(document.getElementById('custom-width')?.value || '800'),
                height: parseInt(document.getElementById('custom-height')?.value || '600'),
                isCustom: true
            };
        } else {
            const [width, height] = size.split('x').map(Number);
            this.selectedTemplate = {
                name,
                width,
                height,
                isCustom: false
            };
        }

        // Enable create button
        document.getElementById('create-canvas-btn').disabled = false;
    }

    updateCustomPreview() {
        const width = parseInt(document.getElementById('custom-width')?.value || '800');
        const height = parseInt(document.getElementById('custom-height')?.value || '600');
        
        if (document.querySelector('.template-btn.custom.selected')) {
            this.selectedTemplate = {
                name: 'Custom Size',
                width,
                height,
                isCustom: true
            };
        }
    }

    createCanvasFromTemplate() {
        if (!this.selectedTemplate) return;

        this.canvasSize = {
            width: this.selectedTemplate.width,
            height: this.selectedTemplate.height
        };

        this.setupCanvas();
        this.hideCanvasSizeModal();
        this.showWorkspace();
        this.updateCanvasInfo();
        this.centerCanvas();
        
        // Add to history
        this.addToHistory('Canvas Created', 'canvas');
    }

    showCanvasSizeModal() {
        const modal = document.getElementById('canvas-size-modal');
        modal?.classList.add('active');
        
        // Reset selection
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('create-canvas-btn').disabled = true;
        this.selectedTemplate = null;

        // Focus first template for accessibility
        setTimeout(() => {
            document.querySelector('.template-btn')?.focus();
        }, 300);
    }

    hideCanvasSizeModal() {
        const modal = document.getElementById('canvas-size-modal');
        modal?.classList.remove('active');
    }

    showWorkspace() {
        this.isWorkspaceHidden = false;
        document.querySelector('.main-layout').setAttribute('data-workspace-hidden', 'false');
        
        // Hide AI panel if it was shown
        this.hideAIPanel();
    }

    hideWorkspace() {
        this.isWorkspaceHidden = true;
        document.querySelector('.main-layout').setAttribute('data-workspace-hidden', 'true');
    }

    setupCanvas() {
        const canvasElement = document.getElementById('main-canvas');
        if (!canvasElement) return;

        // Set canvas dimensions
        canvasElement.width = this.canvasSize.width;
        canvasElement.height = this.canvasSize.height;

        // Initialize Fabric.js canvas
        if (this.fabricCanvas) {
            this.fabricCanvas.dispose();
        }

        this.fabricCanvas = new fabric.Canvas('main-canvas', {
            backgroundColor: 'white',
            selection: true,
            preserveObjectStacking: true
        });

        // Set up canvas event listeners
        this.setupCanvasEvents();
        
        // Center the canvas
        this.centerCanvas();
        
        // Initialize with background layer
        this.initializeLayers();
    }

    setupCanvasEvents() {
        if (!this.fabricCanvas) return;

        this.fabricCanvas.on('selection:created', (e) => {
            this.updatePropertiesPanel(e.selected[0]);
        });

        this.fabricCanvas.on('selection:updated', (e) => {
            this.updatePropertiesPanel(e.selected[0]);
        });

        this.fabricCanvas.on('selection:cleared', () => {
            this.clearPropertiesPanel();
        });

        this.fabricCanvas.on('object:modified', () => {
            this.addToHistory('Object Modified', 'edit');
        });

        this.fabricCanvas.on('object:added', () => {
            this.updateLayersPanel();
        });

        this.fabricCanvas.on('object:removed', () => {
            this.updateLayersPanel();
        });

        // Touch events for mobile
        if (this.isMobile) {
            this.setupMobileCanvasEvents();
        }
    }

    setupMobileCanvasEvents() {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;

        let isPinching = false;
        let initialDistance = 0;
        let initialZoom = this.zoomLevel;

        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                initialDistance = this.getTouchDistance(e.touches);
                initialZoom = this.zoomLevel;
                this.lastTouchCenter = this.getTouchCenter(e.touches);
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (isPinching && e.touches.length === 2) {
                e.preventDefault();
                
                const currentDistance = this.getTouchDistance(e.touches);
                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(10, Math.min(300, initialZoom * scale));
                
                this.setZoom(newZoom);
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchend', () => {
            isPinching = false;
        });
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    centerCanvas() {
        const canvasElement = document.getElementById('main-canvas');
        const container = document.getElementById('canvas-container');
        
        if (!canvasElement || !container) return;

        // Calculate center position
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvasElement.getBoundingClientRect();
        
        const centerX = (containerRect.width - canvasRect.width) / 2;
        const centerY = (containerRect.height - canvasRect.height) / 2;
        
        // Apply centering with current zoom
        const scale = this.zoomLevel / 100;
        canvasElement.style.transform = `scale(${scale}) translate(${centerX / scale}px, ${centerY / scale}px)`;
    }

    setupZoomControls() {
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomLevel = document.getElementById('zoom-level');

        zoomSlider?.addEventListener('input', (e) => {
            this.setZoom(parseInt(e.target.value));
        });

        zoomInBtn?.addEventListener('click', () => {
            this.setZoom(Math.min(300, this.zoomLevel + 10));
        });

        zoomOutBtn?.addEventListener('click', () => {
            this.setZoom(Math.max(10, this.zoomLevel - 10));
        });

        // Mouse wheel zoom
        document.getElementById('canvas-container')?.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -10 : 10;
                this.setZoom(Math.max(10, Math.min(300, this.zoomLevel + delta)));
            }
        }, { passive: false });
    }

    setZoom(level) {
        this.zoomLevel = Math.max(10, Math.min(300, level));
        
        // Update UI
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomLevelDisplay = document.getElementById('zoom-level');
        
        if (zoomSlider) zoomSlider.value = this.zoomLevel;
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${this.zoomLevel}%`;
        
        // Apply zoom to canvas while keeping it centered
        this.centerCanvas();
        
        // Update fabric canvas zoom
        if (this.fabricCanvas) {
            const scale = this.zoomLevel / 100;
            this.fabricCanvas.setZoom(scale);
            this.fabricCanvas.renderAll();
        }
    }

    fitToScreen() {
        const container = document.getElementById('canvas-container');
        const canvas = document.getElementById('main-canvas');
        
        if (!container || !canvas) return;

        const containerRect = container.getBoundingClientRect();
        const canvasWidth = this.canvasSize.width;
        const canvasHeight = this.canvasSize.height;
        
        // Calculate zoom to fit with padding
        const padding = 40;
        const scaleX = (containerRect.width - padding) / canvasWidth;
        const scaleY = (containerRect.height - padding) / canvasHeight;
        const scale = Math.min(scaleX, scaleY);
        
        this.setZoom(Math.max(10, Math.min(300, scale * 100)));
    }

    resizeCanvasFromSelector(sizeString) {
        if (!this.fabricCanvas) return;

        const [width, height] = sizeString.split('x').map(Number);
        this.resizeCanvas(width, height);
    }

    resizeCanvas(width, height) {
        this.canvasSize = { width, height };
        
        // Update canvas element
        const canvasElement = document.getElementById('main-canvas');
        if (canvasElement) {
            canvasElement.width = width;
            canvasElement.height = height;
        }
        
        // Update fabric canvas
        if (this.fabricCanvas) {
            this.fabricCanvas.setDimensions({ width, height });
            this.fabricCanvas.renderAll();
        }
        
        // Update UI
        this.updateCanvasInfo();
        this.centerCanvas();
        
        // Add to history
        this.addToHistory('Canvas Resized', 'canvas');
    }

    updateCanvasInfo() {
        const nameElement = document.getElementById('canvas-name');
        const dimensionsElement = document.getElementById('canvas-dimensions');
        
        if (nameElement) {
            nameElement.textContent = this.selectedTemplate?.name || 'Canvas';
        }
        
        if (dimensionsElement) {
            dimensionsElement.textContent = `${this.canvasSize.width} × ${this.canvasSize.height}`;
        }
    }

    toggleGrid() {
        const grid = document.getElementById('canvas-grid');
        const btn = document.getElementById('grid-toggle');
        
        grid?.classList.toggle('active');
        btn?.classList.toggle('active');
    }

    toggleRulers() {
        const rulers = document.getElementById('canvas-rulers');
        const btn = document.getElementById('rulers-toggle');
        
        rulers?.classList.toggle('active');
        btn?.classList.toggle('active');
    }

    selectTool(tool, shape = null) {
        this.currentTool = tool;
        
        // Update tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
        
        // Update cursor
        this.updateCanvasCursor();
        
        // Handle tool-specific logic
        this.handleToolSelection(tool, shape);
    }

    updateCanvasCursor() {
        const canvas = document.getElementById('main-canvas');
        if (!canvas) return;

        const cursors = {
            select: 'default',
            hand: 'grab',
            zoom: 'zoom-in',
            brush: 'crosshair',
            eraser: 'crosshair',
            text: 'text',
            crop: 'crosshair',
            'color-picker': 'crosshair'
        };

        canvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    handleToolSelection(tool, shape) {
        if (!this.fabricCanvas) return;

        switch (tool) {
            case 'text':
                this.addTextObject();
                break;
            case 'shape':
                this.addShapeObject(shape);
                break;
            case 'brush':
                this.enableDrawingMode();
                break;
            default:
                this.fabricCanvas.isDrawingMode = false;
                break;
        }
    }

    addTextObject() {
        if (!this.fabricCanvas) return;

        const text = new fabric.IText('Click to edit text', {
            left: this.canvasSize.width / 2,
            top: this.canvasSize.height / 2,
            fontFamily: 'Inter',
            fontSize: 24,
            fill: this.currentColor,
            originX: 'center',
            originY: 'center'
        });

        this.fabricCanvas.add(text);
        this.fabricCanvas.setActiveObject(text);
        this.addToHistory('Text Added', 'text');
    }

    addShapeObject(shape) {
        if (!this.fabricCanvas) return;

        let shapeObject;
        const centerX = this.canvasSize.width / 2;
        const centerY = this.canvasSize.height / 2;

        switch (shape) {
            case 'rect':
                shapeObject = new fabric.Rect({
                    left: centerX - 50,
                    top: centerY - 50,
                    width: 100,
                    height: 100,
                    fill: this.currentColor,
                    stroke: '#000',
                    strokeWidth: 1
                });
                break;
            case 'circle':
                shapeObject = new fabric.Circle({
                    left: centerX - 50,
                    top: centerY - 50,
                    radius: 50,
                    fill: this.currentColor,
                    stroke: '#000',
                    strokeWidth: 1
                });
                break;
            case 'line':
                shapeObject = new fabric.Line([centerX - 50, centerY, centerX + 50, centerY], {
                    stroke: this.currentColor,
                    strokeWidth: 2
                });
                break;
        }

        if (shapeObject) {
            this.fabricCanvas.add(shapeObject);
            this.fabricCanvas.setActiveObject(shapeObject);
            this.addToHistory(`${shape} Added`, 'shape');
        }
    }

    enableDrawingMode() {
        if (!this.fabricCanvas) return;

        this.fabricCanvas.isDrawingMode = true;
        this.fabricCanvas.freeDrawingBrush.width = 5;
        this.fabricCanvas.freeDrawingBrush.color = this.currentColor;
    }

    setupPanels() {
        this.setupCollapsiblePanels();
        this.initializeLayers();
        this.updatePropertiesPanel();
        this.setupColorPicker();
        this.updateHistoryPanel();
    }

    setupCollapsiblePanels() {
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                const panel = header.closest('.collapsible-panel');
                panel?.classList.toggle('collapsed');
                
                const panelId = panel?.id;
                if (panelId) {
                    this.panelStates[panelId.replace('-container', '')] = !panel.classList.contains('collapsed');
                }
            });
        });
    }

    setupPanelToggles() {
        // Mobile panel toggles
        document.querySelectorAll('.mobile-panel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.panelTarget;
                this.toggleMobilePanel(target, btn);
            });
        });
    }

    toggleMobilePanel(panelId, btn) {
        if (!this.isMobile) return;

        // Hide all panels first
        document.querySelectorAll('.tools-panel, .right-panels, .ai-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Remove active state from all buttons
        document.querySelectorAll('.mobile-panel-btn').forEach(b => {
            b.classList.remove('active');
        });

        // Show selected panel
        const panel = document.getElementById(panelId) || document.querySelector(`.${panelId}`);
        if (panel) {
            panel.classList.add('active');
            btn.classList.add('active');
        }
    }

    initializeLayers() {
        this.layers = [
            {
                id: 'background',
                name: 'Background',
                type: 'background',
                visible: true,
                locked: false
            }
        ];
        
        this.activeLayer = this.layers[0];
        this.updateLayersPanel();
    }

    updateLayersPanel() {
        const layersList = document.getElementById('layers-list');
        if (!layersList) return;

        layersList.innerHTML = '';

        // Add fabric objects as layers
        if (this.fabricCanvas) {
            const objects = this.fabricCanvas.getObjects();
            objects.forEach((obj, index) => {
                const layerItem = this.createLayerItem({
                    id: `layer-${index}`,
                    name: this.getObjectName(obj),
                    type: this.getObjectType(obj),
                    visible: obj.visible !== false,
                    locked: obj.selectable === false
                }, obj);
                
                layersList.appendChild(layerItem);
            });
        }

        // Add background layer
        const backgroundLayer = this.createLayerItem(this.layers[0]);
        layersList.appendChild(backgroundLayer);
    }

    createLayerItem(layer, fabricObject = null) {
        const li = document.createElement('li');
        li.className = 'layer-item';
        li.dataset.layerId = layer.id;
        
        if (layer === this.activeLayer) {
            li.classList.add('active');
        }

        li.innerHTML = `
            <div class="layer-thumbnail"></div>
            <div class="layer-info">
                <div class="layer-name">${layer.name}</div>
                <div class="layer-type">${layer.type}</div>
            </div>
            <button class="layer-visibility" title="Toggle Visibility">
                <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
        `;

        // Layer selection
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.layer-visibility')) {
                this.selectLayer(layer, fabricObject);
            }
        });

        // Visibility toggle
        li.querySelector('.layer-visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layer, fabricObject);
        });

        return li;
    }

    getObjectName(obj) {
        if (obj.type === 'i-text' || obj.type === 'text') {
            return obj.text?.substring(0, 20) + (obj.text?.length > 20 ? '...' : '') || 'Text';
        }
        return obj.type?.charAt(0).toUpperCase() + obj.type?.slice(1) || 'Object';
    }

    getObjectType(obj) {
        const typeMap = {
            'i-text': 'text',
            'text': 'text',
            'rect': 'rectangle',
            'circle': 'circle',
            'line': 'line',
            'image': 'image',
            'path': 'path'
        };
        return typeMap[obj.type] || obj.type;
    }

    selectLayer(layer, fabricObject) {
        this.activeLayer = layer;
        
        // Update UI
        document.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-layer-id="${layer.id}"]`)?.classList.add('active');
        
        // Select fabric object
        if (fabricObject && this.fabricCanvas) {
            this.fabricCanvas.setActiveObject(fabricObject);
            this.fabricCanvas.renderAll();
        }
    }

    toggleLayerVisibility(layer, fabricObject) {
        layer.visible = !layer.visible;
        
        if (fabricObject) {
            fabricObject.visible = layer.visible;
            this.fabricCanvas?.renderAll();
        }
        
        this.updateLayersPanel();
    }

    updatePropertiesPanel(selectedObject = null) {
        const content = document.getElementById('properties-panel-content');
        const placeholder = document.getElementById('properties-panel-placeholder');
        
        if (!content || !placeholder) return;

        if (!selectedObject) {
            content.style.display = 'none';
            placeholder.style.display = 'flex';
            return;
        }

        content.style.display = 'block';
        placeholder.style.display = 'none';

        // Generate properties based on object type
        content.innerHTML = this.generatePropertiesHTML(selectedObject);
        this.bindPropertiesEvents(selectedObject);
    }

    generatePropertiesHTML(obj) {
        let html = '<div class="prop-group"><h4>Transform</h4>';
        
        // Position
        html += `
            <div class="prop-grid">
                <div class="prop-group">
                    <label>X Position</label>
                    <input type="number" id="prop-left" value="${Math.round(obj.left || 0)}" step="1">
                </div>
                <div class="prop-group">
                    <label>Y Position</label>
                    <input type="number" id="prop-top" value="${Math.round(obj.top || 0)}" step="1">
                </div>
            </div>
        `;

        // Size (if applicable)
        if (obj.width !== undefined && obj.height !== undefined) {
            html += `
                <div class="prop-grid">
                    <div class="prop-group">
                        <label>Width</label>
                        <input type="number" id="prop-width" value="${Math.round(obj.width * (obj.scaleX || 1))}" step="1">
                    </div>
                    <div class="prop-group">
                        <label>Height</label>
                        <input type="number" id="prop-height" value="${Math.round(obj.height * (obj.scaleY || 1))}" step="1">
                    </div>
                </div>
            `;
        }

        // Rotation
        html += `
            <div class="prop-group">
                <label>Rotation: <span id="rotation-value">${Math.round(obj.angle || 0)}°</span></label>
                <input type="range" id="prop-angle" min="-180" max="180" value="${obj.angle || 0}" step="1">
            </div>
        `;

        html += '</div>';

        // Appearance
        html += '<div class="prop-group"><h4>Appearance</h4>';

        if (obj.fill !== undefined) {
            html += `
                <div class="prop-group">
                    <label>Fill Color</label>
                    <input type="color" id="prop-fill" value="${obj.fill || '#000000'}">
                </div>
            `;
        }

        if (obj.stroke !== undefined) {
            html += `
                <div class="prop-grid">
                    <div class="prop-group">
                        <label>Stroke Color</label>
                        <input type="color" id="prop-stroke" value="${obj.stroke || '#000000'}">
                    </div>
                    <div class="prop-group">
                        <label>Stroke Width</label>
                        <input type="number" id="prop-stroke-width" value="${obj.strokeWidth || 0}" min="0" step="1">
                    </div>
                </div>
            `;
        }

        // Opacity
        html += `
            <div class="prop-group">
                <label>Opacity: <span id="opacity-value">${Math.round((obj.opacity || 1) * 100)}%</span></label>
                <input type="range" id="prop-opacity" min="0" max="100" value="${(obj.opacity || 1) * 100}" step="1">
            </div>
        `;

        html += '</div>';

        // Text-specific properties
        if (obj.type === 'i-text' || obj.type === 'text') {
            html += '<div class="prop-group"><h4>Text</h4>';
            html += `
                <div class="prop-group">
                    <label>Font Family</label>
                    <select id="prop-font-family">
                        <option value="Inter" ${obj.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                        <option value="Arial" ${obj.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                        <option value="Helvetica" ${obj.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                        <option value="Times New Roman" ${obj.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                        <option value="Georgia" ${obj.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                    </select>
                </div>
                <div class="prop-grid">
                    <div class="prop-group">
                        <label>Font Size</label>
                        <input type="number" id="prop-font-size" value="${obj.fontSize || 16}" min="8" step="1">
                    </div>
                    <div class="prop-group">
                        <label>Font Weight</label>
                        <select id="prop-font-weight">
                            <option value="300" ${obj.fontWeight === '300' ? 'selected' : ''}>Light</option>
                            <option value="400" ${obj.fontWeight === '400' ? 'selected' : ''}>Normal</option>
                            <option value="500" ${obj.fontWeight === '500' ? 'selected' : ''}>Medium</option>
                            <option value="600" ${obj.fontWeight === '600' ? 'selected' : ''}>Semibold</option>
                            <option value="700" ${obj.fontWeight === '700' ? 'selected' : ''}>Bold</option>
                        </select>
                    </div>
                </div>
            `;
            html += '</div>';
        }

        return html;
    }

    bindPropertiesEvents(obj) {
        // Transform properties
        document.getElementById('prop-left')?.addEventListener('input', (e) => {
            obj.set('left', parseFloat(e.target.value));
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-top')?.addEventListener('input', (e) => {
            obj.set('top', parseFloat(e.target.value));
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-width')?.addEventListener('input', (e) => {
            const newWidth = parseFloat(e.target.value);
            obj.set('scaleX', newWidth / obj.width);
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-height')?.addEventListener('input', (e) => {
            const newHeight = parseFloat(e.target.value);
            obj.set('scaleY', newHeight / obj.height);
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-angle')?.addEventListener('input', (e) => {
            const angle = parseFloat(e.target.value);
            obj.set('angle', angle);
            document.getElementById('rotation-value').textContent = `${Math.round(angle)}°`;
            this.fabricCanvas?.renderAll();
        });

        // Appearance properties
        document.getElementById('prop-fill')?.addEventListener('input', (e) => {
            obj.set('fill', e.target.value);
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-stroke')?.addEventListener('input', (e) => {
            obj.set('stroke', e.target.value);
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-stroke-width')?.addEventListener('input', (e) => {
            obj.set('strokeWidth', parseFloat(e.target.value));
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-opacity')?.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value) / 100;
            obj.set('opacity', opacity);
            document.getElementById('opacity-value').textContent = `${Math.round(opacity * 100)}%`;
            this.fabricCanvas?.renderAll();
        });

        // Text properties
        document.getElementById('prop-font-family')?.addEventListener('change', (e) => {
            obj.set('fontFamily', e.target.value);
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-font-size')?.addEventListener('input', (e) => {
            obj.set('fontSize', parseFloat(e.target.value));
            this.fabricCanvas?.renderAll();
        });

        document.getElementById('prop-font-weight')?.addEventListener('change', (e) => {
            obj.set('fontWeight', e.target.value);
            this.fabricCanvas?.renderAll();
        });
    }

    clearPropertiesPanel() {
        const content = document.getElementById('properties-panel-content');
        const placeholder = document.getElementById('properties-panel-placeholder');
        
        if (content) content.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('color-picker');
        const currentColor = document.getElementById('color-current');
        const previousColor = document.getElementById('color-previous');

        colorPicker?.addEventListener('input', (e) => {
            this.setCurrentColor(e.target.value);
        });

        // Color swatches
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                if (color) {
                    this.setCurrentColor(color);
                }
            });
        });

        // Initialize colors
        this.setCurrentColor(this.currentColor);
    }

    setCurrentColor(color) {
        const previousColor = this.currentColor;
        this.currentColor = color;

        // Update UI
        const colorPicker = document.getElementById('color-picker');
        const currentColorEl = document.getElementById('color-current');
        const previousColorEl = document.getElementById('color-previous');

        if (colorPicker) colorPicker.value = color;
        if (currentColorEl) currentColorEl.style.background = color;
        if (previousColorEl) previousColorEl.style.background = previousColor;

        // Add to recent colors
        this.addToRecentColors(color);

        // Update brush color if in drawing mode
        if (this.fabricCanvas?.isDrawingMode) {
            this.fabricCanvas.freeDrawingBrush.color = color;
        }
    }

    addToRecentColors(color) {
        if (this.recentColors.includes(color)) return;

        this.recentColors.unshift(color);
        if (this.recentColors.length > 8) {
            this.recentColors.pop();
        }

        this.updateRecentColorsUI();
    }

    updateRecentColorsUI() {
        const recentColorsContainer = document.getElementById('recent-colors');
        if (!recentColorsContainer) return;

        recentColorsContainer.innerHTML = '';
        
        this.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.background = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => {
                this.setCurrentColor(color);
            });
            recentColorsContainer.appendChild(swatch);
        });
    }

    addToHistory(action, type) {
        // Remove any history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new history item
        this.history.push({
            action,
            type,
            timestamp: Date.now(),
            state: this.fabricCanvas ? JSON.stringify(this.fabricCanvas.toJSON()) : null
        });

        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }

        this.updateHistoryPanel();
        this.updateUndoRedoButtons();
    }

    updateHistoryPanel() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        historyList.innerHTML = '';

        this.history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            if (index === this.historyIndex) {
                historyItem.classList.add('active');
            }

            const iconMap = {
                canvas: 'fa-image',
                text: 'fa-font',
                shape: 'fa-shapes',
                edit: 'fa-edit',
                delete: 'fa-trash',
                import: 'fa-upload'
            };

            historyItem.innerHTML = `
                <div class="history-icon">
                    <i class="fas ${iconMap[item.type] || 'fa-edit'}"></i>
                </div>
                <div class="history-text">${item.action}</div>
            `;

            historyItem.addEventListener('click', () => {
                this.goToHistoryState(index);
            });

            historyList.appendChild(historyItem);
        });
    }

    goToHistoryState(index) {
        if (index < 0 || index >= this.history.length) return;

        this.historyIndex = index;
        const historyItem = this.history[index];

        if (historyItem.state && this.fabricCanvas) {
            this.fabricCanvas.loadFromJSON(historyItem.state, () => {
                this.fabricCanvas.renderAll();
                this.updateLayersPanel();
            });
        }

        this.updateHistoryPanel();
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.goToHistoryState(this.historyIndex - 1);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.goToHistoryState(this.historyIndex + 1);
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }

        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
        }
    }

    setupFileOperations() {
        // Image upload
        const imageUpload = document.getElementById('image-upload');
        const imageUploadBtn = document.getElementById('image-upload-btn');

        imageUploadBtn?.addEventListener('click', () => {
            imageUpload?.click();
        });

        imageUpload?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImageFile(file);
            }
        });

        // Menu actions
        document.getElementById('new-project')?.addEventListener('click', () => {
            this.newProject();
        });

        document.getElementById('open-image')?.addEventListener('click', () => {
            imageUpload?.click();
        });

        document.getElementById('save-project')?.addEventListener('click', () => {
            this.saveProject();
        });

        document.getElementById('export-png')?.addEventListener('click', () => {
            this.exportCanvas('png');
        });

        document.getElementById('export-jpg')?.addEventListener('click', () => {
            this.exportCanvas('jpeg');
        });

        document.getElementById('export-svg')?.addEventListener('click', () => {
            this.exportCanvas('svg');
        });
    }

    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                // Scale image to reasonable size
                const maxSize = 400;
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                
                img.set({
                    left: this.canvasSize.width / 2,
                    top: this.canvasSize.height / 2,
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale
                });

                this.fabricCanvas?.add(img);
                this.fabricCanvas?.setActiveObject(img);
                this.fabricCanvas?.renderAll();

                this.addToHistory('Image Added', 'import');
                
                // Show workspace if hidden
                if (this.isWorkspaceHidden) {
                    this.showWorkspace();
                }
            });
        };
        reader.readAsDataURL(file);
    }

    newProject() {
        this.showConfirm(
            'New Project',
            'Are you sure you want to create a new project? All unsaved changes will be lost.',
            () => {
                this.showCanvasSizeModal();
                if (this.fabricCanvas) {
                    this.fabricCanvas.clear();
                    this.fabricCanvas.backgroundColor = 'white';
                    this.fabricCanvas.renderAll();
                }
                this.history = [];
                this.historyIndex = -1;
                this.initializeLayers();
                this.updateHistoryPanel();
                this.updateUndoRedoButtons();
            }
        );
    }

    saveProject() {
        if (!this.fabricCanvas) return;

        const projectData = {
            canvas: this.fabricCanvas.toJSON(),
            canvasSize: this.canvasSize,
            selectedTemplate: this.selectedTemplate,
            timestamp: Date.now()
        };

        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `visual-composer-project-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    exportCanvas(format) {
        if (!this.fabricCanvas) return;

        let dataURL;
        let filename;

        switch (format) {
            case 'png':
                dataURL = this.fabricCanvas.toDataURL({
                    format: 'png',
                    quality: 1,
                    multiplier: 2 // Higher resolution
                });
                filename = `canvas-export-${Date.now()}.png`;
                break;
            case 'jpeg':
                dataURL = this.fabricCanvas.toDataURL({
                    format: 'jpeg',
                    quality: 0.9,
                    multiplier: 2
                });
                filename = `canvas-export-${Date.now()}.jpg`;
                break;
            case 'svg':
                const svgData = this.fabricCanvas.toSVG();
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(svgBlob);
                link.download = `canvas-export-${Date.now()}.svg`;
                link.click();
                URL.revokeObjectURL(link.href);
                return;
        }

        if (dataURL) {
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            link.click();
        }
    }

    showExportOptions() {
        // Simple export menu for now
        this.exportCanvas('png');
    }

    toggleAIPanel() {
        const aiPanel = document.getElementById('ai-panel');
        const isActive = aiPanel?.classList.contains('active');
        
        if (isActive) {
            this.hideAIPanel();
        } else {
            this.showAIPanel();
        }
    }

    showAIPanel() {
        const aiPanel = document.getElementById('ai-panel');
        aiPanel?.classList.add('active');
        this.panelStates.ai = true;
        
        // Load AI features if not already loaded
        this.loadAIFeatures();
    }

    hideAIPanel() {
        const aiPanel = document.getElementById('ai-panel');
        aiPanel?.classList.remove('active');
        this.panelStates.ai = false;
    }

    setupAIGeneration() {
        // AI close button
        document.getElementById('ai-close-btn')?.addEventListener('click', () => {
            this.hideAIPanel();
        });

        // Blur slider
        document.getElementById('ai-blur')?.addEventListener('input', (e) => {
            document.getElementById('blur-value').textContent = e.target.value;
        });

        // Generate button
        document.getElementById('generate-ai-image-btn')?.addEventListener('click', () => {
            this.generateAIImage();
        });

        // Regenerate button
        document.getElementById('regenerate-btn')?.addEventListener('click', () => {
            this.generateAIImage();
        });

        // Add to canvas button
        document.getElementById('add-to-canvas-btn')?.addEventListener('click', () => {
            this.addAIImageToCanvas();
        });
    }

    generateAIImage() {
        const prompt = document.getElementById('ai-prompt')?.value;
        if (!prompt?.trim()) {
            this.showAlert('Please enter a prompt to generate an image.');
            return;
        }

        const generateBtn = document.getElementById('generate-ai-image-btn');
        const resultDiv = document.getElementById('ai-result');
        
        // Show loading state
        if (generateBtn) {
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;
        }

        // Simulate AI generation (replace with actual API call)
        setTimeout(() => {
            this.simulateAIGeneration(prompt);
            
            if (generateBtn) {
                generateBtn.classList.remove('loading');
                generateBtn.disabled = false;
            }
        }, 2000);
    }

    simulateAIGeneration(prompt) {
        // For demo purposes, use a placeholder image service
        const width = 512;
        const height = 512;
        const imageUrl = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
        
        const resultDiv = document.getElementById('ai-result');
        const resultImage = document.getElementById('ai-generated-image');
        
        if (resultImage) {
            resultImage.src = imageUrl;
            resultImage.alt = `Generated: ${prompt}`;
        }
        
        if (resultDiv) {
            resultDiv.style.display = 'block';
        }

        // Store generated image data
        this.lastGeneratedImage = {
            url: imageUrl,
            prompt: prompt,
            width: width,
            height: height
        };
    }

    addAIImageToCanvas() {
        if (!this.lastGeneratedImage || !this.fabricCanvas) return;

        fabric.Image.fromURL(this.lastGeneratedImage.url, (img) => {
            // Set reasonable size (not too large or small)
            const maxSize = Math.min(this.canvasSize.width, this.canvasSize.height) * 0.6;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            
            img.set({
                left: this.canvasSize.width / 2,
                top: this.canvasSize.height / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale
            });

            this.fabricCanvas.add(img);
            this.fabricCanvas.setActiveObject(img);
            this.fabricCanvas.renderAll();

            this.addToHistory('AI Image Added', 'import');
            
            // Show workspace if hidden
            if (this.isWorkspaceHidden) {
                this.showWorkspace();
            }
            
            // Hide AI panel on mobile
            if (this.isMobile) {
                this.hideAIPanel();
            }
        });
    }

    setupMobileHandlers() {
        if (!this.isMobile) return;

        // Mobile menu toggle
        document.getElementById('mobile-menu-toggle-btn')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Mobile export button
        document.getElementById('mobile-export-btn')?.addEventListener('click', () => {
            this.exportCanvas('png');
        });

        // Close mobile menu
        document.querySelector('.mobile-menu-content .close-btn')?.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        document.querySelector('.mobile-menu-backdrop')?.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Copy desktop navigation to mobile
        this.setupMobileNavigation();
    }

    setupMobileNavigation() {
        const desktopNav = document.getElementById('desktop-nav');
        const mobileNavContent = document.getElementById('mobile-nav-content');
        
        if (desktopNav && mobileNavContent) {
            mobileNavContent.innerHTML = desktopNav.innerHTML;
        }
    }

    toggleMobileMenu() {
        const overlay = document.querySelector('.mobile-menu-overlay');
        overlay?.classList.toggle('active');
    }

    closeMobileMenu() {
        const overlay = document.querySelector('.mobile-menu-overlay');
        overlay?.classList.remove('active');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const isCtrl = e.ctrlKey || e.metaKey;

            switch (e.key.toLowerCase()) {
                case 'z':
                    if (isCtrl && !e.shiftKey) {
                        e.preventDefault();
                        this.undo();
                    } else if (isCtrl && e.shiftKey) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
                case 'y':
                    if (isCtrl) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
                case 'n':
                    if (isCtrl) {
                        e.preventDefault();
                        this.newProject();
                    }
                    break;
                case 's':
                    if (isCtrl) {
                        e.preventDefault();
                        this.saveProject();
                    }
                    break;
                case 'delete':
                case 'backspace':
                    if (this.fabricCanvas?.getActiveObject()) {
                        e.preventDefault();
                        this.deleteSelectedObject();
                    }
                    break;
                case 'v':
                    if (!isCtrl) {
                        this.selectTool('select');
                    }
                    break;
                case 't':
                    if (!isCtrl) {
                        this.selectTool('text');
                    }
                    break;
                case 'b':
                    if (!isCtrl) {
                        this.selectTool('brush');
                    }
                    break;
                case 'h':
                    if (!isCtrl) {
                        this.selectTool('hand');
                    }
                    break;
                case 'z':
                    if (!isCtrl) {
                        this.selectTool('zoom');
                    }
                    break;
                case 'escape':
                    this.deselectAll();
                    break;
            }
        });
    }

    deleteSelectedObject() {
        const activeObject = this.fabricCanvas?.getActiveObject();
        if (activeObject) {
            this.fabricCanvas.remove(activeObject);
            this.fabricCanvas.renderAll();
            this.addToHistory('Object Deleted', 'delete');
        }
    }

    deselectAll() {
        this.fabricCanvas?.discardActiveObject();
        this.fabricCanvas?.renderAll();
    }

    setupAccessibility() {
        // Add ARIA labels
        document.querySelectorAll('.tool-btn').forEach(btn => {
            const tool = btn.dataset.tool;
            const shape = btn.dataset.shape;
            const label = this.getToolLabel(tool, shape);
            btn.setAttribute('aria-label', label);
            btn.setAttribute('role', 'button');
        });

        // Add ARIA labels to panels
        document.querySelectorAll('.panel').forEach(panel => {
            const title = panel.querySelector('.panel-title')?.textContent;
            if (title) {
                panel.setAttribute('aria-label', title);
            }
        });

        // Add focus management
        this.setupFocusManagement();
    }

    getToolLabel(tool, shape) {
        const labels = {
            select: 'Select Tool',
            marquee: 'Marquee Selection',
            lasso: 'Lasso Tool',
            'magic-wand': 'Magic Wand',
            hand: 'Hand Tool',
            zoom: 'Zoom Tool',
            brush: 'Brush Tool',
            eraser: 'Eraser Tool',
            'clone-stamp': 'Clone Stamp',
            'color-picker': 'Color Picker',
            'fill-bucket': 'Fill Bucket',
            gradient: 'Gradient Tool',
            dodge: 'Dodge Tool',
            burn: 'Burn Tool',
            sponge: 'Sponge Tool',
            'history-brush': 'History Brush',
            text: 'Text Tool',
            pen: 'Pen Tool',
            'path-select': 'Path Selection',
            crop: 'Crop Tool'
        };

        if (tool === 'shape') {
            const shapeLabels = {
                rect: 'Rectangle',
                circle: 'Circle',
                line: 'Line',
                polygon: 'Polygon'
            };
            return shapeLabels[shape] || 'Shape Tool';
        }

        return labels[tool] || 'Tool';
    }

    setupFocusManagement() {
        // Trap focus in modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, modal);
                }
            });
        });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    loadLazyFeatures() {
        // Load AI features only when needed
        this.aiFeatures = null;
        
        // Load other heavy features on demand
        this.advancedFilters = null;
        this.vectorTools = null;
    }

    loadAIFeatures() {
        if (this.aiFeatures) return;

        // Simulate loading AI features
        this.aiFeatures = {
            models: ['imagen-3.0', 'imagen-2.0', 'dalle-3', 'midjourney'],
            styles: ['photorealistic', 'anime', 'digital-art', 'sketch', 'oil-painting', 'watercolor', 'minimalist'],
            loaded: true
        };
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 1024;

        if (wasMobile !== this.isMobile) {
            // Mobile/desktop transition
            this.setupMobileHandlers();
            
            // Close mobile panels if switching to desktop
            if (!this.isMobile) {
                document.querySelectorAll('.tools-panel, .right-panels, .ai-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                this.closeMobileMenu();
            }
        }

        // Recenter canvas
        if (this.fabricCanvas) {
            setTimeout(() => {
                this.centerCanvas();
            }, 100);
        }
    }

    toggleTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle?.querySelector('i');
        
        const isDark = body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            body.removeAttribute('data-theme');
            if (icon) {
                icon.className = 'fas fa-moon';
            }
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            if (icon) {
                icon.className = 'fas fa-sun';
            }
            localStorage.setItem('theme', 'dark');
        }
    }

    showAlert(message) {
        const modal = document.getElementById('custom-alert-modal');
        const messageEl = document.getElementById('custom-alert-message');
        const okBtn = document.getElementById('custom-alert-ok-btn');
        
        if (messageEl) messageEl.textContent = message;
        modal?.classList.add('active');
        
        const closeAlert = () => {
            modal?.classList.remove('active');
            okBtn?.removeEventListener('click', closeAlert);
        };
        
        okBtn?.addEventListener('click', closeAlert);
        
        // Auto-focus OK button
        setTimeout(() => okBtn?.focus(), 100);
    }

    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        modal?.classList.add('active');
        
        const closeConfirm = () => {
            modal?.classList.remove('active');
            okBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', closeConfirm);
        };
        
        const handleConfirm = () => {
            onConfirm();
            closeConfirm();
        };
        
        okBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', closeConfirm);
        
        // Auto-focus cancel button for safety
        setTimeout(() => cancelBtn?.focus(), 100);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle?.querySelector('i');
        if (icon) icon.className = 'fas fa-sun';
    }

    // Initialize the app
    window.visualComposer = new VisualComposerPro();
});

// Service Worker for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}