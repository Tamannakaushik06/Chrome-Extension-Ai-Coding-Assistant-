// background.js
// Author:
// Author URI: https://
// Author Github URI: https://www.github.com/
// Project Repository URI: https://github.com/
// Description: Handles all the browser level activities (e.g. tab management, etc.)
// License: MIT
// background.js
// Handles browser level activities (e.g. tab management)

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("AI Coding Assistant installed");
});

// Listen for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    // This won't actually trigger since we have a default_popup in the manifest
    // But keeping it here for potential future use
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getApiKey") {
        chrome.storage.sync.get(["GEMINI_API_KEY"], (result) => {
            sendResponse({ apiKey: result.GEMINI_API_KEY || "" });
        });
        return true; // Required for async response
    }
    
    if (message.action === "setApiKey") {
        chrome.storage.sync.set({ GEMINI_API_KEY: message.apiKey }, () => {
            sendResponse({ success: true });
        });
        return true; // Required for async response
    }
    
    // New message handler for getting chat history list (used by popup.js)
    if (message.action === "getChatHistoryList") {
        // The background script can access localStorage from any tab
        // This will be handled by the popup directly
        sendResponse({ success: true });
        return true;
    }
    
    // New message handler for clearing all chat history (used by popup.js)
    if (message.action === "clearAllChatHistory") {
        // This will be executed in the content script context
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "clearAllChatHistory"}, function(response) {
                sendResponse(response);
            });
        });
        return true;
    }
});