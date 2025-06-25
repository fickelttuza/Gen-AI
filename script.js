document.addEventListener('DOMContentLoaded', () => {
    // --- AI API KEY (Provided by user) ---
    const AI_API_KEY = '00dce4231af170822e86c76b923c9fc9b0527eae	';

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
    const addLayerMaskBtn = document.querySelector('.tool-btn[data-tool="layer-mask"]');
    const addLayerBtn = document.getElementById('add-new-layer-btn');

    // AI Generation Panel Elements
    const aiGenerationPanel = document.getElementById('ai-generation-panel');
    const generateAiImageBtn = document.getElementById('generate-ai-image-btn');
    const sendToEditBtn = document.getElementById('send-to-edit-btn');
    const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn'); // Renamed for clarity
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
    const panels = document.querySelectorAll('.collapsible-panel'); // All collapsible panels
    const rightPanelsContainer = document.querySelector('.right-panels'); // Container for right panels
    const toolsPanel = document.querySelector('.tools-panel'); // Left tools panel
    const menuItems = document.querySelectorAll('.menu-item'); // Desktop menu items

    // Mobile Bottom Bar Elements
    const mobileBottomBar = document.querySelector('.mobile-bottom-bar');
    const toggleToolsPanelBtn = document.getElementById('toggle-tools-panel-btn');
    const toggleAiPanelBtn = document.getElementById('toggle-ai-panel-btn');
    const toggleLayersPanelBtn = document.getElementById('toggle-layers-panel-btn');
    const togglePropertiesPanelBtn = document.getElementById('toggle-properties-panel-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    // Mobile Menu Overlay Elements
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileMenuCloseBtn = document.querySelector('.mobile-menu-overlay .close-btn');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    const desktopNav = document.getElementById('desktop-nav'); // Reference to desktop nav

    let canvas;
    let activeTool = 'move';
    let cropRect = null;
    let currentSelectionRect = null;
    let lassoPoints = [];
    let lassoPoly = null;
    let isDrawingLasso = false;
    let isDrawingSelection = false;
    let cloneSource = null;
    let isPanningCanvas = false; // For hand tool or alt-key panning
    let lastPanPosX, lastPanPosY;


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
            preserveObjectStacking: true // Important for layer order
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
        setActiveTool('move');
        updateZoomUI(canvas.getZoom());

        if (canvas.getObjects().length === 0) {
            const rect = new fabric.Rect({
                left: 100, top: 100, fill: '#7f5af0', width: 200, height: 150,
                name: 'Background Shape', rx: 0, ry: 0
            });
            canvas.add(rect);
            canvas.centerObject(rect);
            canvas.setActiveObject(rect);
            saveCanvasState();
        }

        // Initial app mode based on screen width
        handleResize(); // Call on init to set up initial panel states and visibility
        updateHistoryButtons();
    }

    // --- CANVAS & UI EVENT LISTENERS ---
    function setupCanvasListeners() {
        canvas.on({
            'mouse:wheel': handleMouseWheel,
            'mouse:down': handleMouseDown,
            'mouse:move': handleMouseMove,
            'mouse:up': handleMouseUp,
            'touch:gesture': handleTouchGesture, // Pinch to zoom
            'touch:drag': handleTouchDrag, // Single finger pan
        });
    }

    // Handle two-finger pinch for zoom on touch devices
    function handleTouchGesture(opt) {
        const gesture = opt.e;
        if (gesture.touches && gesture.touches.length === 2) {
            const point = new fabric.Point(gesture.touches[0].clientX, gesture.touches[0].clientY);
            let zoom = canvas.getZoom();
            if (gesture.scale !== 1) {
                zoom *= gesture.scale;
                if (zoom > 20) zoom = 20; // Max zoom
                if (zoom < 0.1) zoom = 0.1; // Min zoom
                canvas.zoomToPoint(point, zoom);
                updateZoomUI(zoom);
                gesture.preventDefault();
                gesture.stopPropagation();
            }
        }
    }

    let isTouchPanning = false;
    let lastTouchPosX, lastTouchPosY;

    // Handle single-finger drag for panning on touch devices
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
            isTouchPanning = false; // Reset if less/more than one touch
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

        // Mobile Menu Toggle (for the header's hamburger icon)
        mobileMenuToggleBtn.addEventListener('click', () => {
            mobileMenuOverlay.classList.toggle('open');
        });
        mobileMenuCloseBtn.addEventListener('click', () => {
            mobileMenuOverlay.classList.remove('open');
        });

        // Event delegation for mobile menu links (if dynamically added)
        mobileNavContent.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
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

        // Mobile Bottom Bar Panel Toggling
        mobileBottomBar.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const panelType = button.dataset.panel;
                let targetPanel;

                // Determine which panel corresponds to the clicked button
                if (panelType === 'tools') {
                    targetPanel = toolsPanel;
                } else if (panelType === 'ai') {
                    targetPanel = aiGenerationPanel;
                } else if (panelType === 'layers') {
                    targetPanel = document.getElementById('layers-container');
                } else if (panelType === 'properties') {
                    targetPanel = document.getElementById('properties-container');
                }

                if (targetPanel) {
                    const isToolsPanel = targetPanel.classList.contains('tools-panel');
                    const isRightPanel = targetPanel.closest('.right-panels');

                    // Check if the clicked panel is already active
                    const isActive = button.classList.contains('active');

                    // Deactivate all mobile bottom bar buttons
                    mobileBottomBar.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));

                    // Hide all panels (both left and right)
                    toolsPanel.classList.remove('mobile-active');
                    toolsPanel.classList.add('collapsed');

                    // All right panels are contained, so collapse them all and then activate the target one
                    document.querySelectorAll('.right-panels > .collapsible-panel').forEach(panel => {
                        panel.classList.remove('mobile-active');
                        panel.classList.add('collapsed');
                    });
                    rightPanelsContainer.classList.remove('mobile-active');
                    rightPanelsContainer.classList.add('collapsed');


                    if (!isActive) {
                        // If not active, activate this button and show its panel
                        button.classList.add('active');

                        if (isToolsPanel) {
                            toolsPanel.classList.add('mobile-active');
                            toolsPanel.classList.remove('collapsed'); // Expand it
                            setAppMode('edit');
                        } else if (isRightPanel) {
                            rightPanelsContainer.classList.add('mobile-active');
                            rightPanelsContainer.classList.remove('collapsed');
                            targetPanel.classList.add('mobile-active');
                            targetPanel.classList.remove('collapsed'); // Expand the specific right panel

                            if (panelType === 'ai') {
                                setAppMode('generate');
                            } else {
                                setAppMode('edit');
                            }
                        }
                    } else {
                        // If already active, just deactivate the button and return to edit mode (canvas view)
                        // All panels are already hidden by the initial reset, just ensure correct app mode
                        setAppMode('edit');
                    }
                }
            });
        });


        addLayerMaskBtn.addEventListener('click', addLayerMask);
        addLayerBtn.addEventListener('click', addNewLayer);
    }

    function handleResize() {
        resizeCanvasToFitContainer();
        populateMobileMenu(); // Re-populate mobile menu on resize

        if (window.innerWidth <= 768) {
            // Ensure mobile bottom bar is visible on mobile resize
            mobileBottomBar.style.display = 'flex';

            // On mobile, collapse all panels initially when resizing
            toolsPanel.classList.add('collapsed');
            toolsPanel.classList.remove('mobile-active');

            rightPanelsContainer.classList.add('collapsed');
            rightPanelsContainer.classList.remove('mobile-active');

            document.querySelectorAll('.right-panels > .collapsible-panel').forEach(panel => {
                panel.classList.add('collapsed');
                panel.classList.remove('mobile-active');
            });

            // Based on current app mode, open the correct panel or default to tools
            if (mainLayout.dataset.appMode === 'generate') {
                rightPanelsContainer.classList.remove('collapsed');
                rightPanelsContainer.classList.add('mobile-active');
                aiGenerationPanel.classList.remove('collapsed');
                aiGenerationPanel.classList.add('mobile-active');
                toggleAiPanelBtn.classList.add('active');
            } else { // Default to tools panel
                toolsPanel.classList.remove('collapsed');
                toolsPanel.classList.add('mobile-active');
                toggleToolsPanelBtn.classList.add('active');
            }
            // Hide desktop nav
            desktopNav.style.display = 'none';

        } else {
            // On desktop, hide mobile bottom bar and remove mobile-specific classes from panels
            mobileBottomBar.style.display = 'none';
            toolsPanel.classList.remove('collapsed');
            toolsPanel.classList.remove('mobile-active');

            rightPanelsContainer.classList.remove('collapsed');
            rightPanelsContainer.classList.remove('mobile-active');

            document.querySelectorAll('.right-panels > .collapsible-panel').forEach(panel => {
                panel.classList.remove('collapsed');
                panel.classList.remove('mobile-active');
            });

            // Ensure desktop nav is visible
            desktopNav.style.display = 'flex';
            setAppMode('edit'); // Always switch to edit mode on desktop
        }
        updateUI(null, false);
    }

    function addNewLayer() {
        const rect = new fabric.Rect({
            left: 50, top: 50, fill: '#ffffff', width: 100, height: 100,
            name: 'New Empty Layer', rx: 0, ry: 0,
            opacity: 0.5
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
                const panel = header.closest('.collapsible-panel');

                // If on mobile, this click is handled by the mobile bottom bar buttons
                // or acts as a toggle if the panel is already active from the bottom bar.
                if (window.innerWidth <= 768) {
                    const panelId = panel.id.replace('-container', '').replace('-panel', '');
                    const correspondingBtn = mobileBottomBar.querySelector(`button[data-panel="${panelId}"]`);

                    // Simulate a click on the corresponding mobile bottom bar button
                    // This centralizes mobile panel toggle logic
                    if (correspondingBtn) {
                        correspondingBtn.click();
                    } else {
                        // Fallback for tools panel header if needed, though mobile tools panel doesn't have collapsible-header
                        panel.classList.toggle('collapsed');
                    }
                } else {
                    // Desktop behavior: simply toggle collapsed state
                    panel.classList.toggle('collapsed');
                }
            });
        });
    }

    // --- MOBILE MENU SYSTEM ---
    function setupMenuSystem() {
        // Initialize desktop dropdowns
        document.querySelectorAll('.top-menu-bar .menu-item').forEach(menuItem => {
            const menuLink = menuItem.querySelector('.menu-link');
            const dropdownMenu = menuItem.querySelector('.dropdown-menu');
            if (menuLink && dropdownMenu) {
                menuLink.addEventListener('click', (e) => {
                    if (window.innerWidth > 768) { // Only for desktop
                        e.preventDefault(); // Prevent default link behavior
                        dropdownMenu.style.display = dropdownMenu.style.display === 'flex' ? 'none' : 'flex';
                    }
                });
                // Close dropdown if clicked outside
                document.addEventListener('click', (e) => {
                    if (window.innerWidth > 768 && !menuItem.contains(e.target)) {
                        dropdownMenu.style.display = 'none';
                    }
                });
            }
        });

        // Populate mobile menu on load and resize
        populateMobileMenu();
    }

    function populateMobileMenu() {
        // Clear existing content
        mobileNavContent.innerHTML = '';

        // Clone desktop menu items and append to mobile nav
        desktopNav.querySelectorAll('.menu-item').forEach(menuItem => {
            const clonedItem = menuItem.cloneNode(true);
            const menuLink = clonedItem.querySelector('.menu-link');
            const dropdown = clonedItem.querySelector('.dropdown-menu');

            if (dropdown) {
                // For mobile, make the parent menu item toggle the dropdown
                menuLink.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent navigating
                    dropdown.classList.toggle('open');
                });
                // Add a class for specific mobile styling if needed
                dropdown.classList.add('mobile-dropdown-menu');
            }
            mobileNavContent.appendChild(clonedItem);
        });
    }

    // --- UI UPDATE ORCHESTRATOR ---
    function updateUI(e, saveToHistory = true) {
        updateLayersPanel();
        // Pass the active object, or the tool if no object is active
        const activeObj = canvas.getActiveObject();
        updatePropertiesPanel(activeObj || (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'clone-stamp' || activeTool === 'selection' || activeTool === 'lasso' || activeTool === 'layer-mask' || activeTool === 'zoom' || activeTool === 'hand' || activeTool === 'color-picker' ? activeTool : null));
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
        if (tool === 'shape') addShape(shape);
        else if (tool === 'text') addText();
        else setActiveTool(tool);
    }

    function setActiveTool(tool) {
        activeTool = tool;
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'default';
        cropActionsContainer.style.display = 'none';

        // Clear any active tool overlays/helpers
        if(cropRect) {
            canvas.remove(cropRect);
            cropRect = null;
        }
        if (currentSelectionRect) {
            canvas.remove(currentSelectionRect);
            currentSelectionRect = null;
        }
        if (lassoPoly) {
            canvas.remove(lassoPoly);
            lassoPoly = null;
            isDrawingLasso = false;
            lassoPoints = [];
        }
        cloneSource = null; // Reset clone source

        // Update tool button active state
        toolButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Reset brush composite operation for regular tools
        canvas.freeDrawingBrush.globalCompositeOperation = 'source-over';

        switch (tool) {
            case 'move':
                canvas.selection = true;
                canvas.defaultCursor = 'grab';
                break;
            case 'hand':
                canvas.selection = false;
                canvas.defaultCursor = 'grab';
                break;
            case 'zoom':
                canvas.selection = false;
                canvas.defaultCursor = 'zoom-in';
                showCustomAlert('Click to zoom in, Alt + Click to zoom out. Scroll wheel also zooms.');
                break;
            case 'color-picker':
                canvas.selection = false;
                canvas.defaultCursor = 'copy'; // Looks like an eyedropper
                showCustomAlert('Click on any color on the canvas to select it.');
                break;
            case 'brush':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                canvas.freeDrawingBrush.color = canvas.freeDrawingBrush.color || '#000000';
                canvas.freeDrawingBrush.width = canvas.freeDrawingBrush.width || 5;
                canvas.freeDrawingBrush.strokeLineCap = canvas.freeDrawingBrush.strokeLineCap || 'round';
                canvas.freeDrawingBrush.strokeLineJoin = canvas.freeDrawingBrush.strokeLineJoin || 'round';
                canvas.defaultCursor = 'crosshair';
                break;
            case 'eraser':
                canvas.isDrawingMode = true;
                canvas.selection = false;
                canvas.freeDrawingBrush.color = '#ffffff'; // Eraser uses white with destination-out
                canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
                canvas.freeDrawingBrush.width = canvas.freeDrawingBrush.width || 20;
                canvas.defaultCursor = 'crosshair';
                break;
            case 'crop':
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                showCustomAlert('Drag to define crop area. Click Apply/Cancel.');
                break;
            case 'selection': // Marquee Selection
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                showCustomAlert('Drag to draw a rectangular selection. The selection itself is an object you can transform.');
                break;
            case 'lasso':
                canvas.selection = false;
                canvas.defaultCursor = 'crosshair';
                showCustomAlert('Draw a freeform selection by clicking and dragging. Release to complete the selection.');
                break;
            case 'wand': // Magic Wand (simplified)
                canvas.selection = false;
                canvas.defaultCursor = 'pointer';
                showCustomAlert('Magic Wand: Click on an object to select it. (Basic selection only)');
                break;
            case 'clone-stamp':
                canvas.selection = false;
                canvas.defaultCursor = 'copy';
                showCustomAlert('Click once to set clone source, then drag to apply.');
                break;
            case 'layer-mask':
                canvas.selection = true;
                canvas.defaultCursor = 'pointer';
                showCustomAlert('Select a layer, then click again to add/edit its mask. Use brush tools with masks.');
                break;
        }
        updatePropertiesPanel(activeTool); // Update properties panel for tool settings
        canvas.renderAll();
    }

    // --- OBJECT CREATION ---
    function addText() {
        const text = new fabric.IText('Your Text Here', {
            left: canvas.getWidth() / 2, top: canvas.getHeight() / 2,
            fontSize: 48, fill: '#333333', fontFamily: 'Inter', name: 'Text Layer'
        });
        canvas.add(text);
        text.center();
        canvas.setActiveObject(text);
        setActiveTool('move');
        updateUI(null, true);
    }

    function addShape(shapeType) {
        let shape;
        const commonProps = {
            left: canvas.getWidth() / 2, top: canvas.getHeight() / 2,
            fill: '#2cb67d', stroke: '#000000', strokeWidth: 0,
            width: 150, height: 150,
            name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Layer`
        };

        if (shapeType === 'rect') {
            shape = new fabric.Rect({...commonProps, rx: 0, ry: 0 });
        }
        else if (shapeType === 'circle') shape = new fabric.Circle({ ...commonProps, radius: 75 });

        canvas.add(shape);
        shape.center();
        canvas.setActiveObject(shape);
        setActiveTool('move');
        updateUI(null, true);
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
        e.target.value = ''; // Clear file input
    }

    // --- PAN & ZOOM ---
    let isMouseDown = false; // Tracks if mouse button is pressed
    let startPoint = { x: 0, y: 0 }; // For tracking drag start

    function handleMouseDown(opt) {
        isMouseDown = true;
        const pointer = canvas.getPointer(opt.e);
        startPoint = { x: pointer.x, y: pointer.y };

        if (activeTool === 'hand' || opt.e.altKey) { // Alt key for universal pan
            isPanningCanvas = true;
            canvas.selection = false; // Disable object selection
            canvas.defaultCursor = 'grabbing';
            lastPanPosX = opt.e.clientX;
            lastPanPosY = opt.e.clientY;
        } else if (activeTool === 'crop' && !canvas.getActiveObject() && !cropRect) {
            cropRect = new fabric.Rect({
                left: pointer.x, top: pointer.y, width: 0, height: 0,
                fill: 'rgba(0,0,0,0.3)', stroke: 'rgba(255,255,255,0.5)', strokeDashArray: [4, 4],
                selectable: false, evented: false,
            });
            canvas.add(cropRect);
        } else if (activeTool === 'selection' && !canvas.getActiveObject() && !currentSelectionRect) {
            isDrawingSelection = true;
            currentSelectionRect = new fabric.Rect({
                left: pointer.x, top: pointer.y, width: 0, height: 0,
                fill: 'rgba(0,255,255,0.2)', stroke: 'rgba(0,255,255,0.8)', strokeDashArray: [4, 4],
                selectable: false, evented: false,
            });
            canvas.add(currentSelectionRect);
        } else if (activeTool === 'lasso') {
            isDrawingLasso = true;
            lassoPoints = [{x: pointer.x, y: pointer.y}];
            lassoPoly = new fabric.Polygon(lassoPoints, {
                fill: 'rgba(0,0,0,0.3)',
                stroke: '#1e90ff',
                strokeWidth: 2,
                objectCaching: false,
                selectable: false,
                evented: false,
                strokeDashArray: [4,4]
            });
            canvas.add(lassoPoly);
        } else if (activeTool === 'wand') {
            const clickedObject = canvas.findTarget(opt.e);
            if (clickedObject && clickedObject !== canvas.getActiveObject()) {
                canvas.setActiveObject(clickedObject);
                canvas.renderAll();
                updateUI(null, false);
            } else if (clickedObject === canvas.getActiveObject()){
                 canvas.discardActiveObject().renderAll();
                 updateUI(null, false);
            }
        } else if (activeTool === 'clone-stamp') {
            if (!cloneSource) {
                cloneSource = { x: pointer.x, y: pointer.y };
                showCustomAlert(`Clone source set at (${Math.round(cloneSource.x)}, ${Math.round(cloneSource.y)}). Now drag to clone.`);
            } else {
                // If clone source is set, next click/drag starts stamping
                // This will be handled in mousemove for continuous stamping
            }
        } else if (activeTool === 'color-picker') {
            // Get pixel data from canvas
            const ctx = canvas.getContext();
            const pixel = ctx.getImageData(opt.e.pointer.x, opt.e.pointer.y, 1, 1).data;
            const rgbaColor = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;
            // You can now use rgbaColor, e.g., set it to a foreground color property
            showCustomAlert(`Picked color: ${rgbaColor}`);
            // Example: Set brush color if brush is the next active tool
            canvas.freeDrawingBrush.color = rgbaColor;
            updatePropertiesPanel(activeTool); // Update brush properties
        } else if (activeTool === 'zoom') {
            const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
            let newZoom = canvas.getZoom();
            if (opt.e.altKey) { // Alt key to zoom out
                newZoom /= 1.2;
            } else { // Click to zoom in
                newZoom *= 1.2;
            }
            if (newZoom > 20) newZoom = 20;
            if (newZoom < 0.1) newZoom = 0.1;
            canvas.zoomToPoint(point, newZoom);
            updateZoomUI(newZoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        }
    }

    function handleMouseMove(opt) {
        if (!isMouseDown) return; // Only process if mouse is down

        const pointer = canvas.getPointer(opt.e);

        if (isPanningCanvas) {
            const e = opt.e;
            const vpt = canvas.viewportTransform;
            vpt[4] += e.clientX - lastPanPosX;
            vpt[5] += e.clientY - lastPanPosY;
            canvas.requestRenderAll();
            lastPanPosX = e.clientX; lastPanPosY = e.clientY;
        } else if (activeTool === 'crop' && cropRect) {
            let width = pointer.x - cropRect.left;
            let height = pointer.y - cropRect.top;

            if (width < 0) { cropRect.set({ left: pointer.x }); width = Math.abs(width); }
            if (height < 0) { cropRect.set({ top: pointer.y }); height = Math.abs(height); }
            cropRect.set({ width: width, height: height });
            canvas.renderAll();
        } else if (activeTool === 'selection' && isDrawingSelection && currentSelectionRect) {
            let width = pointer.x - currentSelectionRect.left;
            let height = pointer.y - currentSelectionRect.top;

            if (width < 0) { currentSelectionRect.set({ left: pointer.x }); width = Math.abs(width); }
            if (height < 0) { currentSelectionRect.set({ top: pointer.y }); height = Math.abs(height); }
            currentSelectionRect.set({ width: width, height: height });
            canvas.renderAll();
        } else if (activeTool === 'lasso' && isDrawingLasso && lassoPoly) {
            lassoPoints.push({x: pointer.x, y: pointer.y});
            lassoPoly.set({ points: lassoPoints });
            canvas.renderAll();
        } else if (activeTool === 'clone-stamp' && cloneSource && isMouseDown) { // Only stamp if mouse is down after source set
            const stampSize = canvas.freeDrawingBrush.width || 50; // Use brush size for stamp
            const sourceX = cloneSource.x - stampSize / 2;
            const sourceY = cloneSource.y - stampSize / 2;

            // Clamp source coordinates to canvas boundaries
            const clampedSourceX = Math.max(0, Math.min(canvas.width - stampSize, sourceX));
            const clampedSourceY = Math.max(0, Math.min(canvas.height - stampSize, sourceY));


            const sourceData = canvas.toDataURL({
                left: clampedSourceX,
                top: clampedSourceY,
                width: stampSize,
                height: stampSize,
                format: 'png'
            });

            fabric.Image.fromURL(sourceData, (img) => {
                img.set({
                    left: pointer.x - stampSize / 2,
                    top: pointer.y - stampSize / 2,
                    name: 'Clone Stamp',
                    selectable: false, // Don't make clone stamps selectable by default
                    evented: false,
                });
                canvas.add(img);
                canvas.renderAll();
                // No history saving on every stamp for performance, save on mouseup if needed
            });
        }
    }

    function handleMouseUp(opt) {
        isMouseDown = false;
        isPanningCanvas = false; // Reset pan state
        canvas.defaultCursor = (activeTool === 'move') ? 'grab' : 'default'; // Reset cursor

        if (activeTool === 'crop' && cropRect && cropRect.width > 0 && cropRect.height > 0) {
            const hasOtherObjects = canvas.getObjects().some(obj => obj !== cropRect);
            if (hasOtherObjects) {
                cropActionsContainer.style.display = 'flex';
            } else {
                cancelCrop(); // No objects to crop, cancel operation
            }
        } else if (activeTool === 'selection' && isDrawingSelection) {
            isDrawingSelection = false;
            if (currentSelectionRect && (currentSelectionRect.width === 0 || currentSelectionRect.height === 0)) {
                canvas.remove(currentSelectionRect);
                currentSelectionRect = null;
            } else if (currentSelectionRect) {
                currentSelectionRect.set({ selectable: true, evented: true, hasControls: true, hasBorders: true });
                canvas.setActiveObject(currentSelectionRect);
                updateUI(null, false); // No history save for selection object creation
            }
        } else if (activeTool === 'lasso' && isDrawingLasso) {
            isDrawingLasso = false;
            if (lassoPoly && lassoPoints.length > 2) {
                // Close the lasso path
                lassoPoly.points.push(lassoPoints[0]);
                lassoPoly.set({ selectable: true, evented: true, hasControls: true, hasBorders: true });
                canvas.setActiveObject(lassoPoly);
                updateUI(null, false); // No history save for selection object creation
            } else if (lassoPoly) {
                canvas.remove(lassoPoly); // Remove incomplete lasso
                lassoPoly = null;
                lassoPoints = [];
            }
        } else if (activeTool === 'clone-stamp' && cloneSource) {
            // Save state after a continuous stamping operation
            saveCanvasState();
        }
    }

    function handleMouseWheel(opt) {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        updateZoomUI(zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
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

        // Create a temporary group of all visible objects for cropping
        const tempGroup = new fabric.Group(objectsToCrop, {
            selectable: false, evented: false
        });
        canvas.add(tempGroup); // Add to canvas temporarily to render together
        canvas.renderAll();

        const croppedData = canvas.toDataURL({
            left: cropRect.left,
            top: cropRect.top,
            width: cropRect.width,
            height: cropRect.height,
            format: 'png',
            quality: 1.0,
            multiplier: 1 // Crucial for pixel-perfect crop
        });

        canvas.clear(); // Clear canvas before adding cropped image

        fabric.Image.fromURL(croppedData, (img) => {
            // Adjust canvas size to the cropped image dimensions
            canvas.setDimensions({ width: img.width, height: img.height });
            canvas.add(img);
            img.center();
            canvas.setActiveObject(img);
            canvas.renderAll();
            updateUI(null, true); // Save history after crop
        });

        cancelCrop();
    }

    function cancelCrop() {
        if (cropRect) canvas.remove(cropRect);
        cropRect = null;
        cropActionsContainer.style.display = 'none';
        setActiveTool('move'); // Return to move tool after crop operation
        canvas.discardActiveObject().renderAll();
    }

    // --- LAYER MASKING LOGIC ---
    function addLayerMask() {
        const activeObject = canvas.getActiveObject();
        if (!activeObject) {
            showCustomAlert('Please select an object or layer to add a mask to.');
            return;
        }

        // Create a mask rectangle with properties for visual representation
        const maskRect = new fabric.Rect({
            left: activeObject.left,
            top: activeObject.top,
            width: activeObject.width * activeObject.scaleX,
            height: activeObject.height * activeObject.scaleY,
            fill: 'black', // Mask color
            opacity: 0.5,
            selectable: true,
            evented: true,
            name: `${activeObject.name || 'Layer'} Mask`,
            absolutePositioned: true, // Keep position independent of view
            forObject: activeObject.name // Link to the masked object
        });

        canvas.add(maskRect);
        canvas.setActiveObject(maskRect);
        canvas.renderAll();
        updateUI(null, true);
        showCustomAlert('Mask added! Use the brush tool (set to black/white) to paint on the mask. White reveals, Black conceals.');
    }

    // --- LAYER & PROPERTIES PANEL LOGIC ---
    function updateLayersPanel() {
        layersListEl.innerHTML = '';
        // Filter out temporary selection/crop objects
        const objects = canvas.getObjects().filter(obj =>
            obj !== cropRect && obj !== currentSelectionRect && obj !== lassoPoly
        ).slice().reverse(); // Reverse to show top layers at the top of the list

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
        if (!obj.visible) item.classList.add('hidden-layer'); // Use a different class for CSS
        if (!obj.selectable) item.classList.add('locked-layer');

        const iconClass = {
            'i-text': 'fa-font',
            'rect': 'fa-square',
            'circle': 'fa-circle',
            'image': 'fa-image',
            'path': 'fa-paint-brush', // Fabric.Path for free drawing
            'polygon': 'fa-draw-polygon', // For lasso selection
        }[obj.type] || 'fa-cube'; // Default icon

        item.innerHTML = `
            <div class="layer-name">
                <i class="fas ${iconClass}"></i>
                <span>${obj.name || `Layer ${fabricIndex + 1}`}</span>
            </div>
            <div class="layer-controls">
                <button class="lock-layer" title="${obj.selectable ? 'Lock' : 'Unlock'} Layer"><i class="fas ${obj.selectable ? 'fa-unlock' : 'fa-lock'}"></i></button>
                <button class="toggle-visibility" title="${obj.visible ? 'Hide' : 'Show'} Layer"><i class="fas ${obj.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            // Prevent selection when clicking controls
            if (!e.target.closest('.layer-controls')) {
                canvas.setActiveObject(obj);
                canvas.renderAll();
            }
        });
        item.querySelector('.lock-layer').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent layer item click from firing
            obj.set({ selectable: !obj.selectable, hasControls: !obj.selectable, hasBorders: !obj.selectable });
            canvas.renderAll();
            updateUI(null, true);
        });
        item.querySelector('.toggle-visibility').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent layer item click from firing
            obj.set('visible', !obj.visible);
            canvas.renderAll();
            updateUI(null, true);
        });

        // Layer reordering via drag and drop
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.fabricIndex);
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            const targetItem = e.target.closest('.layer-item');
            if (targetItem && targetItem !== e.target.closest('.dragging')) {
                // Add a visual indicator for drop position (e.g., a line)
                const boundingBox = targetItem.getBoundingClientRect();
                const offsetY = e.clientY - boundingBox.top;
                if (offsetY < boundingBox.height / 2) {
                    targetItem.classList.add('drag-over-top');
                    targetItem.classList.remove('drag-over-bottom');
                } else {
                    targetItem.classList.add('drag-over-bottom');
                    targetItem.classList.remove('drag-over-top');
                }
            }
        });
        item.addEventListener('dragleave', (e) => {
             const targetItem = e.target.closest('.layer-item');
             if (targetItem) {
                targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.layer-item.drag-over-top, .layer-item.drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));

            const draggedFabricIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropTargetItem = e.target.closest('.layer-item');
            if (!dropTargetItem) return;
            const dropFabricIndex = parseInt(dropTargetItem.dataset.fabricIndex);

            const objToMove = canvas.getObjects()[draggedFabricIndex];
            const dropBefore = dropTargetItem.classList.contains('drag-over-top');

            // Convert UI index to Fabric.js index (reversed order)
            const objects = canvas.getObjects().filter(o => o !== cropRect && o !== currentSelectionRect && o !== lassoPoly);
            const currentObjIndex = objects.indexOf(objToMove);
            const targetObjIndex = objects.indexOf(canvas.getObjects()[dropFabricIndex]);


            if (currentObjIndex !== -1 && targetObjIndex !== -1) {
                // Fabric.js reordering logic
                if (currentObjIndex < targetObjIndex) {
                    // Moving down (towards foreground)
                    if (dropBefore) { // Insert before target
                        canvas.sendBackwards(objToMove, (targetObjIndex - currentObjIndex));
                    } else { // Insert after target
                        canvas.bringForward(objToMove, (targetObjIndex - currentObjIndex + 1));
                    }
                } else if (currentObjIndex > targetObjIndex) {
                    // Moving up (towards background)
                    if (dropBefore) { // Insert before target
                        canvas.bringForward(objToMove, (currentObjIndex - targetObjIndex));
                    } else { // Insert after target
                        canvas.sendBackwards(objToMove, (currentObjIndex - targetObjIndex - 1));
                    }
                }
            }

            canvas.renderAll();
            updateUI(null, true); // Save history after reorder
        });
        item.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.layer-item.drag-over-top, .layer-item.drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        });

        return item;
    }

    function updatePropertiesPanel(context) { // context can be an object or a tool string
        propertiesPanelContent.innerHTML = ''; // Clear previous properties

        if (context && typeof context === 'string') { // Tool properties
            propertiesPanelContent.style.display = 'flex';
            propertiesPanelPlaceholder.style.display = 'none';

            propertiesPanelContent.innerHTML += `<h3 class="panel-title">${context.charAt(0).toUpperCase() + context.slice(1).replace('-', ' ')} Tool</h3>`;

            if (context === 'brush' || context === 'eraser' || context === 'clone-stamp') {
                const toolProps = `
                    <div class="prop-group">
                        <label>Size</label>
                        <input type="range" min="1" max="100" value="${canvas.freeDrawingBrush.width}" data-tool-prop="width">
                    </div>
                    ${context === 'brush' ? `
                    <div class="prop-group">
                        <label>Color</label>
                        <input type="color" value="${canvas.freeDrawingBrush.color}" data-tool-prop="color">
                    </div>` : ''}
                    <div class="prop-group"><label>Line Cap</label>
                        <select data-tool-prop="strokeLineCap">
                            <option value="butt" ${canvas.freeDrawingBrush.strokeLineCap === 'butt' ? 'selected' : ''}>Butt</option>
                            <option value="round" ${canvas.freeDrawingBrush.strokeLineCap === 'round' ? 'selected' : ''}>Round</option>
                            <option value="square" ${canvas.freeDrawingBrush.strokeLineCap === 'square' ? 'selected' : ''}>Square</option>
                        </select>
                    </div>
                    <div class="prop-group"><label>Line Join</label>
                        <select data-tool-prop="strokeLineJoin">
                            <option value="miter" ${canvas.freeDrawingBrush.strokeLineJoin === 'miter' ? 'selected' : ''}>Miter</option>
                            <option value="round" ${canvas.freeDrawingBrush.strokeLineJoin === 'round' ? 'selected' : ''}>Round</option>
                            <option value="bevel" ${canvas.freeDrawingBrush.strokeLineJoin === 'bevel' ? 'selected' : ''}>Bevel</option>
                        </select>
                    </div>
                `;
                propertiesPanelContent.innerHTML += toolProps;
            } else if (context === 'selection' && currentSelectionRect) {
                propertiesPanelContent.innerHTML += `
                    <div class="prop-grid">
                        <div class="prop-group"><label>X</label><input type="number" value="${Math.round(currentSelectionRect.left)}" data-prop="left" data-target="selection"></div>
                        <div class="prop-group"><label>Y</label><input type="number" value="${Math.round(currentSelectionRect.top)}" data-prop="top" data-target="selection"></div>
                        <div class="prop-group"><label>Width</label><input type="number" value="${Math.round(currentSelectionRect.width)}" data-prop="width" data-target="selection"></div>
                        <div class="prop-group"><label>Height</label><input type="number" value="${Math.round(currentSelectionRect.height)}" data-prop="height" data-target="selection"></div>
                    </div>
                    <button class="primary-btn" id="clear-selection-btn">Clear Selection</button>
                `;
            } else if (context === 'lasso' && lassoPoly) {
                propertiesPanelContent.innerHTML += `
                    <div class="prop-group">
                        <label>Fill</label>
                        <input type="color" value="${lassoPoly.fill}" data-prop="fill" data-target="lasso">
                    </div>
                    <div class="prop-group">
                        <label>Stroke</label>
                        <input type="color" value="${lassoPoly.stroke}" data-prop="stroke" data-target="lasso">
                    </div>
                    <button class="primary-btn" id="clear-lasso-btn">Clear Lasso</button>
                `;
            } else if (context === 'layer-mask') {
                propertiesPanelContent.innerHTML += `
                    <p>Select a layer and apply a mask. Then use the brush tool to paint on the mask (white = visible, black = hidden).</p>
                    <div class="prop-group">
                        <label>Feather/Softness (coming soon)</label>
                        <input type="range" min="0" max="100" value="0" disabled>
                    </div>`;
            } else if (context === 'zoom' || context === 'hand' || context === 'color-picker') {
                propertiesPanelContent.innerHTML += `<p>No specific properties for this tool. Use the canvas directly.</p>`;
            }

            // Attach event listeners for tool properties
            propertiesPanelContent.querySelectorAll('input[data-tool-prop], select[data-tool-prop]').forEach(input => {
                input.addEventListener('input', (e) => {
                    const prop = e.target.dataset.toolProp;
                    let value = e.target.value;
                    if (e.target.type === 'number' || e.target.type === 'range') value = parseFloat(value);
                    canvas.freeDrawingBrush[prop] = value;
                    canvas.renderAll();
                });
            });

        } else if (context && typeof context === 'object') { // Object properties
            propertiesPanelContent.style.display = 'flex';
            propertiesPanelPlaceholder.style.display = 'none';

            propertiesPanelContent.innerHTML += `<h3 class="panel-title">${context.name || 'Selected Object'}</h3>`;

            const commonProps = `
                <div class="prop-group">
                    <label>Opacity</label>
                    <input type="range" min="0" max="1" step="0.01" value="${context.opacity}" data-prop="opacity">
                </div>
                <div class="prop-grid">
                    <div class="prop-group"><label>X</label><input type="number" value="${Math.round(context.left)}" data-prop="left"></div>
                    <div class="prop-group"><label>Y</label><input type="number" value="${Math.round(context.top)}" data-prop="top"></div>
                    <div class="prop-group"><label>Width</label><input type="number" value="${Math.round(context.width * context.scaleX)}" data-prop="scaledWidth"></div>
                    <div class="prop-group"><label>Height</label><input type="number" value="${Math.round(context.height * context.scaleY)}" data-prop="scaledHeight"></div>
                </div>
                <div class="prop-group">
                    <label>Rotation</label>
                    <input type="range" min="0" max="360" value="${Math.round(context.angle)}" data-prop="angle">
                </div>
                <div class="prop-group">
                    <label>Blend Mode</label>
                    <select data-prop="globalCompositeOperation">
                        <option value="source-over" ${context.globalCompositeOperation === 'source-over' ? 'selected' : ''}>Normal</option>
                        <option value="multiply" ${context.globalCompositeOperation === 'multiply' ? 'selected' : ''}>Multiply</option>
                        <option value="screen" ${context.globalCompositeOperation === 'screen' ? 'selected' : ''}>Screen</option>
                        <option value="overlay" ${context.globalCompositeOperation === 'overlay' ? 'selected' : ''}>Overlay</option>
                        <option value="darken" ${context.globalCompositeOperation === 'darken' ? 'selected' : ''}>Darken</option>
                        <option value="lighten" ${context.globalCompositeOperation === 'lighten' ? 'selected' : ''}>Lighten</option>
                        <option value="color-dodge" ${context.globalCompositeOperation === 'color-dodge' ? 'selected' : ''}>Color Dodge</option>
                        <option value="color-burn" ${context.globalCompositeOperation === 'color-burn' ? 'selected' : ''}>Color Burn</option>
                        <option value="hard-light" ${context.globalCompositeOperation === 'hard-light' ? 'selected' : ''}>Hard Light</option>
                        <option value="soft-light" ${context.globalCompositeOperation === 'soft-light' ? 'selected' : ''}>Soft Light</option>
                        <option value="difference" ${context.globalCompositeOperation === 'difference' ? 'selected' : ''}>Difference</option>
                        <option value="exclusion" ${context.globalCompositeOperation === 'exclusion' ? 'selected' : ''}>Exclusion</option>
                        <option value="hue" ${context.globalCompositeOperation === 'hue' ? 'selected' : ''}>Hue</option>
                        <option value="saturation" ${context.globalCompositeOperation === 'saturation' ? 'selected' : ''}>Saturation</option>
                        <option value="color" ${context.globalCompositeOperation === 'color' ? 'selected' : ''}>Color</option>
                        <option value="luminosity" ${context.globalCompositeOperation === 'luminosity' ? 'selected' : ''}>Luminosity</option>
                    </select>
                </div>`;
            propertiesPanelContent.innerHTML += commonProps;

            if (context.type === 'i-text') {
                const textProps = `<div class="prop-group"><label>Font Size</label><input type="number" value="${context.fontSize}" data-prop="fontSize"></div>
                                   <div class="prop-group"><label>Fill</label><input type="color" value="${context.fill}" data-prop="fill"></div>
                                   <div class="prop-group"><label>Font Family</label><input type="text" value="${context.fontFamily}" data-prop="fontFamily"></div>`;
                propertiesPanelContent.innerHTML += textProps;
            } else if (context.type === 'rect') {
                const rectProps = `<div class="prop-group"><label>Fill</label><input type="color" value="${context.fill}" data-prop="fill"></div>
                                    <div class="prop-group"><label>Stroke</label><input type="color" value="${context.stroke || '#000000'}" data-prop="stroke"></div>
                                    <div class="prop-group"><label>Stroke Width</label><input type="number" value="${context.strokeWidth || 0}" data-prop="strokeWidth"></div>
                                    <div class="prop-group"><label>Border Radius</label><input type="number" min="0" value="${context.rx || 0}" data-prop="rx"></div>`;
                propertiesPanelContent.innerHTML += rectProps;
            } else if (context.type === 'circle') {
                 const circleProps = `<div class="prop-group"><label>Fill</label><input type="color" value="${context.fill}" data-prop="fill"></div>
                                    <div class="prop-group"><label>Stroke</label><input type="color" value="${context.stroke || '#000000'}" data-prop="stroke"></div>
                                    <div class="prop-group"><label>Stroke Width</label><input type="number" value="${context.strokeWidth || 0}" data-prop="strokeWidth"></div>
                                    <div class="prop-group"><label>Radius</label><input type="number" value="${Math.round(context.radius * context.scaleX)}" data-prop="scaledRadius"></div>`;
                propertiesPanelContent.innerHTML += circleProps;
            } else if (context.type === 'image') {
                const imageProps = `<div class="prop-group">
                                        <label>Image Filters</label>
                                        <button id="add-blur-filter-btn" class="primary-btn">Add Blur</button>
                                        <button id="remove-filters-btn" class="secondary-btn">Remove All Filters</button>
                                    </div>`;
                propertiesPanelContent.innerHTML += imageProps;
            } else if (context.type === 'path') { // For free-drawing paths
                 const pathProps = `<div class="prop-group"><label>Stroke Color</label><input type="color" value="${context.stroke}" data-prop="stroke"></div>
                                    <div class="prop-group"><label>Stroke Width</label><input type="number" value="${context.strokeWidth}" data-prop="strokeWidth"></div>
                                    <div class="prop-group"><label>Line Cap</label>
                                        <select data-prop="strokeLineCap">
                                            <option value="butt" ${context.strokeLineCap === 'butt' ? 'selected' : ''}>Butt</option>
                                            <option value="round" ${context.strokeLineCap === 'round' ? 'selected' : ''}>Round</option>
                                            <option value="square" ${context.strokeLineCap === 'square' ? 'selected' : ''}>Square</option>
                                        </select>
                                    </div>
                                    <div class="prop-group"><label>Line Join</label>
                                        <select data-prop="strokeLineJoin">
                                            <option value="miter" ${context.strokeLineJoin === 'miter' ? 'selected' : ''}>Miter</option>
                                            <option value="round" ${context.strokeLineJoin === 'round' ? 'selected' : ''}>Round</option>
                                            <option value="bevel" ${context.strokeLineJoin === 'bevel' ? 'selected' : ''}>Bevel</option>
                                        </select>
                                    </div>`;
                 propertiesPanelContent.innerHTML += pathProps;
            } else if (context.type === 'polygon') { // For lasso selection as an object
                const polygonProps = `<div class="prop-group"><label>Fill</label><input type="color" value="${context.fill}" data-prop="fill"></div>
                                    <div class="prop-group"><label>Stroke</label><input type="color" value="${context.stroke}" data-prop="stroke"></div>
                                    <div class="prop-group"><label>Stroke Width</label><input type="number" value="${context.strokeWidth}" data-prop="strokeWidth"></div>
                                    <button class="primary-btn" id="clear-lasso-btn">Clear Lasso</button>`;
                propertiesPanelContent.innerHTML += polygonProps;
            }


            // Attach input event listeners for object properties
            propertiesPanelContent.querySelectorAll('input:not([data-tool-prop]), select:not([data-tool-prop])').forEach(input => {
                input.addEventListener('input', (e) => {
                    const prop = e.target.dataset.prop;
                    let value = e.target.value;

                    if (e.target.type === 'number' || e.target.type === 'range') {
                        value = parseFloat(value);
                    }

                    if (prop === 'scaledWidth' && context.type !== 'i-text') { // Prevent scaling text by direct width/height input
                        context.scaleToWidth(value);
                    } else if (prop === 'scaledHeight' && context.type !== 'i-text') {
                        context.scaleToHeight(value);
                    } else if (prop === 'scaledRadius' && context.type === 'circle') {
                        context.set({ radius: value / context.scaleX }); // Update raw radius, not scaled
                    }
                    else if (prop === 'left' || prop === 'top') {
                         context.set(prop, value);
                    }
                    else {
                        context.set(prop, value);
                    }

                    context.setCoords(); // Update object's coordinates and boundaries
                    canvas.renderAll();
                });
            });

            // Specific event listeners for image filters
            const addBlurFilterBtn = document.getElementById('add-blur-filter-btn');
            if (addBlurFilterBtn) {
                addBlurFilterBtn.addEventListener('click', () => {
                    if (context.type === 'image') {
                        // Check if blur filter already exists to avoid duplicates
                        const hasBlur = context.filters.some(f => f.type === 'Blur');
                        if (!hasBlur) {
                            context.filters.push(new fabric.Image.filters.Blur({
                                blur: 0.2 // Default blur amount
                            }));
                        } else {
                            // If blur exists, increase it (example)
                            const blurFilter = context.filters.find(f => f.type === 'Blur');
                            if (blurFilter) blurFilter.blur = Math.min(1.0, blurFilter.blur + 0.1);
                        }

                        context.applyFilters();
                        canvas.renderAll();
                        saveCanvasState();
                        showCustomAlert('Blur filter applied!');
                    }
                });
            }

            const removeFiltersBtn = document.getElementById('remove-filters-btn');
            if (removeFiltersBtn) {
                removeFiltersBtn.addEventListener('click', () => {
                    if (context.type === 'image') {
                        context.filters = []; // Clear all filters
                        context.applyFilters();
                        canvas.renderAll();
                        saveCanvasState();
                        showCustomAlert('All filters removed!');
                    }
                });
            }

            const clearSelectionBtn = document.getElementById('clear-selection-btn');
            if (clearSelectionBtn) {
                clearSelectionBtn.addEventListener('click', () => {
                    if (currentSelectionRect) {
                        canvas.remove(currentSelectionRect);
                        currentSelectionRect = null;
                        canvas.discardActiveObject().renderAll();
                        updateUI(null, false); // No history save for clearing a temporary selection
                    }
                });
            }

            const clearLassoBtn = document.getElementById('clear-lasso-btn');
            if (clearLassoBtn) {
                clearLassoBtn.addEventListener('click', () => {
                    if (lassoPoly) {
                        canvas.remove(lassoPoly);
                        lassoPoly = null;
                        lassoPoints = [];
                        canvas.discardActiveObject().renderAll();
                        updateUI(null, false); // No history save for clearing a temporary selection
                    }
                });
            }

        } else {
            // No object or specific tool selected, show placeholder
            propertiesPanelContent.style.display = 'none';
            propertiesPanelPlaceholder.style.display = 'flex';
        }
    }

    // --- AI GENERATION FUNCTIONS ---
    async function generateImage() {
        showCustomAlert('Generating image... This may take a moment.');
        generateAiImageBtn.disabled = true;
        sendToEditBtn.classList.add('hidden'); // Hide "Send to Edit" until image is ready

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

        // Base request body
        let requestBody = {
            model: model,
            prompt: prompt,
            num_images: num_images,
            sampling_method: sampling_method,
            sampling_steps: sampling_steps,
            guidance_scale: guidance_scale,
            seed: seed,
            negative_prompt: negative_prompt || undefined,
            style_preset: style_preset,
            aspect_ratio: aspect_ratio,
        };

        let endpoint = 'generate'; // Default to text-to-image

        if (img2img_base64) {
            requestBody.image_base64 = img2img_base64;
            endpoint = 'img2img';
        } else if (inpainting_prompt && canvas.getActiveObject()) {
            // For inpainting, need an active selection
            const activeObject = canvas.getActiveObject();
            if (!activeObject || activeObject.type === 'image') { // Only allow inpainting on existing objects, not whole canvas
                showCustomAlert('For inpainting, please select an area or object on the canvas first.');
                generateAiImageBtn.disabled = false;
                return;
            }
            // Get selected area as base64
            const selectedData = canvas.toDataURL({
                left: activeObject.left,
                top: activeObject.top,
                width: activeObject.width * activeObject.scaleX,
                height: activeObject.height * activeObject.scaleY,
                format: 'png',
                multiplier: 1 // Crucial for pixel-perfect selection
            });
            requestBody.image_base64 = selectedData;
            requestBody.mask_base64 = await generateMaskForObject(activeObject); // Generate a mask
            requestBody.prompt = inpainting_prompt; // Use inpainting prompt
            endpoint = 'inpainting';
        } else if (outpainting_prompt) {
            // For outpainting, capture current canvas and extend it
            const currentCanvasData = canvas.toDataURL({ format: 'png' });
            requestBody.image_base64 = currentCanvasData;
            requestBody.prompt = outpainting_prompt; // Use outpainting prompt
            requestBody.target_width = canvas.width * 1.2; // Example: extend by 20%
            requestBody.target_height = canvas.height * 1.2;
            endpoint = 'outpainting';
        }

        try {
            // Placeholder fetch call for AI generation
            // Replace with actual API call to your AI model
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${AI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ instances: { prompt: requestBody.prompt }, parameters: { sampleCount: requestBody.num_images } }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('AI Generation Error:', errorData);
                showCustomAlert(`AI generation failed: ${errorData.error.message || 'Unknown error.'}`);
                return;
            }

            const data = await response.json();
            if (data.predictions && data.predictions.length > 0) {
                const imageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
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
        // Create a temporary canvas to draw the mask
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw a black background (transparent areas for the mask)
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the object in white on the mask canvas
        const originalFill = obj.fill;
        const originalOpacity = obj.opacity;

        obj.set({ fill: 'white', opacity: 1 }); // Draw object white for the mask
        const originalCanvasInstance = obj.canvas; // Store original canvas reference
        obj.canvas = { contextTop: tempCtx, getContext: () => tempCtx, getVpCoords: () => ({ tl: { x: 0, y: 0 }}) }; // Mock fabric.js canvas object
        obj.render(tempCtx);
        obj.canvas = originalCanvasInstance; // Restore original canvas reference
        obj.set({ fill: originalFill, opacity: originalOpacity }); // Restore original properties

        return tempCanvas.toDataURL('image/png').split(',')[1]; // Return base64 without data URI prefix
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
            aiImg2ImgBase64Data.value = f.target.result.split(',')[1]; // Store base64 data
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
        if (e.ctrlKey || e.metaKey) { // Ctrl for Windows/Linux, Cmd for Mac
            switch (e.key.toLowerCase()) {
                case 'z': // Undo
                    e.preventDefault(); // Prevent browser undo
                    undo();
                    break;
                case 'y': // Redo
                    e.preventDefault(); // Prevent browser redo
                    redo();
                    break;
                case 's': // Save (Prevent browser save dialog)
                    e.preventDefault();
                    showCustomAlert('Save functionality is not yet implemented (Ctrl/Cmd+S for saving project state). Use "Export as PNG" for now.');
                    break;
                case 'a': // Select All
                    e.preventDefault();
                    if (canvas.getObjects().length > 0) {
                        canvas.discardActiveObject();
                        const objectsToSelect = canvas.getObjects().filter(obj => obj.selectable);
                        if (objectsToSelect.length > 0) {
                            const group = new fabric.Group(objectsToSelect);
                            canvas.setActiveObject(group);
                            canvas.renderAll();
                            updateUI(null, false);
                        }
                    }
                    break;
                case 'd': // Deselect
                    e.preventDefault();
                    canvas.discardActiveObject().renderAll();
                    updateUI(null, false);
                    break;
                case 'x': // Cut
                    e.preventDefault();
                    showCustomAlert('Cut functionality not implemented.');
                    break;
                case 'c': // Copy
                    e.preventDefault();
                    showCustomAlert('Copy functionality not implemented.');
                    break;
                case 'v': // Paste
                    e.preventDefault();
                    showCustomAlert('Paste functionality not implemented.');
                    break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'v': setActiveTool('move'); break;
                case 'h': setActiveTool('hand'); break; // Hand tool
                case 'z': setActiveTool('zoom'); break; // Zoom tool
                case 'i': setActiveTool('color-picker'); break; // Color Picker
                case 'c': setActiveTool('crop'); break;
                case 'b': setActiveTool('brush'); break;
                case 'e': setActiveTool('eraser'); break;
                case 't': setActiveTool('text'); break;
                case 'm': setActiveTool('selection'); break; // Marquee Selection
                case 'l': setActiveTool('lasso'); break;
                case 'w': setActiveTool('wand'); break; // Magic Wand
                case 's': setActiveTool('clone-stamp'); break; // Clone Stamp
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

        // Close when clicking outside the alert box
        customAlertModal.addEventListener('click', (e) => {
            if (e.target === customAlertModal) {
                customAlertModal.style.display = 'none';
            }
        });
    }

    // --- APP MODE (EDIT/GENERATE) ---
    function setAppMode(mode) {
        mainLayout.dataset.appMode = mode;
        if (window.innerWidth > 768) { // Only apply desktop-specific mode changes
            if (mode === 'generate') {
                aiGenerationPanel.classList.remove('collapsed');
                aiGenerationPanel.classList.remove('mobile-active');
            } else if (mode === 'edit') {
                aiGenerationPanel.classList.add('collapsed');
                aiGenerationPanel.classList.remove('mobile-active');
            }
        }
    }

    // --- DRAGGABLE PANELS (Desktop only for now) ---
    function setupDraggablePanels() {
        if (window.innerWidth > 768) { // Only enable draggable/resizable on desktop
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
                        let x = (parseFloat(target.getAttribute('data-x')) || 0);
                        let y = (parseFloat(target.getAttribute('data-y')) || 0);

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
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        } else {
            // Disable interact.js functionality on mobile if it was enabled
            interact('.collapsible-panel').unset();
        }
    }

    // --- INITIALIZE ---
    initializeCanvas();
});
