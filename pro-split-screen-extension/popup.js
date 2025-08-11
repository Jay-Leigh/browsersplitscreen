// popup.js - Logic for the extension's popup UI

// Get references to all the interactive elements in the popup
const statusDiv = document.getElementById('status');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrl');
const toggleLayoutBtn = document.getElementById('toggleLayout');
const resetPanesBtn = document.getElementById('resetPanes');
const toggleSplitBtn = document.getElementById('toggleSplit');
const mainContent = document.getElementById('main-content');
const loaderContent = document.getElementById('loader-content');

let activeTabId = null;

// This function runs as soon as the popup is opened
document.addEventListener('DOMContentLoaded', async () => {
    // Find the currently active tab in the current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
        showErrorState("No active tab found.");
        return;
    }
    
    const tab = tabs[0];
    activeTabId = tab.id;

    // Certain pages (like the chrome:// pages or the new tab page) cannot be scripted.
    // We check for this and show an error state in the popup if so.
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
        showErrorState("This page cannot be split.");
        return;
    }

    // Request the current split state from the content script in the active tab
    try {
        const response = await chrome.tabs.sendMessage(activeTabId, { action: 'queryState' });
        if (response) {
            updatePopupUI(response.state);
        } else {
             // If content script isn't ready, get state from storage as a fallback
            const result = await chrome.storage.local.get([`split_state_${activeTabId}`]);
            const state = result[`split_state_${activeTabId}`] || { isSplit: false };
            updatePopupUI(state);
        }
    } catch (error) {
        // This catch block handles cases where the content script hasn't been injected yet
        // (e.g., after an extension update or on a fresh install).
        console.warn("Could not query content script, likely not injected yet. Relying on storage.");
        const result = await chrome.storage.local.get([`split_state_${activeTabId}`]);
        const state = result[`split_state_${activeTabId}`] || { isSplit: false };
        updatePopupUI(state);
    }
});

/**
 * Updates the entire popup's appearance and button states based on the current split state.
 * @param {object} state - The state object for the current tab.
 */
function updatePopupUI(state) {
    if (state.isSplit) {
        statusDiv.textContent = 'Split Screen is ACTIVE';
        statusDiv.className = 'status-on';
        toggleSplitBtn.textContent = 'Disable Split Screen';
        toggleSplitBtn.className = 'btn-danger';
        urlInput.value = state.url2 || '';
        // Enable all buttons when split is active
        [loadUrlBtn, toggleLayoutBtn, resetPanesBtn].forEach(btn => btn.disabled = false);
    } else {
        statusDiv.textContent = 'Split Screen is INACTIVE';
        statusDiv.className = 'status-off';
        toggleSplitBtn.textContent = 'Enable Split Screen';
        toggleSplitBtn.className = 'btn-primary';
        urlInput.value = '';
        // Disable buttons that only work when split is active
        [loadUrlBtn, toggleLayoutBtn, resetPanesBtn].forEach(btn => btn.disabled = true);
    }
}

/**
 * Shows an error message in the popup and hides the main controls.
 * @param {string} message - The error message to display.
 */
function showErrorState(message) {
    mainContent.style.display = 'none';
    loaderContent.style.display = 'block';
    loaderContent.querySelector('p').textContent = message;
}

// --- Event Listeners for Popup Buttons ---

// Main toggle button (Enable/Disable)
toggleSplitBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTabId, { action: 'toggleSplit' });
    // We close the popup immediately for a smoother user experience.
    // The content script will update the UI state.
    window.close();
});

// Load URL button
loadUrlBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    // Basic check to add https:// if no protocol is specified
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    if (url) {
        chrome.tabs.sendMessage(activeTabId, { action: 'loadUrl', url: url });
        window.close();
    }
});

// Toggle Layout button
toggleLayoutBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTabId, { action: 'toggleLayout' });
    window.close();
});

// Reset Panes button
resetPanesBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTabId, { action: 'resetPanes' });
    window.close();
});
