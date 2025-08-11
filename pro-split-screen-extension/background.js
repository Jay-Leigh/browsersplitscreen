// background.js - Service Worker

// Listen for the extension's keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-split-screen') {
    // Send a message to the content script in the active tab to toggle the split view
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSplit' });
  }
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // A message from content.js to update the popup icon and title
  if (request.action === 'updateIcon') {
    updateActionIcon(sender.tab.id, request.isSplit);
  }
});

// Listen for when a tab is updated (e.g., reloaded or URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab finishes loading, check its stored state
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get([`split_state_${tabId}`], (result) => {
      const state = result[`split_state_${tabId}`];
      if (state && state.isSplit) {
        // If the tab was previously split, tell the content script to re-initialize the split view
        chrome.tabs.sendMessage(tabId, { action: 'reinitialize', state: state });
        updateActionIcon(tabId, true);
      } else {
        updateActionIcon(tabId, false);
      }
    });
  }
});

// Listen for when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up storage for the closed tab to prevent memory leaks
  chrome.storage.local.remove([`split_state_${tabId}`]);
});


/**
 * Updates the extension's icon and title in the toolbar to reflect the current state.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} isSplit - Whether the tab is currently in split-screen mode.
 */
function updateActionIcon(tabId, isSplit) {
  if (isSplit) {
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "icons/icon16-active.png", // Assumes you create an "active" version of the icon
        "48": "icons/icon48-active.png",
        "128": "icons/icon128-active.png"
      }
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: 'Disable Split Screen'
    });
  } else {
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: 'Enable Split Screen'
    });
  }
}
