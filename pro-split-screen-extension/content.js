// content.js - Enhanced with better error handling and initialization

// Prevent multiple script injections
if (window.proSplitScreenExtension) {
    // Script already loaded, exit early
} else {
    window.proSplitScreenExtension = true;
    
    // Global state for the extension
    window.proSplitState = {
        isSplit: false,
        isHorizontal: true,
        pane1Size: '50%',
        url2: 'about:blank',
    };

    // Move all variables to window scope to prevent scoping issues
    window.splitContainer = null;
    window.pane1 = null;
    window.pane2 = null;
    window.resizer = null;
    window.iframe = null;
    window.originalBodyChildren = [];
    window.originalStyles = { html: '', body: '' };
    window.isInitialized = false;

    initializeExtension();
}

function initializeExtension() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkStoredState);
    } else {
        checkStoredState();
    }
}

function applyPreset(preset) {
    const presets = {
        'half-left': { size: '50%', horizontal: true },
        'half-right': { size: '50%', horizontal: true },
        'two-thirds-left': { size: '67%', horizontal: true },
        'one-third-right': { size: '33%', horizontal: true },
        'quarter-top-left': { size: '50%', horizontal: false },
        'quarter-top-right': { size: '50%', horizontal: false }
    };
    
    if (presets[preset]) {
        window.proSplitState.pane1Size = presets[preset].size;
        window.proSplitState.isHorizontal = presets[preset].horizontal;
        applyLayout();
        saveState();
    }
}

function loadTabInPane(tabId, url) {
    if (window.iframe) {
        window.iframe.src = url;
        window.proSplitState.url2 = url;
        saveState();
    }
}

function checkStoredState() {
    try {
        chrome.storage.local.get([`split_state_${getTabId()}`], (result) => {
            const storedState = result[`split_state_${getTabId()}`];
            if (storedState && storedState.isSplit) {
                if (document.readyState === 'complete') {
                    initializeSplitView(storedState);
                } else {
                    window.addEventListener('load', () => initializeSplitView(storedState), { once: true });
                }
            }
            isInitialized = true;
        });
    } catch (error) {
        console.error('Storage access failed:', error);
        window.isInitialized = true;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.action) {
            case 'toggleSplit':
                toggleSplitScreen();
                sendResponse({ success: true });
                break;
            case 'loadUrl':
                if (window.proSplitState.isSplit && window.iframe) {
                    window.iframe.src = request.url;
                    window.proSplitState.url2 = request.url;
                    saveState();
                    sendResponse({ success: true });
                }
                break;
            case 'toggleLayout':
                if (window.proSplitState.isSplit) {
                    toggleLayout();
                    sendResponse({ success: true });
                }
                break;
            case 'resetPanes':
                if (window.proSplitState.isSplit) {
                    resetPanes();
                    sendResponse({ success: true });
                }
                break;
            case 'applyPreset':
                if (window.proSplitState.isSplit && request.preset) {
                    applyPreset(request.preset);
                    sendResponse({ success: true });
                }
                break;
            case 'loadTab':
                if (window.proSplitState.isSplit && request.tabId && request.url) {
                    loadTabInPane(request.tabId, request.url);
                    sendResponse({ success: true });
                }
                break;
            case 'queryState':
                sendResponse({ state: window.proSplitState, initialized: window.isInitialized });
                break;
            case 'reinitialize':
                if (request.state) {
                    initializeSplitView(request.state);
                    sendResponse({ success: true });
                }
                break;
        }
    } catch (error) {
        console.error('Message handling error:', error);
        sendResponse({ success: false, error: error.message });
    }
    return true;
});

function initializeSplitView(initialState) {
    if (window.proSplitState.isSplit) return;

    try {
        window.proSplitState = { ...window.proSplitState, ...initialState, isSplit: true };

        // Create DOM elements
        window.splitContainer = document.createElement('div');
        window.splitContainer.id = 'pro-split-container';

        window.pane1 = document.createElement('div');
        window.pane1.id = 'pro-split-pane1';

        window.pane2 = document.createElement('div');
        window.pane2.id = 'pro-split-pane2';

        window.iframe = document.createElement('iframe');
        window.iframe.src = window.proSplitState.url2 || 'about:blank';
        window.iframe.style.width = '100%';
        window.iframe.style.height = '100%';
        window.iframe.style.border = 'none';
        window.pane2.appendChild(window.iframe);

        window.resizer = document.createElement('div');
        window.resizer.id = 'pro-split-resizer';
        setupResizer();

        // Store original styles
        window.originalStyles.html = document.documentElement.style.cssText;
        window.originalStyles.body = document.body.style.cssText;

        // Apply new styles
        document.documentElement.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        // Move original content to pane1
        window.originalBodyChildren = [];
        while (document.body.firstChild) {
            window.originalBodyChildren.push(document.body.firstChild);
            window.pane1.appendChild(document.body.firstChild);
        }

        // Build split structure
        document.body.appendChild(window.splitContainer);
        window.splitContainer.appendChild(window.pane1);
        window.splitContainer.appendChild(window.resizer);
        window.splitContainer.appendChild(window.pane2);

        applyLayout();
        saveState();
        updateBrowserActionIcon(true);
        
    } catch (error) {
        console.error('Split view initialization failed:', error);
        // Cleanup on failure
        if (window.splitContainer && window.splitContainer.parentNode) {
            window.splitContainer.parentNode.removeChild(window.splitContainer);
        }
        window.proSplitState.isSplit = false;
    }
}

function toggleSplitScreen() {
    if (window.proSplitState.isSplit) {
        disableSplitScreen();
    } else {
        initializeSplitView({ isSplit: true, url2: 'about:blank' });
    }
}

function disableSplitScreen() {
    try {
        if (window.splitContainer) {
            // Restore original content
            while (window.pane1.firstChild) {
                document.body.appendChild(window.pane1.firstChild);
            }
            window.splitContainer.remove();
        }
        
        // Restore original styles
        document.documentElement.style.cssText = window.originalStyles.html;
        document.body.style.cssText = window.originalStyles.body;

        // Reset state
        window.proSplitState.isSplit = false;
        window.splitContainer = window.pane1 = window.pane2 = window.resizer = window.iframe = null;
        window.originalBodyChildren = [];
        
        saveState();
        updateBrowserActionIcon(false);
        
    } catch (error) {
        console.error('Disable split screen failed:', error);
        // Force page reload as fallback
        window.location.reload();
    }
}

function applyLayout() {
    if (!window.splitContainer) return;
    
    try {
        window.splitContainer.style.display = 'flex';
        window.splitContainer.style.width = '100%';
        window.splitContainer.style.height = '100%';
        window.splitContainer.style.position = 'fixed';
        window.splitContainer.style.top = '0';
        window.splitContainer.style.left = '0';
        window.splitContainer.style.zIndex = '2147483647';
        
        // Fix missing variable reference
        if (window.proSplitState.isHorizontal) {
            window.splitContainer.style.flexDirection = 'row';
            window.pane1.style.width = window.proSplitState.pane1Size;
            window.pane2.style.width = `calc(100% - ${window.proSplitState.pane1Size} - 5px)`;
            window.pane1.style.height = '100%';
            window.pane2.style.height = '100%';
            window.resizer.style.width = '5px';
            window.resizer.style.height = '100%';
            window.resizer.style.cursor = 'ew-resize';
        } else {
            window.splitContainer.style.flexDirection = 'column';
            window.pane1.style.height = window.proSplitState.pane1Size;
            window.pane2.style.height = `calc(100% - ${window.proSplitState.pane1Size} - 5px)`;
            window.pane1.style.width = '100%';
            window.pane2.style.width = '100%';
            window.resizer.style.height = '5px';
            window.resizer.style.width = '100%';
            window.resizer.style.cursor = 'ns-resize';
        }
        
        // Style panes
        window.pane1.style.overflow = 'auto';
        window.pane1.style.position = 'relative';
        window.pane2.style.overflow = 'auto';
        window.pane2.style.position = 'relative';
        window.pane2.style.backgroundColor = '#ffffff';
        
        // Style resizer
        window.resizer.style.backgroundColor = 'transparent';
        window.resizer.style.position = 'relative';
        window.resizer.style.flexShrink = '0';
        window.resizer.style.transition = 'background-color 0.2s ease';
        
    } catch (error) {
        console.error('Apply layout failed:', error);
    }
}

function toggleLayout() {
    window.proSplitState.isHorizontal = !window.proSplitState.isHorizontal;
    applyLayout();
    saveState();
}

function resetPanes() {
    window.proSplitState.pane1Size = '50%';
    applyLayout();
    saveState();
}

function setupResizer() {
    let isResizing = false;
    let onMouseMove, onMouseUp;

    window.resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        
        // Add visual feedback
        window.resizer.style.backgroundColor = 'rgba(74, 144, 226, 0.5)';
        document.body.style.userSelect = 'none';
        document.body.style.cursor = window.proSplitState.isHorizontal ? 'ew-resize' : 'ns-resize';
        
        onMouseMove = (e) => {
            if (!isResizing) return;
            e.preventDefault();
            
            try {
                if (window.proSplitState.isHorizontal) {
                    const newSize = (e.clientX / window.innerWidth) * 100;
                    if (newSize > 10 && newSize < 90) {
                        window.proSplitState.pane1Size = `${newSize}%`;
                    }
                } else {
                    const newSize = (e.clientY / window.innerHeight) * 100;
                    if (newSize > 10 && newSize < 90) {
                        window.proSplitState.pane1Size = `${newSize}%`;
                    }
                }
                applyLayout();
            } catch (error) {
                console.error('Resize error:', error);
            }
        };
        
        onMouseUp = (e) => {
            e.preventDefault();
            isResizing = false;
            
            // Remove visual feedback
            window.resizer.style.backgroundColor = 'transparent';
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveState();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    // Hover effect
    window.resizer.addEventListener('mouseenter', () => {
        if (!isResizing) {
            window.resizer.style.backgroundColor = 'rgba(74, 144, 226, 0.3)';
        }
    });
    
    window.resizer.addEventListener('mouseleave', () => {
        if (!isResizing) {
            window.resizer.style.backgroundColor = 'transparent';
        }
    });
}

function saveState() {
    try {
        // Check if chrome.storage is available
        if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [`split_state_${getTabId()}`]: window.proSplitState });
        }
    } catch (error) {
        // Silently handle extension context invalidation
    }
}

function updateBrowserActionIcon(isSplit) {
    try {
        // Check if chrome.runtime is available
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'updateIcon', isSplit: isSplit });
        }
    } catch (error) {
        // Silently handle extension context invalidation
    }
}

function getTabId() {
    if (!window.name || !window.name.startsWith('pro-split-tab-')) {
        window.name = `pro-split-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return window.name;
}