document.addEventListener('DOMContentLoaded', () => {
    // --- AI API KEY (Provided by user) ---
    // Note: In a real application, this should be handled securely on the backend.
    const AI_API_KEY = ''; 
    
    // --- DOM ELEMENT REFERENCES ---
    const mainLayout = document.querySelector('.main-layout');
    const canvasContainer = document.getElementById('canvas-container');
    const layersListEl = document.getElementById('layers-list');
    const propertiesPanelContent = document.getElementById('properties-panel-content');
    const propertiesPanelPlaceholder = document.getElementById('properties-panel-placeholder');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const imageUploadInput = document.getElementById('image-upload');
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const exportBtn = document.getElementById('export-btn');
    const mobileExportBtn = document.getElementById('mobile-export-btn');
    const canvasSizeSelect = document.getElementById('canvas-size');
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomLevelEl = document.getElementById('zoom-level');
    const cropActionsContainer = document.getElementById('crop-actions');
    const applyCropBtn = document.getElementById('apply-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const addLayerBtn = document.getElementById('add-new-layer-btn');

    // AI Generation Panel Elements
    const aiGenerationPanel = document.getElementById('ai-generation-panel');
    const generateAiImageBtn = document.getElementById('generate-ai-image-btn');
    const sendToEditBtn = document.getElementById('send-to-edit-btn');
    const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
    const aiModelSelect = document.getElementById('ai-model');
    const aiStylePresetSelect = document.getElementById('ai-style-preset');
    const aiAspectRatioSelect = document.getElementById('ai-aspect-ratio');
    const aiPromptInput = document.getElementById('ai-prompt');
    const aiNegativePromptInput = document.getElementById('ai-negative-prompt');
    const aiInpaintingPromptInput = document.getElementById('ai-inpainting-prompt');
    const aiOutpaintingPromptInput = document.getElementById('ai-outpainting-prompt');
    const aiNumImagesInput = document.getElementById('ai-num-images');
    const aiSamplingMethodSelect = document.getElementById('ai-sampling-method');
    const aiSamplingStepsInput = document.getElementById('ai-sampling-steps');
    const samplingStepsValueEl = document.getElementById('sampling-steps-value');
    const aiGuidanceScaleInput = document.getElementById('ai-guidance-scale');
    const guidanceScaleValueEl = document.getElementById('guidance-scale-value');
    const aiSeedInput = document.getElementById('ai-seed');
    const aiImageToImageUpload = document.getElementById('ai-image-to-image-upload');
    const aiImg2ImgPreview = document.getElementById('ai-img2img-preview');
    const aiImg2ImgBase64Data = document.getElementById('ai-img2img-base64-data');

    // Collapsible Panels
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    const allCollapsiblePanels = document.querySelectorAll('.collapsible-panel'); // All panels that can collapse
    const rightPanelsContainer = document.querySelector('.right-panels');
    const desktopNav = document.getElementById('desktop-nav'); // Reference to desktop nav
    const toolsPanel = document.querySelector('.tools-panel'); // Reference to tools panel

    // Mobile Bottom Bar Elements
    const mobileBottomBar = document.querySelector('.mobile-bottom-bar');
    const toggleToolsPanelBtn = document.getElementById('toggle-tools-panel-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    // Mobile Menu Overlay Elements
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileMenuCloseBtn = document.querySelector('.mobile-menu-overlay .close-btn');
    const mobileNavContent = document.getElementById('mobile-nav-content');

    let canvas;
    let activeTool = 'select'; // Default tool
    let cropRect = null;
    let currentSelectionRect = null;
    let isDrawingSelection = false;
    let isPanningCanvas = false; // Flag for hand tool / middle mouse button panning
    let lastPanPosX, lastPanPosY;
    let cloneSource = null;
    let colorPickerActive = false;
    let isDrawingShape = false;
    let startX, startY;
    let currentShape = null;

    // --- HISTORY MANAGEMENT ---
    const MAX_HISTORY_STEPS = 10;
    let history = [];
    let historyPointer = -1;
    let isSavingHistory = false;

    function saveCanvasState() {
        if (isSavingHistory) return;
        isSavingHistory = true;

        if (historyPointer < history.length - 1) {
            history = history.slice(0, historyPointer + 1);
        }

        const state = JSON.stringify(canvas.toJSON());
        history.push(state);

        if (history.length > MAX_HISTORY_STEPS) {
            history.shift();
        }
        historyPointer = history.length - 1;
        updateHistoryButtons();
        isSavingHistory = false;
    }

    function loadCanvasState(state) {
        isSavingHistory = true;
        canvas.loadFromJSON(state, () => {
            canvas.renderAll();
            updateUI(null, false);
            isSavingHistory = false;
        });
    }

    function undo() {
        if (historyPointer > 0) {
            historyPointer--;
            loadCanvasState(history[historyPointer]);
            updateHistoryButtons();
        }
    }

    function redo() {
        if (historyPointer < history.length - 1) {
            historyPointer++;
            loadCanvasState(history[historyPointer]);
            updateHistoryButtons();
        }
    }

    function updateHistoryButtons() {
        undoBtn.disabled = (historyPointer <= 0);
        redoBtn.disabled = (historyPointer >= history.length - 1);
    }

    // --- INITIALIZATION ---
    function initializeCanvas() {
        const { width, height } = getCanvasSize();
        canvas = new fabric.Canvas('main-canvas', {
            width: width,
            height: height,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true
        });

        canvas.on('object:modified', () => updateUI(null, true));
        canvas.on('object:added', () => updateUI(null, true));
        canvas.on('object:removed', () => updateUI(null, true));
        canvas.on('selection:created', (e) => updateUI(e, false));
        canvas.on('selection:updated', (e) => updateUI(e, false));
        canvas.on('selection:cleared', () => updateUI(null, false));

        resizeCanvasToFitContainer();
        setupCanvasListeners();
        setupEventListeners();
        setupThemeToggle();
        setupCollapsiblePanels();
        setupMenuSystem(); // For desktop dropdowns
        setupDraggablePanels();

        updateLayersPanel();
        updatePropertiesPanel();
        setActiveTool('select'); // Ensure the initial tool is 'select'
        updateZoomUI(canvas.getZoom());

        if (canvas.getObjects().length === 0) {
            const rect = new fabric.Rect({
                left: 100, top: 100, fill: '#7f5af0', width: 200, height: 150,
                name: 'Initial Shape', rx: 0, ry: 0
            });
            canvas.add(rect);
            canvas.centerObject(rect);
            canvas.setActiveObject(rect);
            saveCanvasState();
        }
        
        // Initial app mode based on screen width
        handleResize(); // Call on load to set initial mobile/desktop layout
        updateHistoryButtons();
    }

    // --- CANVAS & UI EVENT LISTENERS ---
    function setupCanvasListeners() {
        canvas.on({
            'mouse:wheel': handleMouseWheel,
            'mouse:down': handleMouseDown,
            'mouse:move': handleMouseMove,
            'mouse:up': handleMouseUp,
            'touch:gesture': handleTouchGesture,
            'touch:drag': handleTouchDrag,
        });
    }

    // Basic touch gesture for pinch-to-zoom
    function handleTouchGesture(opt) {
        const gesture = opt.e;
        if (gesture.touches && gesture.touches.length === 2) {
            const point = new fabric.Point(gesture.touches[0].clientX, gesture.touches[0].clientY);
            let zoom = canvas.getZoom();
            if (gesture.scale !== 1) {
                zoom *= gesture.scale;
                if (zoom > 20) zoom = 20;
                if (zoom < 0.1) zoom = 0.1;
                canvas.zoomToPoint(point, zoom);
                updateZoomUI(zoom);
                gesture.preventDefault();
                gesture.stopPropagation();
            }
        }
    }

    let isTouchPanning = false;
    let lastTouchPosX, lastTouchPosY;

    // Basic touch drag for panning
    function handleTouchDrag(opt) {
        const e = opt.e;
        if (e.touches && e.touches.length === 1) {
            if (!isTouchPanning) {
                isTouchPanning = true;
                lastTouchPosX = e.touches[0].clientX;
                lastTouchPosY = e.touches[0].clientY;
            } else {
                const vpt = canvas.viewportTransform;
                vpt[4] += e.touches[0].clientX - lastTouchPosX;
                vpt[5] += e.touches[0].clientY - lastTouchPosY;
                canvas.requestRenderAll();
                lastTouchPosX = e.touches[0].clientX;
                lastTouchPosY = e.touches[0].clientY;
            }
            e.preventDefault();
            e.stopPropagation();
        } else {
            isTouchPanning = false;
        }
    }

    function setupEventListeners() {
        window.addEventListener('resize', handleResize);
        toolButtons.forEach(btn => btn.addEventListener('click', () => {
            handleToolClick(btn.dataset.tool, btn.dataset.shape);
        }));
        imageUploadBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageUpload);
        exportBtn.addEventListener('click', exportCanvas);
        mobileExportBtn.addEventListener('click', exportCanvas);
        canvasSizeSelect.addEventListener('change', changeCanvasSize);
        zoomSlider.addEventListener('input', handleZoomSlider);
        applyCropBtn.addEventListener('click', applyCrop);
        cancelCropBtn.addEventListener('click', cancelCrop);
        document.addEventListener('keydown', handleKeyDown);
        themeToggleBtn.addEventListener('click', toggleTheme);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        generateAiImageBtn.addEventListener('click', generateImage);
        sendToEditBtn.addEventListener('click', () => {
            const imgUrl = aiImg2ImgPreview.src;
            if (imgUrl) {
                fabric.Image.fromURL(imgUrl, (img) => {
                    img.set({ name: 'AI Generated Image' });
                    img.scaleToWidth(canvas.getWidth() * 0.8);
                    canvas.add(img);
                    img.center();
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                    updateUI(null, true);
                    setAppMode('edit');
                });
            } else {
                showCustomAlert('No AI generated image to send to canvas.');
            }
        });
        
        // Mobile Menu Toggle (for desktop nav)
        mobileMenuToggleBtn.addEventListener('click', () => {
            mobileMenuOverlay.classList.toggle('open');
        });
        mobileMenuCloseBtn.addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('open');
        });

        // Event delegation for mobile menu links (if dynamically added)
        mobileNavContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('menu-link') || e.target.closest('.dropdown-menu a')) {
                mobileMenuOverlay.classList.remove('open'); // Close menu when a link is clicked
            }
        });

        aiSamplingStepsInput.addEventListener('input', (e) => {
            samplingStepsValueEl.textContent = e.target.value;
        });
        aiGuidanceScaleInput.addEventListener('input', (e) => {
            guidanceScaleValueEl.textContent = e.target.value;
        });
        aiImageToImageUpload.addEventListener('change', handleAiImageToImageUpload);
        
        // --- MOBILE PANEL TOGGLING (REFACTORED AND FIXED) ---
        mobileBottomBar.querySelectorAll('button[data-panel-target]').forEach(button => {
            button.addEventListener('click', () => {
                const targetPanelId = button.dataset.panelTarget;
                const targetPanel = document.getElementById(targetPanelId);
                const isAlreadyActive = button.classList.contains('active');

                // 1. Deactivate everything first for a clean state.
                mobileBottomBar.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                toolsPanel.classList.remove('mobile-active');
                rightPanelsContainer.classList.remove('mobile-active');
                allCollapsiblePanels.forEach(panel => panel.classList.remove('mobile-active'));

                // 2. If the clicked button was NOT active, activate the new panel.
                if (!isAlreadyActive) {
                    button.classList.add('active');
                    
                    if (targetPanelId === 'tools-panel') {
                        // Handle the unique Tools Panel
                        toolsPanel.classList.add('mobile-active');
                    } else {
                        // Handle all panels inside the right container
                        targetPanel.classList.add('mobile-active');
                        rightPanelsContainer.classList.add('mobile-active');
                    }

                    setAppMode(targetPanelId === 'ai-generation-panel' ? 'generate' : 'edit');
                } else {
                    // 3. If it was already active, clicking again just closes it.
                    // Everything is already hidden from step 1, so just reset the app mode.
                    setAppMode('edit');
                }
            });
        });

        addLayerBtn.addEventListener('click', addNewLayer);
    }
    
    function handleResize() {
        resizeCanvasToFitContainer();
        populateMobileMenu();

        if (window.innerWidth <= 768) {
            mobileBottomBar.style.display = 'flex';
            desktopNav.style.display = 'none';
            mobileMenuOverlay.classList.remove('open');
            
            // On mobile, if no panel is active, deactivate all containers.
            if (!mobileBottomBar.querySelector('button.active')) {
                toolsPanel.classList.remove('mobile-active');
                rightPanelsContainer.classList.remove('mobile-active');
            }

        } else {
            mobileBottomBar.style.display = 'none';
            desktopNav.style.display = 'flex';
            
            // Reset mobile-specific classes
            toolsPanel.classList.remove('mobile-active');
            rightPanelsContainer.classList.remove('mobile-active');
            allCollapsiblePanels.forEach(panel => {
                panel.classList.remove('mobile-active'); 
                panel.classList.remove('collapsed');
            });
            mobileMenuOverlay.classList.remove('open');
            setAppMode('edit');
        }
        updateUI(null, false);
    }
    
    function addNewLayer() {
        const rect = new fabric.Rect({
            left: 50, top: 50, fill: '#ffffff', width: 100, height: 100,
            name: 'New Empty Layer', rx: 0, ry: 0,
            opacity: 1
        });
        canvas.add(rect);
        canvas.centerObject(rect);
        canvas.setActiveObject(rect);
        updateUI(null, true);
    }

    // --- THEME TOGGLE ---
    function setupThemeToggle() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.querySelector('i').className = 'fas fa-sun';
        } else {
            document.body.classList.remove('light-mode');
            themeToggleBtn.querySelector('i').className = 'fas fa-moon';
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeToggleBtn.querySelector('i').className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    }

    // --- COLLAPSIBLE PANELS (Desktop behavior) ---
    function setupCollapsiblePanels() {
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', () => {
                if (window.innerWidth > 768) {
                    const panel = header.closest('.collapsible-panel');
                    panel.classList.toggle('collapsed');
                }
            });
        });
    }

    // --- MOBILE MENU SYSTEM ---
    function populateMobileMenu() {
        mobileNavContent.innerHTML = '';
        desktopNav.querySelectorAll('.menu-item').forEach(menuItem => {
            const clonedItem = menuItem.cloneNode(true);
            const dropdown = clonedItem.querySelector('.dropdown-menu');
            if (dropdown) {
                dropdown.style.display = 'flex';
                dropdown.classList.add('mobile-dropdown-menu');
            }
            clonedItem.removeEventListener('mouseenter', () => {});
            clonedItem.removeEventListener('mouseleave', () => {});
            mobileNavContent.appendChild(clonedItem);
        });
    }

    // --- UI UPDATE ORCHESTRATOR ---
    function updateUI(e, saveToHistory = true) {
        updateLayersPanel();
        updatePropertiesPanel(e ? (e.target || e) : null);
        if (saveToHistory) {
            saveCanvasState();
        }
    }

    // --- CANVAS SIZING AND RESIZING ---
    function resizeCanvasToFitContainer() {
        const containerWidth = canvasContainer.offsetWidth;
        const containerHeight = canvasContainer.offsetHeight;
        canvas.setDimensions({ width: containerWidth, height: containerHeight });
        canvas.renderAll();
    }

    function changeCanvasSize() {
        const [width, height] = canvasSizeSelect.value.split('x').map(Number);
        canvas.clear();
        canvas.setDimensions({ width: width, height: height });
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        updateUI(null);
    }

    function getCanvasSize() {
        const [width, height] = canvasSizeSelect.value.split('x').map(Number);
        return { width, height };
    }

    // --- TOOL MANAGEMENT ---
    function handleToolClick(tool, shape) {
        setActiveTool(tool);
        if (tool === 'shape' && shape) {
            activeTool = 'shape-draw';
            currentShape = shape;
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
        }
    }

    function setActiveTool(tool) {
        activeTool = tool;
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        cropActionsContainer.style.display = 'none';

        if(cropRect) {
            canvas.remove(cropRect);
            cropRect = null;
        }
        if (currentSelectionRect) {
            canvas.remove(currentSelectionRect);
            currentSelectionRect = null;
        }
        
        toolButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        canvas.freeDrawingBrush.globalCompositeOperation = 'source-over'; 
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 5;

        switch (tool) {
            case 'select':
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                break;
            case 'hand':
                canvas.selection = false;
                canvas.defaultCursor = 'grab';
                break;
            case 'zoom':
                canvas.selection = false;
                canvas.defaultCursor = 'zoom-in';
                break;
            case 'brush':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = '#000000';
                canvas.freeDrawingBrush.width = 5;
                break;
            case 'eraser':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = '#ffffff';
                canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
                canvas.freeDrawingBrush.width = 20;
                break;
            case 'color-picker':
                canvas.selection = false;
                canvas.defaultCursor = 'copy';
                colorPickerActive = true;
                showCustomAlert('Click on any pixel on the canvas to pick its color.');
                break;
            case 'text':
                canvas.selection = false;
                canvas.defaultCursor = 'text';
                addText();
                break;
            case 'shape':
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                break;
            case 'crop':
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                break;
            default:
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                break;
        }
        updatePropertiesPanel(null);
        canvas.renderAll();
    }
    
    // --- OBJECT CREATION ---
    function addText() {
        const text = new fabric.IText('Double click to edit', {
            left: canvas.getWidth() / 2, top: canvas.getHeight() / 2,
            fontSize: 48, fill: '#333333', fontFamily: 'Inter', name: 'Text Layer'
        });
        canvas.add(text);
        text.center();
        canvas.setActiveObject(text);
        saveCanvasState();
    }

    function createShape(shapeType, x, y, width, height) {
        let shape;
        const commonProps = {
            left: x, top: y,
            fill: '#2cb67d', stroke: '#000000', strokeWidth: 0,
            name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Layer`
        };

        if (shapeType === 'rect') {
            shape = new fabric.Rect({...commonProps, width: width, height: height, rx: 0, ry: 0 });
        } else if (shapeType === 'circle') {
            const radius = Math.min(width, height) / 2;
            shape = new fabric.Circle({ ...commonProps, radius: radius, left: x + radius, top: y + radius });
        } else if (shapeType === 'line') {
            shape = new fabric.Line([x, y, x + width, y + height], {
                stroke: '#000000',
                strokeWidth: 5,
                name: 'Line Layer'
            });
        }
        return shape;
    }
    
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.set({ name: file.name || 'Image Layer' });
                img.scaleToWidth(canvas.getWidth() * 0.5);
                canvas.add(img);
                img.center();
                canvas.setActiveObject(img);
                canvas.renderAll();
                updateUI(null, true);
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }
    
    // --- PAN & ZOOM ---
    function handleMouseDown(opt) {
        const evt = opt.e;
        if (activeTool === 'hand' || evt.button === 1) { // Hand tool or middle mouse button
            isPanningCanvas = true;
            canvas.selection = false;
            canvas.defaultCursor = 'grabbing';
            lastPanPosX = evt.clientX;
            lastPanPosY = evt.clientY;
        } else if (activeTool === 'crop' && !canvas.getActiveObject() && !cropRect) {
            const pointer = canvas.getPointer(evt);
            cropRect = new fabric.Rect({
                left: pointer.x, top: pointer.y, width: 0, height: 0,
                fill: 'rgba(0,0,0,0.3)', stroke: 'rgba(255,255,255,0.5)', strokeDashArray: [4, 4],
                selectable: false, evented: false,
            });
            canvas.add(cropRect);
        } else if (activeTool === 'zoom') {
            const pointer = canvas.getPointer(evt);
            if (evt.shiftKey) {
                zoomCanvas(pointer, 0.9);
            } else {
                zoomCanvas(pointer, 1.1);
            }
        } else if (activeTool === 'color-picker') {
            const pointer = canvas.getPointer(evt);
            const ctx = canvas.getContext();
            const pixel = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
            const color = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;
            showCustomAlert(`Picked color: ${color}`);
            setActiveTool('select');
        } else if (activeTool === 'shape-draw' && !isDrawingShape) {
            isDrawingShape = true;
            const pointer = canvas.getPointer(evt);
            startX = pointer.x;
            startY = pointer.y;
            currentShape = createShape(currentShape, startX, startY, 0, 0);
            canvas.add(currentShape);
        }
    }

    function handleMouseMove(opt) {
        const evt = opt.e;
        if (isPanningCanvas) {
            const vpt = canvas.viewportTransform;
            vpt[4] += evt.clientX - lastPanPosX;
            vpt[5] += evt.clientY - lastPanPosY;
            canvas.requestRenderAll();
            lastPanPosX = evt.clientX; lastPanPosY = evt.clientY;
        } else if (activeTool === 'crop' && cropRect) {
            const pointer = canvas.getPointer(evt);
            let width = pointer.x - cropRect.left;
            let height = pointer.y - cropRect.top;

            if (width < 0) { cropRect.set({ left: pointer.x }); width = Math.abs(width); }
            if (height < 0) { cropRect.set({ top: pointer.y }); height = Math.abs(height); }
            cropRect.set({ width: width, height: height });
            canvas.renderAll();
        } else if (activeTool === 'shape-draw' && isDrawingShape && currentShape) {
            const pointer = canvas.getPointer(evt);
            const width = pointer.x - startX;
            const height = pointer.y - startY;

            if (currentShape.type === 'rect' || currentShape.type === 'circle') {
                currentShape.set({
                    left: Math.min(startX, pointer.x),
                    top: Math.min(startY, pointer.y),
                    width: Math.abs(width),
                    height: Math.abs(height)
                });
                if (currentShape.type === 'circle') {
                    currentShape.set({ radius: Math.min(Math.abs(width), Math.abs(height)) / 2 });
                    currentShape.set({ left: Math.min(startX, pointer.x) + currentShape.radius, top: Math.min(startY, pointer.y) + currentShape.radius });
                }
            } else if (currentShape.type === 'line') {
                currentShape.set({ x2: pointer.x, y2: pointer.y });
            }
            canvas.renderAll();
        }
    }

    function handleMouseUp(opt) {
        if (isPanningCanvas) {
            isPanningCanvas = false;
            canvas.defaultCursor = 'grab';
        } else if (activeTool === 'crop' && cropRect && cropRect.width > 0 && cropRect.height > 0) {
            const hasOtherObjects = canvas.getObjects().some(obj => obj !== cropRect);
            if (hasOtherObjects) {
                cropActionsContainer.style.display = 'flex';
            } else {
                cancelCrop();
            }
        } else if (activeTool === 'shape-draw' && isDrawingShape) {
            isDrawingShape = false;
            if (currentShape) {
                canvas.setActiveObject(currentShape);
                updateUI(null, true);
                currentShape = null;
            }
            setActiveTool('select');
        }
        if (!canvas.isDrawingMode && activeTool !== 'hand' && activeTool !== 'zoom' && activeTool !== 'color-picker') {
            canvas.selection = true;
        }
    }

    function handleMouseWheel(opt) {
        const delta = opt.e.deltaY;
        const pointer = canvas.getPointer(opt.e);
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint(pointer, zoom);
        updateZoomUI(zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    }

    function zoomCanvas(point, factor) {
        let zoom = canvas.getZoom() * factor;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint(point, zoom);
        updateZoomUI(zoom);
    }
    
    function handleZoomSlider(e) {
        const zoom = parseFloat(e.target.value) / 100;
        canvas.zoomToPoint(new fabric.Point(canvas.width / 2, canvas.height / 2), zoom);
        updateZoomUI(zoom);
    }
    
    function updateZoomUI(zoom) {
        zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
        zoomSlider.value = zoom * 100;
    }

    // --- CROP LOGIC ---
    function applyCrop() {
        if (!cropRect) return;

        const objectsToCrop = canvas.getObjects().filter(obj => obj !== cropRect);
        if (objectsToCrop.length === 0) {
            cancelCrop();
            return;
        }

        const originalActiveObject = canvas.getActiveObject();
        canvas.discardActiveObject();

        const tempGroup = new fabric.Group(objectsToCrop, {
            selectable: false, evented: false
        });
        canvas.add(tempGroup);
        canvas.renderAll();

        const croppedData = canvas.toDataURL({
            left: cropRect.left,
            top: cropRect.top,
            width: cropRect.width,
            height: cropRect.height,
            format: 'png',
            quality: 1.0
        });

        canvas.clear();
        
        fabric.Image.fromURL(croppedData, (img) => {
            canvas.setDimensions({ width: img.width, height: img.height });
            canvas.add(img);
            img.center();
            canvas.setActiveObject(img);
            canvas.renderAll();
            updateUI(null, true);
        });

        cancelCrop();
    }

    function cancelCrop() {
        if (cropRect) canvas.remove(cropRect);
        cropRect = null;
        cropActionsContainer.style.display = 'none';
        setActiveTool('select');
        canvas.discardActiveObject().renderAll();
    }

    // --- LAYER & PROPERTIES PANEL LOGIC ---
    function updateLayersPanel() {
        layersListEl.innerHTML = '';
        const objects = canvas.getObjects().filter(obj => 
            obj !== cropRect && obj !== currentSelectionRect
        ).slice().reverse();
        
        objects.forEach((obj) => {
            const item = createLayerItem(obj);
            layersListEl.appendChild(item);
        });
    }

    function createLayerItem(obj) {
        const item = document.createElement('li');
        item.className = 'layer-item';
        const fabricIndex = canvas.getObjects().indexOf(obj);
        item.dataset.fabricIndex = fabricIndex; 

        if (obj === canvas.getActiveObject()) item.classList.add('selected');
        if (!obj.visible) item.classList.add('hidden-layer');
        if (!obj.selectable) item.classList.add('locked-layer');
        
        const iconClass = { 
            'i-text': 'fa-font', 
            'rect': 'fa-square', 
            'circle': 'fa-circle', 
            'image': 'fa-image', 
            'path': 'fa-paint-brush',
            'line': 'fa-minus'
        }[obj.type] || 'fa-cube';

        item.innerHTML = `
            <div class="layer-name">
                <i class="fas ${iconClass}"></i>
                <span>${obj.name || `Layer ${canvas.getObjects().length - fabricIndex}`}</span>
            </div>
            <div class="layer-controls">
                <button class="lock-layer"><i class="fas ${obj.selectable ? 'fa-unlock' : 'fa-lock'}"></i></button>
                <button class="toggle-visibility"><i class="fas ${obj.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.layer-controls')) {
                canvas.setActiveObject(obj);
                canvas.renderAll();
            }
        });
        item.querySelector('.lock-layer').addEventListener('click', (e) => {
            e.stopPropagation();
            obj.set({ selectable: !obj.selectable, hasControls: !obj.selectable, hasBorders: !obj.selectable });
            canvas.renderAll();
            updateUI(null, true);
        });
        item.querySelector('.toggle-visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            obj.set('visible', !obj.visible);
            canvas.renderAll();
            updateUI(null, true);
        });
        
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.fabricIndex);
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.layer-item');
            if (targetItem) {
                targetItem.classList.add('drag-over');
            }
        });
        item.addEventListener('dragleave', (e) => {
             const targetItem = e.target.closest('.layer-item');
             if (targetItem) {
                targetItem.classList.remove('drag-over');
            }
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.layer-item.drag-over').forEach(el => el.classList.remove('drag-over'));

            const draggedFabricIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropTargetItem = e.target.closest('.layer-item');
            if (!dropTargetItem) return;
            const dropFabricIndex = parseInt(dropTargetItem.dataset.fabricIndex);
            
            const objects = canvas.getObjects();
            const [removed] = objects.splice(draggedFabricIndex, 1);
            objects.splice(dropFabricIndex, 0, removed);
            canvas._objects = objects;
            
            canvas.renderAll();
            updateUI(null, true);
        });
        item.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.layer-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        return item;
    }

    function updatePropertiesPanel(obj) {
        propertiesPanelContent.innerHTML = '';
        
        if (obj || activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'color-picker') {
            propertiesPanelContent.style.display = 'flex';
            propertiesPanelPlaceholder.style.display = 'none';

            if (obj) {
                 propertiesPanelContent.innerHTML += `<h3 class="panel-title">${obj.name}</h3>`;
                const commonProps = `
                    <div class="prop-group">
                        <label>Opacity</label>
                        <input type="range" min="0" max="1" step="0.01" value="${obj.opacity}" data-prop="opacity">
                    </div>
                    <div class="prop-grid">
                        <div class="prop-group"><label>X</label><input type="number" value="${Math.round(obj.left)}" data-prop="left"></div>
                        <div class="prop-group"><label>Y</label><input type="number" value="${Math.round(obj.top)}" data-prop="top"></div>
                    </div>
                    <div class="prop-group">
                        <label>Rotation</label>
                        <input type="range" min="0" max="360" value="${Math.round(obj.angle)}" data-prop="angle">
                    </div>
                    <div class="prop-group">
                        <label>Blend Mode</label>
                        <select data-prop="globalCompositeOperation">
                            <option value="source-over" ${obj.globalCompositeOperation === 'source-over' ? 'selected' : ''}>Normal</option>
                            <option value="multiply" ${obj.globalCompositeOperation === 'multiply' ? 'selected' : ''}>Multiply</option>
                            <option value="screen" ${obj.globalCompositeOperation === 'screen' ? 'selected' : ''}>Screen</option>
                            <option value="overlay" ${obj.globalCompositeOperation === 'overlay' ? 'selected' : ''}>Overlay</option>
                            <option value="darken" ${obj.globalCompositeOperation === 'darken' ? 'selected' : ''}>Darken</option>
                            <option value="lighten" ${obj.globalCompositeOperation === 'lighten' ? 'selected' : ''}>Lighten</option>
                            <option value="color-dodge" ${obj.globalCompositeOperation === 'color-dodge' ? 'selected' : ''}>Color Dodge</option>
                            <option value="color-burn" ${obj.globalCompositeOperation === 'color-burn' ? 'selected' : ''}>Color Burn</option>
                            <option value="hard-light" ${obj.globalCompositeOperation === 'hard-light' ? 'selected' : ''}>Hard Light</option>
                            <option value="soft-light" ${obj.globalCompositeOperation === 'soft-light' ? 'selected' : ''}>Soft Light</option>
                            <option value="difference" ${obj.globalCompositeOperation === 'difference' ? 'selected' : ''}>Difference</option>
                            <option value="exclusion" ${obj.globalCompositeOperation === 'exclusion' ? 'selected' : ''}>Exclusion</option>
                            <option value="hue" ${obj.globalCompositeOperation === 'hue' ? 'selected' : ''}>Hue</option>
                            <option value="saturation" ${obj.globalCompositeOperation === 'saturation' ? 'selected' : ''}>Saturation</option>
                            <option value="color" ${obj.globalCompositeOperation === 'color' ? 'selected' : ''}>Color</option>
                            <option value="luminosity" ${obj.globalCompositeOperation === 'luminosity' ? 'selected' : ''}>Luminosity</option>
                        </select>
                    </div>`;
                propertiesPanelContent.innerHTML += commonProps;
                
                if (obj.type === 'i-text') {
                    const textProps = `<div class="prop-group"><label>Font Size</label><input type="number" value="${obj.fontSize}" data-prop="fontSize"></div>
                                       <div class="prop-group"><label>Fill Color</label><input type="color" value="${obj.fill}" data-prop="fill"></div>
                                       <div class="prop-group"><label>Font Family</label><input type="text" value="${obj.fontFamily}" data-prop="fontFamily"></div>`;
                    propertiesPanelContent.innerHTML += textProps;
                } else if (obj.type === 'rect') {
                    const rectProps = `<div class="prop-group"><label>Fill Color</label><input type="color" value="${obj.fill}" data-prop="fill"></div>
                                        <div class="prop-group"><label>Stroke Color</label><input type="color" value="${obj.stroke}" data-prop="stroke"></div>
                                        <div class="prop-group"><label>Stroke Width</label><input type="number" value="${obj.strokeWidth}" data-prop="strokeWidth"></div>
                                        <div class="prop-group"><label>Border Radius</label><input type="number" min="0" value="${obj.rx}" data-prop="rx"></div>`;
                    propertiesPanelContent.innerHTML += rectProps;
                } else if (obj.type === 'circle') {
                     const circleProps = `<div class="prop-group"><label>Fill Color</label><input type="color" value="${obj.fill}" data-prop="fill"></div>
                                        <div class="prop-group"><label>Stroke Color</label><input type="color" value="${obj.stroke}" data-prop="stroke"></div>
                                        <div class="prop-group"><label>Stroke Width</label><input type="number" value="${obj.strokeWidth}" data-prop="strokeWidth"></div>`;
                    propertiesPanelContent.innerHTML += circleProps;
                } else if (obj.type === 'image') {
                    const imageProps = `<div class="prop-group">
                                            <label>Image Filters</label>
                                            <button id="add-blur-filter-btn" class="primary-btn">Add Blur</button>
                                        </div>`;
                    propertiesPanelContent.innerHTML += imageProps;
                } else if (obj.type === 'path' || obj.type === 'line') {
                     const pathProps = `<div class="prop-group"><label>Stroke Color</label><input type="color" value="${obj.stroke}" data-prop="stroke"></div>
                                        <div class="prop-group"><label>Stroke Width</label><input type="number" value="${obj.strokeWidth}" data-prop="strokeWidth"></div>
                                        <div class="prop-group"><label>Line Cap</label>
                                            <select data-prop="strokeLineCap">
                                                <option value="butt" ${obj.strokeLineCap === 'butt' ? 'selected' : ''}>Butt</option>
                                                <option value="round" ${obj.strokeLineCap === 'round' ? 'selected' : ''}>Round</option>
                                                <option value="square" ${obj.strokeLineCap === 'square' ? 'selected' : ''}>Square</option>
                                            </select>
                                        </div>
                                        <div class="prop-group"><label>Line Join</label>
                                            <select data-prop="strokeLineJoin">
                                                <option value="miter" ${obj.strokeLineJoin === 'miter' ? 'selected' : ''}>Miter</option>
                                                <option value="round" ${obj.strokeLineJoin === 'round' ? 'selected' : ''}>Round</option>
                                                <option value="bevel" ${obj.strokeLineJoin === 'bevel' ? 'selected' : ''}>Bevel</option>
                                            </select>
                                        </div>`;
                     propertiesPanelContent.innerHTML += pathProps;
                }

            } else if (activeTool === 'brush' || activeTool === 'eraser') {
                 propertiesPanelContent.innerHTML += `<h3 class="panel-title">${activeTool === 'eraser' ? 'Eraser' : 'Brush'} Tool</h3>`;
                 const brushToolProps = `<div class="prop-group">
                                         ${activeTool === 'brush' ? `<label>Brush Color</label><input type="color" value="${canvas.freeDrawingBrush.color}" data-tool-prop="color">` : ''}
                                     </div>
                                     <div class="prop-group"><label>Brush Size</label><input type="range" min="1" max="100" value="${canvas.freeDrawingBrush.width}" data-tool-prop="width"></div>
                                     <div class="prop-group"><label>Line Cap</label>
                                        <select data-tool-prop="strokeLineCap">
                                            <option value="butt" ${canvas.freeDrawingBrush.strokeLineCap === 'butt' ? 'selected' : ''}>Butt</option>
                                            <option value="round" ${canvas.freeDrawingBrush.strokeLineCap === 'round' ? 'selected' : ''}>Round</option>
                                            <option value="square" ${canvas.freeDrawingBrush.strokeLineCap === 'square' ? 'selected' : ''}>Square</option>
                                        </select>
                                    </div>
                                    <div class="prop-group"><label>Line Join</label>
                                        <select data-tool-prop="strokeLineJoin">
                                            <option value="miter" ${canvas.freeDrawingBrush.strokeLineCap === 'miter' ? 'selected' : ''}>Miter</option>
                                            <option value="round" ${canvas.freeDrawingBrush.strokeLineCap === 'round' ? 'selected' : ''}>Round</option>
                                            <option value="bevel" ${canvas.freeDrawingBrush.strokeLineJoin === 'bevel' ? 'selected' : ''}>Bevel</option>
                                        </select>
                                    </div>`;
                 propertiesPanelContent.innerHTML += brushToolProps;
            } else if (activeTool === 'color-picker') {
                propertiesPanelContent.innerHTML += `<h3 class="panel-title">Color Picker</h3>
                    <p>Click on the canvas to select a color.</p>
                    <div class="prop-group">
                        <label>Last Picked Color:</label>
                        <input type="color" id="last-picked-color" value="#000000" disabled>
                    </div>`;
            } else if (activeTool === 'crop') {
                propertiesPanelContent.innerHTML += `<h3 class="panel-title">Crop Tool</h3>
                    <p>Drag on the canvas to define a crop area.</p>`;
            } else if (activeTool === 'zoom') {
                 propertiesPanelContent.innerHTML += `<h3 class="panel-title">Zoom Tool</h3>
                    <p>Click to zoom in. Shift + click to zoom out. Use scroll wheel for continuous zoom.</p>`;
            } else if (activeTool === 'hand') {
                propertiesPanelContent.innerHTML += `<h3 class="panel-title">Hand Tool</h3>
                    <p>Drag the canvas to pan around.</p>`;
            } else if (activeTool.startsWith('shape')) {
                propertiesPanelContent.innerHTML += `<h3 class="panel-title">Shape Tool</h3>
                    <p>Select a shape from the left panel, then drag on the canvas to draw it.</p>`;
            }


            propertiesPanelContent.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('input', (e) => {
                    const prop = e.target.dataset.prop;
                    const toolProp = e.target.dataset.toolProp;
                    let value = e.target.value;
                    if (e.target.type === 'number' || e.target.type === 'range') value = parseFloat(value);
                    
                    if(prop && obj) {
                        obj.set(prop, value);
                        if (prop === 'rx') obj.set('ry', value);
                    }
                    if(toolProp) canvas.freeDrawingBrush[toolProp] = value;
                    
                    canvas.renderAll();
                });
            });

            const addBlurFilterBtn = document.getElementById('add-blur-filter-btn');
            if (addBlurFilterBtn) {
                addBlurFilterBtn.addEventListener('click', () => {
                    const activeObject = canvas.getActiveObject();
                    if (activeObject && activeObject.type === 'image') {
                        activeObject.filters.push(new fabric.Image.filters.Blur({
                            blur: 0.5
                        }));
                        activeObject.applyFilters();
                        canvas.renderAll();
                        saveCanvasState();
                        showCustomAlert('Blur filter applied. Further controls for blur amount coming soon!');
                    }
                });
            }
        } else {
            propertiesPanelContent.style.display = 'none';
            propertiesPanelPlaceholder.style.display = 'flex';
        }
    }

    // --- AI GENERATION FUNCTIONS ---
    async function generateImage() {
        showCustomAlert('Generating image... This may take a moment.');
        generateAiImageBtn.disabled = true;
        sendToEditBtn.classList.add('hidden');

        const model = aiModelSelect.value;
        const prompt = aiPromptInput.value;
        const negative_prompt = aiNegativePromptInput.value;
        const style_preset = aiStylePresetSelect.value === 'none' ? undefined : aiStylePresetSelect.value;
        const aspect_ratio = aiAspectRatioSelect.value;
        const num_images = parseInt(aiNumImagesInput.value);
        const sampling_method = aiSamplingMethodSelect.value;
        const sampling_steps = parseInt(aiSamplingStepsInput.value);
        const guidance_scale = parseFloat(aiGuidanceScaleInput.value);
        const seed = aiSeedInput.value ? parseInt(aiSeedInput.value) : undefined;
        const img2img_base64 = aiImg2ImgBase64Data.value;
        const inpainting_prompt = aiInpaintingPromptInput.value;
        const outpainting_prompt = aiOutpaintingPromptInput.value;

        let payload = {
            instances: { prompt: prompt },
            parameters: {
                sampleCount: num_images,
                sampler: sampling_method,
                steps: sampling_steps,
                cfgScale: guidance_scale,
                aspectRatio: aspect_ratio,
                seed: seed,
                negativePrompt: negative_prompt,
                stylePreset: style_preset
            }
        };

        const apiKey = AI_API_KEY; 
        let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`; 

        if (img2img_base64) {
            payload.instances.image = { bytesBase64Encoded: img2img_base64 };
        }
        
        if (inpainting_prompt && canvas.getActiveObject()) {
            showCustomAlert('Inpainting functionality with selected area is a placeholder. Gemini API does not directly support inpainting via this endpoint.');
        } else if (outpainting_prompt) {
            showCustomAlert('Outpainting functionality with extended canvas is a placeholder. Gemini API does not directly support outpainting via this endpoint.');
        }


        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('AI Generation Error:', errorData);
                showCustomAlert(`AI generation failed: ${errorData.error.message || 'Unknown error.'}`);
                return;
            }

            const result = await response.json();
            if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
                aiImg2ImgPreview.src = imageUrl;
                aiImg2ImgPreview.style.display = 'block';
                sendToEditBtn.classList.remove('hidden');
                showCustomAlert('Image generated successfully!');
            } else {
                showCustomAlert('No image generated. Please try again with a different prompt.');
            }
        } catch (error) {
            console.error('Error during AI image generation:', error);
            showCustomAlert('An error occurred during AI image generation. Please check your network connection or API key.');
        } finally {
            generateAiImageBtn.disabled = false;
        }
    }

    async function generateMaskForObject(obj) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        const originalFill = obj.fill;
        const originalOpacity = obj.opacity;
        
        obj.set({ fill: 'white', opacity: 1 });
        const originalCanvas = canvas;
        fabric.Object.prototype.canvas = tempCanvas;
        obj.render(tempCtx);
        fabric.Object.prototype.canvas = originalCanvas;
        obj.set({ fill: originalFill, opacity: originalOpacity });

        return tempCanvas.toDataURL('image/png').split(',')[1];
    }


    function handleAiImageToImageUpload(e) {
        const file = e.target.files[0];
        if (!file) {
            aiImg2ImgPreview.style.display = 'none';
            aiImg2ImgBase64Data.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (f) => {
            aiImg2ImgPreview.src = f.target.result;
            aiImg2ImgPreview.style.display = 'block';
            aiImg2ImgBase64Data.value = f.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }

    // --- CANVAS EXPORT ---
    function exportCanvas() {
        if (!canvas.getObjects().length) {
            showCustomAlert('Canvas is empty. Add some content before exporting.');
            return;
        }

        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0
        });

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'visual-composer-pro-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showCustomAlert('Image exported successfully as PNG!');
    }

    // --- KEYBOARD SHORTCUTS ---
    function handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    undo();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 's':
                    e.preventDefault();
                    showCustomAlert('Save functionality is not yet implemented (Ctrl/Cmd+S for saving project state). Use "Export as PNG" for now.');
                    break;
                case 'a':
                    e.preventDefault();
                    if (canvas.getObjects().length > 0) {
                        canvas.discardActiveObject();
                        const group = new fabric.Group(canvas.getObjects());
                        canvas.setActiveObject(group);
                        canvas.renderAll();
                        updateUI(null, false);
                    }
                    break;
                case 'd':
                    e.preventDefault();
                    canvas.discardActiveObject().renderAll();
                    updateUI(null, false);
                    break;
                case 'x':
                    e.preventDefault();
                    showCustomAlert('Cut functionality not implemented.');
                    break;
                case 'c':
                    e.preventDefault();
                    showCustomAlert('Copy functionality not implemented.');
                    break;
                case 'v':
                    e.preventDefault();
                    showCustomAlert('Paste functionality not implemented.');
                    break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'v': setActiveTool('select'); break;
                case 'h': setActiveTool('hand'); break;
                case 'z': setActiveTool('zoom'); break;
                case 'b': setActiveTool('brush'); break;
                case 'e': setActiveTool('eraser'); break;
                case 'i': setActiveTool('color-picker'); break;
                case 't': setActiveTool('text'); break;
                case 'c': setActiveTool('crop'); break;
                case 'delete':
                case 'backspace':
                    if (canvas.getActiveObject()) {
                        canvas.remove(canvas.getActiveObject());
                        updateUI(null, true);
                    }
                    break;
            }
        }
    }

    // --- CUSTOM ALERT ---
    function showCustomAlert(message) {
        const customAlertModal = document.querySelector('.custom-alert-modal');
        const customAlertMessage = document.getElementById('custom-alert-message');
        const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');

        customAlertMessage.textContent = message;
        customAlertModal.style.display = 'flex';

        customAlertOkBtn.onclick = () => {
            customAlertModal.style.display = 'none';
        };

        customAlertModal.addEventListener('click', (e) => {
            if (e.target === customAlertModal) {
                customAlertModal.style.display = 'none';
            }
        });
    }

    // --- APP MODE (EDIT/GENERATE) ---
    function setAppMode(mode) {
        mainLayout.dataset.appMode = mode;
        if (window.innerWidth > 768) {
            if (mode === 'generate') {
                aiGenerationPanel.classList.remove('collapsed');
            } else {
                aiGenerationPanel.classList.add('collapsed');
            }
        }
    }

    // --- DRAGGABLE PANELS (Desktop only for now) ---
    function setupDraggablePanels() {
        interact('.collapsible-panel').draggable({
            allowFrom: '.panel-header',
            listeners: {
                move: dragMoveListener
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move: function (event) {
                    const target = event.target;
                    let x = parseFloat(target.getAttribute('data-x')) || 0;
                    let y = parseFloat(target.getAttribute('data-y')) || 0;

                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';

                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        });

        function dragMoveListener(event) {
            if (window.innerWidth > 768) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        }
    }

    // --- Desktop Menu System (Dropdowns) ---
    function setupMenuSystem() {
        const menuItems = document.querySelectorAll('.top-menu-bar .menu-item');

        menuItems.forEach(item => {
            const menuLink = item.querySelector('.menu-link');
            const dropdownMenu = item.querySelector('.dropdown-menu');

            if (menuLink && dropdownMenu) {
                let timeout;
                item.addEventListener('mouseenter', () => {
                    clearTimeout(timeout);
                    if (window.innerWidth > 768) {
                        dropdownMenu.style.display = 'flex';
                    }
                });

                item.addEventListener('mouseleave', () => {
                    if (window.innerWidth > 768) {
                        timeout = setTimeout(() => {
                            dropdownMenu.style.display = 'none';
                        }, 200);
                    }
                });

                document.addEventListener('click', (event) => {
                    if (window.innerWidth > 768 && !item.contains(event.target)) {
                        dropdownMenu.style.display = 'none';
                    }
                });
            }
        });
    }

    // --- INITIALIZE ---
    initializeCanvas();
});
