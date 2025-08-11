// background.js - Enhanced with fallback mechanisms

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-split-screen') {
    handleToggleSplit(tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateIcon') {
    updateActionIcon(sender.tab.id, request.isSplit);
  } else if (request.action === 'forceToggleSplit') {
    handleToggleSplit(request.tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get([`split_state_${tabId}`], (result) => {
      const state = result[`split_state_${tabId}`];
      if (state && state.isSplit) {
        // Inject scripts and reinitialize
        injectScriptsAndReinitialize(tabId, state);
        updateActionIcon(tabId, true);
      } else {
        updateActionIcon(tabId, false);
      }
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`split_state_${tabId}`]);
});

async function handleToggleSplit(tabId) {
  try {
    // First ensure scripts are injected
    await ensureScriptsInjected(tabId);
    
    // Try to send message to content script
    await chrome.tabs.sendMessage(tabId, { action: 'toggleSplit' });
  } catch (error) {
    console.error('Toggle split failed:', error);
    // Force script injection and try again
    try {
      await forceInjectAndToggle(tabId);
    } catch (fallbackError) {
      console.error('Fallback toggle failed:', fallbackError);
    }
  }
}

async function ensureScriptsInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    });
    
    // Wait for scripts to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch (error) {
    // Scripts might already be injected
    console.log('Script injection status:', error.message);
  }
}

async function forceInjectAndToggle(tabId) {
  // Force inject content script
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  });
  
  await chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ['styles.css']
  });
  
  // Wait longer for initialization
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try toggle again
  await chrome.tabs.sendMessage(tabId, { action: 'toggleSplit' });
}

async function injectScriptsAndReinitialize(tabId, state) {
  try {
    await ensureScriptsInjected(tabId);
    await chrome.tabs.sendMessage(tabId, { action: 'reinitialize', state: state });
  } catch (error) {
    console.error('Reinitialize failed:', error);
  }
}

function updateActionIcon(tabId, isSplit) {
  const iconPath = isSplit ? 
    {
      "16": "icons/icon16-active.png",
      "48": "icons/icon48-active.png", 
      "128": "icons/icon128-active.png"
    } : 
    {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    };
    
  chrome.action.setIcon({
    tabId: tabId,
    path: iconPath
  }).catch(() => {
    // Fallback to default icons if active icons don't exist
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    });
  });
  
  chrome.action.setTitle({
    tabId: tabId,
    title: isSplit ? 'Disable Split Screen' : 'Enable Split Screen'
  });
}