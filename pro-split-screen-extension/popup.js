// popup.js - Enhanced with Windows 11 style presets and tab management

const statusDiv = document.getElementById('status');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrl');
const toggleLayoutBtn = document.getElementById('toggleLayout');
const resetPanesBtn = document.getElementById('resetPanes');
const toggleSplitBtn = document.getElementById('toggleSplit');
const mainContent = document.getElementById('main-content');
const loaderContent = document.getElementById('loader-content');
const presetButtons = document.getElementById('preset-buttons');
const tabSelector = document.getElementById('tab-selector');
const availableTabs = document.getElementById('available-tabs');

let activeTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tabs.length === 0) {
            showErrorState("No active tab found.");
            return;
        }
        
        const tab = tabs[0];
        activeTabId = tab.id;

        // Check for unsupported pages
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('about:') || 
            tab.url.startsWith('moz-extension://') ||
            tab.url.startsWith('edge://')) {
            showErrorState("This page cannot be split.");
            return;
        }

        // Try to get state from content script, fallback to storage
        await initializePopupState();
        
        // Load available tabs for selection
        await loadAvailableTabs();
        
    } catch (error) {
        console.error('Popup initialization error:', error);
        showErrorState("Error initializing extension.");
    }
});

async function loadAvailableTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const otherTabs = tabs.filter(tab => tab.id !== activeTabId && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('moz-extension://') &&
            !tab.url.startsWith('edge://'));
        
        availableTabs.innerHTML = '';
        
        if (otherTabs.length === 0) {
            availableTabs.innerHTML = '<p style="color: #666; font-size: 12px; padding: 8px;">No other tabs available</p>';
            return;
        }
        
        otherTabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            tabItem.innerHTML = `
                <img src="${tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjgiIHk9IjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPj88L3RleHQ+Cjwvc3ZnPgo='}" width="16" height="16">
                <span>${tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title}</span>
            `;
            tabItem.onclick = () => selectTab(tab.id, tab.url);
            availableTabs.appendChild(tabItem);
        });
    } catch (error) {
        console.error('Failed to load tabs:', error);
    }
}

function selectTab(tabId, url) {
    sendMessageSafely({ action: 'loadTab', tabId: tabId, url: url });
}

async function initializePopupState() {
    let state = { isSplit: false };
    
    try {
        // First, try to inject content script if needed
        await ensureContentScript();
        
        // Try to get state from content script
        const response = await chrome.tabs.sendMessage(activeTabId, { action: 'queryState' });
        if (response && response.state) {
            state = response.state;
        } else {
            // Fallback to storage
            const result = await chrome.storage.local.get([`split_state_${activeTabId}`]);
            state = result[`split_state_${activeTabId}`] || { isSplit: false };
        }
    } catch (error) {
        // Content script not ready, use storage
        const result = await chrome.storage.local.get([`split_state_${activeTabId}`]);
        state = result[`split_state_${activeTabId}`] || { isSplit: false };
    }
    
    updatePopupUI(state);
}

async function ensureContentScript() {
    try {
        // Try to inject content script if it's not already there
        await chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            files: ['content.js']
        });
        
        // Also inject CSS
        await chrome.scripting.insertCSS({
            target: { tabId: activeTabId },
            files: ['styles.css']
        });
        
        // Wait a moment for script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        // Script might already be injected, or injection failed
        console.log('Script injection result:', error.message);
    }
}

function updatePopupUI(state) {
    if (state.isSplit) {
        statusDiv.textContent = 'Split Screen is ACTIVE';
        statusDiv.className = 'status-on';
        toggleSplitBtn.textContent = 'Disable Split Screen';
        toggleSplitBtn.className = 'btn-danger';
        urlInput.value = state.url2 || '';
        [loadUrlBtn, toggleLayoutBtn, resetPanesBtn].forEach(btn => btn.disabled = false);
        presetButtons.style.display = 'block';
        tabSelector.style.display = 'block';
    } else {
        statusDiv.textContent = 'Split Screen is INACTIVE';
        statusDiv.className = 'status-off';
        toggleSplitBtn.textContent = 'Enable Split Screen';
        toggleSplitBtn.className = 'btn-primary';
        urlInput.value = '';
        [loadUrlBtn, toggleLayoutBtn, resetPanesBtn].forEach(btn => btn.disabled = true);
        presetButtons.style.display = 'none';
        tabSelector.style.display = 'none';
    }
}

function showErrorState(message) {
    mainContent.style.display = 'none';
    loaderContent.style.display = 'block';
    loaderContent.querySelector('p').textContent = message;
}

// Safe message sending with retry
async function sendMessageSafely(message) {
    try {
        await ensureContentScript();
        await chrome.tabs.sendMessage(activeTabId, message);
        window.close();
    } catch (error) {
        console.error('Message send failed:', error);
        // For toggle split, we can try background script fallback
        if (message.action === 'toggleSplit') {
            chrome.runtime.sendMessage({ action: 'forceToggleSplit', tabId: activeTabId });
            window.close();
        }
    }
}

// Event Listeners
toggleSplitBtn.addEventListener('click', () => {
    sendMessageSafely({ action: 'toggleSplit' });
});

loadUrlBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    if (url) {
        sendMessageSafely({ action: 'loadUrl', url: url });
    }
});

toggleLayoutBtn.addEventListener('click', () => {
    sendMessageSafely({ action: 'toggleLayout' });
});

resetPanesBtn.addEventListener('click', () => {
    sendMessageSafely({ action: 'resetPanes' });
});

// Preset layout buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('preset-btn')) {
        const preset = e.target.dataset.preset;
        sendMessageSafely({ action: 'applyPreset', preset: preset });
    }
});