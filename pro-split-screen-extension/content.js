// content.js - This script is injected into every webpage.

// --- Global State ---
// We keep track of the state within the script to manage the UI.
let state = {
    isSplit: false,
    isHorizontal: true,
    pane1Size: '50%',
    url2: 'about:blank',
};

// --- DOM Element References ---
// To avoid repeatedly querying the DOM, we store references to the elements we create.
let splitContainer = null;
let pane1 = null;
let pane2 = null;
let resizer = null;
let iframe = null;
let originalBodyChildren = [];
let originalStyles = {
    html: '',
    body: ''
};

// --- Initialization ---
// The script starts by checking if the tab was previously split.
chrome.storage.local.get([`split_state_${getTabId()}`], (result) => {
    const storedState = result[`split_state_${getTabId()}`];
    if (storedState && storedState.isSplit) {
        // If state is found in storage, wait for the page to fully load then initialize.
        // This ensures all original page elements are present before we move them.
        if (document.readyState === 'complete') {
            initializeSplitView(storedState);
        } else {
            window.addEventListener('load', () => initializeSplitView(storedState), { once: true });
        }
    }
});

// --- Message Listener ---
// This is the main communication hub, listening for commands from the popup or background script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'toggleSplit':
            toggleSplitScreen();
            break;
        case 'loadUrl':
            if (state.isSplit && iframe) {
                iframe.src = request.url;
                state.url2 = request.url;
                saveState();
            }
            break;
        case 'toggleLayout':
            if (state.isSplit) toggleLayout();
            break;
        case 'resetPanes':
            if (state.isSplit) resetPanes();
            break;
        case 'queryState':
            // The popup asks for the current state to render its UI correctly.
            sendResponse({ state: state });
            break;
        case 'reinitialize':
            // The background script tells us to re-split the view (e.g., after a reload).
            initializeSplitView(request.state);
            break;
    }
    // Return true to indicate that we will send a response asynchronously.
    return true;
});

/**
 * Creates the entire split-screen view. This is the core function.
 * @param {object} initialState - The state to initialize with.
 */
function initializeSplitView(initialState) {
    if (state.isSplit) return; // Don't run if already split

    state = { ...state, ...initialState, isSplit: true };

    // --- Create DOM Elements ---
    splitContainer = document.createElement('div');
    splitContainer.id = 'pro-split-container';

    pane1 = document.createElement('div');
    pane1.id = 'pro-split-pane1';

    pane2 = document.createElement('div');
    pane2.id = 'pro-split-pane2';

    iframe = document.createElement('iframe');
    iframe.src = state.url2;
    pane2.appendChild(iframe);

    resizer = document.createElement('div');
    resizer.id = 'pro-split-resizer';
    resizer.addEventListener('mousedown', onMouseDown);

    // --- Non-Destructive Page Manipulation ---
    // This is the key to compatibility. We move existing body elements into pane1
    // instead of overwriting document.body.innerHTML.
    originalStyles.html = document.documentElement.style.cssText;
    originalStyles.body = document.body.style.cssText;

    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
    
    while (document.body.firstChild) {
        originalBodyChildren.push(document.body.firstChild);
        pane1.appendChild(document.body.firstChild);
    }

    // Append the new structure to the now-empty body
    document.body.appendChild(splitContainer);
    splitContainer.appendChild(pane1);
    splitContainer.appendChild(resizer);
    splitContainer.appendChild(pane2);

    // Apply the initial layout and sizes
    applyLayout();
    saveState();
    updateBrowserActionIcon(true);
}

/**
 * Toggles the split screen on or off.
 */
function toggleSplitScreen() {
    if (state.isSplit) {
        // --- Tear Down Split View ---
        if (splitContainer) {
            // Move original content back to the body
            while (pane1.firstChild) {
                document.body.appendChild(pane1.firstChild);
            }
            // Remove the split container
            splitContainer.remove();
        }
        
        // Restore original styles
        document.documentElement.style.cssText = originalStyles.html;
        document.body.style.cssText = originalStyles.body;

        // Reset state and clear references
        state.isSplit = false;
        splitContainer = pane1 = pane2 = resizer = iframe = null;
        originalBodyChildren = [];
        
        saveState();
        updateBrowserActionIcon(false);
    } else {
        // --- Activate Split View ---
        initializeSplitView({ isSplit: true, url2: 'about:blank' });
    }
}

/**
 * Applies the current layout (horizontal/vertical) and pane sizes.
 */
function applyLayout() {
    if (!splitContainer) return;
    if (state.isHorizontal) {
        splitContainer.style.flexDirection = 'row';
        pane1.style.width = state.pane1Size;
        pane2.style.width = `calc(100% - ${state.pane1Size} - 5px)`;
        pane1.style.height = '100%';
        pane2.style.height = '100%';
        resizer.style.cursor = 'ew-resize';
    } else {
        splitContainer.style.flexDirection = 'column';
        pane1.style.height = state.pane1Size;
        pane2.style.height = `calc(100% - ${state.pane1Size} - 5px)`;
        pane1.style.width = '100%';
        pane2.style.width = '100%';
        resizer.style.cursor = 'ns-resize';
    }
}

function toggleLayout() {
    state.isHorizontal = !state.isHorizontal;
    applyLayout();
    saveState();
}

function resetPanes() {
    state.pane1Size = '50%';
    applyLayout();
    saveState();
}

// --- Resizer Drag Logic ---
let onMouseMove, onMouseUp;

function onMouseDown(e) {
    e.preventDefault();
    onMouseMove = (e) => doDrag(e);
    onMouseUp = () => stopDrag();
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function doDrag(e) {
    if (state.isHorizontal) {
        const newSize = (e.clientX / window.innerWidth) * 100;
        if (newSize > 10 && newSize < 90) { // Prevent collapsing panes
            state.pane1Size = `${newSize}%`;
        }
    } else {
        const newSize = (e.clientY / window.innerHeight) * 100;
        if (newSize > 10 && newSize < 90) {
            state.pane1Size = `${newSize}%`;
        }
    }
    applyLayout();
}

function stopDrag() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    saveState(); // Save the final size after dragging is complete
}

// --- Utility Functions ---

/**
 * Saves the current state to chrome.storage.local for persistence.
 */
function saveState() {
    chrome.storage.local.set({ [`split_state_${getTabId()}`]: state });
}

/**
 * Informs the background script to update the toolbar icon.
 * @param {boolean} isSplit - The current split status.
 */
function updateBrowserActionIcon(isSplit) {
    chrome.runtime.sendMessage({ action: 'updateIcon', isSplit: isSplit });
}

/**
 * A simple way to get a unique ID for the current tab.
 * This is a placeholder; in a real extension, the background script provides the tab ID.
 * For content scripts, we can't directly access the tab ID, so this is a simplified approach.
 * A more robust method involves the background script managing IDs.
 */
function getTabId() {
    // This is a simplified way to get a unique identifier for the tab's session.
    if (!window.name) {
        window.name = `pro-split-tab-${Date.now()}`;
    }
    return window.name;
}
