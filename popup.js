document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key-input');
    const saveButton = document.getElementById('save-api-key');
    const deleteButton = document.getElementById('delete-api-key');
    const statusMessage = document.getElementById('status-message');
    
    const GEMINI_API_KEY_STORAGE = "GEMINI_API_KEY";
    
    // Load the API key if it exists
    chrome.storage.sync.get([GEMINI_API_KEY_STORAGE], (result) => {
        const apiKey = result[GEMINI_API_KEY_STORAGE];
        if (apiKey) {
            // Store the actual key for potential use
            apiKeyInput.dataset.fullKey = apiKey;
            
            // Show a masked version for security
            const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
            apiKeyInput.type = "text";
            apiKeyInput.value = maskedKey;
            apiKeyInput.dataset.hasKey = "true";
            
            console.log("API key loaded successfully (masked)");
        }
    });
    
    // Handle save button click
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        
        // If the input shows the masked key, don't save (no changes)
        if (apiKeyInput.dataset.hasKey === "true" && apiKey.includes("...")) {
            showStatus("No changes made", "success");
            return;
        }
        
        if (!apiKey) {
            showStatus("Please enter an API key", "error");
            return;
        }
        
        // Basic validation: Gemini API keys are typically prefixed with "AI"
        if (!apiKey.startsWith("AI")) {
            showStatus("Invalid API key format", "error");
            return;
        }
        
        // Save the API key both via direct storage and message
        chrome.storage.sync.set({ [GEMINI_API_KEY_STORAGE]: apiKey }, () => {
            console.log("API key saved successfully with length:", apiKey.length);
            showStatus("API key saved successfully", "success");
            
            // Also send a message to the background script
            chrome.runtime.sendMessage({ 
                action: "setApiKey", 
                apiKey: apiKey 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError);
                } else if (response && response.success) {
                    console.log("Background script confirmed API key save");
                }
            });
            
            // Store the actual key
            apiKeyInput.dataset.fullKey = apiKey;
            
            // Show masked version
            const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
            apiKeyInput.type = "text";
            apiKeyInput.value = maskedKey;
            apiKeyInput.dataset.hasKey = "true";
        });
    });
    
    // Handle delete button click
    deleteButton.addEventListener('click', () => {
        // Remove the API key from storage
        chrome.storage.sync.remove([GEMINI_API_KEY_STORAGE], () => {
            apiKeyInput.value = "";
            apiKeyInput.type = "password";
            apiKeyInput.dataset.hasKey = "false";
            delete apiKeyInput.dataset.fullKey;
            showStatus("API key deleted", "success");
            
            // Also notify the background script
            chrome.runtime.sendMessage({ 
                action: "setApiKey", 
                apiKey: "" 
            });
        });
    });
    
    // Handle input focus
    apiKeyInput.addEventListener('focus', () => {
        // If showing masked key, clear it to allow new entry
        if (apiKeyInput.dataset.hasKey === "true") {
            apiKeyInput.value = "";
            apiKeyInput.type = "password";
        }
    });
    
    // Show status message
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        console.log(`Status: ${message} (${type})`);
        
        // Clear after 3 seconds
        setTimeout(() => {
            statusMessage.textContent = "";
            statusMessage.className = "";
        }, 3000);
    }
});