const GEMINI_API_KEY_STORAGE = "GEMINI_API_KEY";
const CHAT_HISTORY_STORAGE_PREFIX = "AI_CHAT_HISTORY_";
const chatIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/chat-dots.svg";
const closeIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/x-lg.svg";
const minimizeIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/dash-lg.svg";
const maximizeIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/arrows-angle-expand.svg";
const clearIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/trash.svg";
const copyIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/clipboard.svg";
const exportIconURL = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/icons/download.svg";

// Track current problem ID to detect navigation
let currentProblemId = null;

// Get a unique identifier for the current problem
function getPageIdentifier() {
    // First, try to extract problem ID from URL patterns of common platforms
    const leetcodePattern = /leetcode\.com\/problems\/([^/]+)/;
    const hackrankPattern = /hackerrank\.com\/challenges\/([^/]+)/;
    const codeforcesPattern = /codeforces\.com\/problemset\/problem\/([^/]+)/;
    
    let problemId = null;
    
    // Extract ID based on platform
    if (leetcodePattern.test(window.location.href)) {
        problemId = window.location.href.match(leetcodePattern)[1];
    } else if (hackrankPattern.test(window.location.href)) {
        problemId = window.location.href.match(hackrankPattern)[1];
    } else if (codeforcesPattern.test(window.location.href)) {
        problemId = window.location.href.match(codeforcesPattern)[1];
    } else {
        // Backup plan: use problem title and normalized URL path
        const problemDetails = extractProblemDetails();
        const url = window.location.origin + window.location.pathname;
        problemId = problemDetails.title ? 
            (problemDetails.title.replace(/[^a-zA-Z0-9]/g, '') + '_' + btoa(url).replace(/[+/=]/g, '').substring(0, 20)) :
            btoa(url).replace(/[+/=]/g, ''); // Base64 encode and remove special chars
    }
    
    return problemId;
}

function saveChatHistory(messages) {
    const pageId = getPageIdentifier();
    const historyKey = CHAT_HISTORY_STORAGE_PREFIX + pageId;
    const problemDetails = extractProblemDetails();
    
    // Create a history object with metadata and messages
    const historyData = {
        pageUrl: window.location.href,
        problemTitle: problemDetails.title,
        lastUpdated: new Date().toISOString(),
        messages: messages
    };
    
    // Save to local storage
    localStorage.setItem(historyKey, JSON.stringify(historyData));
    
    // Log for debugging
    console.log(`Chat history saved for problem: ${problemDetails.title || pageId}`);
}

// Load chat history from local storage
function loadChatHistory() {
    const pageId = getPageIdentifier();
    const historyKey = CHAT_HISTORY_STORAGE_PREFIX + pageId;
    const historyData = localStorage.getItem(historyKey);
    
    if (historyData) {
        try {
            const parsedData = JSON.parse(historyData);
            console.log(`Loaded chat history for problem: ${parsedData.problemTitle || pageId}`);
            return parsedData;
        } catch (error) {
            console.error("Error parsing chat history:", error);
            return null;
        }
    }
    console.log(`No chat history found for problem: ${pageId}`);
    return null;
}

// Clear chat history for current page
function clearCurrentChatHistory() {
    const pageId = getPageIdentifier();
    const historyKey = CHAT_HISTORY_STORAGE_PREFIX + pageId;
    localStorage.removeItem(historyKey);
    console.log(`Cleared chat history for problem: ${pageId}`);
}
// Create and add the AI assistant button to the page
function addAIAssistantButton() {
    if (document.getElementById("ai-assistant-button")) {
        // Button already exists, check if we need to update for a new problem
        updateForNewProblem();
        return;
    }
    
    const aiButton = document.createElement('button');
    aiButton.id = "ai-assistant-button";
    aiButton.innerHTML = `<img src="${chatIconURL}" alt="AI Assistant">`;
    aiButton.title = "Ask AI about this problem";
    const targetElement = findTargetElement();
    if (targetElement) {
        targetElement.insertAdjacentElement("afterend", aiButton);
        aiButton.addEventListener("click", openAIChat);
        
        // Set the initial problem ID
        currentProblemId = getPageIdentifier();
        console.log(`Initial problem ID set to: ${currentProblemId}`);
    }
}

// Helper function to find an appropriate target element to place the button after
function findTargetElement() {
    const maangElement = document.querySelector(".coding_ask_doubt_button__FjwXJ");
    if (maangElement) return maangElement;
    const leetcodeElement = document.querySelector(".question-fast-picker-wrapper");
    if (leetcodeElement) return leetcodeElement;
    const possibleTargets = [
        document.querySelector("h1"),
        document.querySelector(".problem-statement"),
        document.querySelector(".problem-description"),
        document.querySelector(".question-content")
    ];
    return possibleTargets.find(element => element !== null);
}

// Extract problem details from the current page
function extractProblemDetails() {
    let title = "";
    let description = "";
    const possibleTitleElements = [
        document.querySelector(".Header_resource_heading__cpRp1"),
        document.querySelector(".question-title"),
        document.querySelector("h1"),
        document.querySelector(".title")
    ];
    for (const element of possibleTitleElements) {
        if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            break;
        }
    }
    const possibleDescriptionElements = [
        document.querySelector(".problem-statement"),
        document.querySelector(".question-content"),
        document.querySelector(".description")
    ];
    for (const element of possibleDescriptionElements) {
        if (element && element.textContent.trim()) {
            description = element.textContent.trim();
            break;
        }
    }
    return {
        title,
        description,
        url: window.location.href
    };
}

// Check if we've navigated to a new problem and update accordingly
function updateForNewProblem() {
    const newProblemId = getPageIdentifier();
    
    // If problem ID has changed, update the chat panel if it's open
    if (newProblemId !== currentProblemId) {
        console.log(`Problem changed from ${currentProblemId} to ${newProblemId}`);
        currentProblemId = newProblemId;
        
        // If chat panel is open, update its content
        const chatPanel = document.getElementById("ai-chat-panel");
        if (chatPanel && chatPanel.style.display !== "none") {
            updateChatPanelForNewProblem();
        }
    }
}

// Update chat panel content when navigating to a new problem
function updateChatPanelForNewProblem() {
    const messagesContainer = document.getElementById("ai-chat-messages");
    if (!messagesContainer) return;
    
    // Load history for the new problem
    const chatHistory = loadChatHistory();
    
    if (chatHistory && chatHistory.messages && chatHistory.messages.length > 0) {
        // If we have history for this problem, use it
        messagesContainer.innerHTML = chatHistory.messages;
        console.log("Loaded chat history for this problem");
    } else {
        // If no history, reset to initial state
        const problemDetails = extractProblemDetails();
        messagesContainer.innerHTML = `
            <div class="ai-message">
                Hello! I'm your AI coding assistant. Ask me about this problem.
            </div>
        `;
        
        if (problemDetails.title) {
            messagesContainer.innerHTML += `
                <div class="ai-message">
                    I see you're working on "${problemDetails.title}". How can I help you with this problem?
                </div>
            `;
        }
        
        // Save this initial state
        saveCurrentChatMessages();
    }
    
    // Scroll to the bottom to show latest messages
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add listeners for any copy buttons
    setupCopyButtonListeners();
}

// Create and open the chat interface
function openAIChat() {
    let chatPanel = document.getElementById("ai-chat-panel");
    if (chatPanel) {
        chatPanel.style.display = "flex";
        // Ensure the displayed history matches the current problem
        updateChatPanelForNewProblem();
        return;
    }
    
    chatPanel = document.createElement("div");
    chatPanel.id = "ai-chat-panel";
    
    chatPanel.innerHTML = `
        <div class="ai-chat-header">
            <h3>AI Coding Assistant</h3>
            <div class="ai-header-controls">
                <button id="ai-chat-export" title="Export as HTML"><img src="${exportIconURL}" alt="Export"></button>
                <button id="ai-chat-clear" title="Clear chat"><img src="${clearIconURL}" alt="Clear"></button>
                <button id="ai-chat-minimize" title="Minimize"><img src="${minimizeIconURL}" alt="Minimize"></button>
                <button id="ai-chat-close" title="Close"><img src="${closeIconURL}" alt="Close"></button>
            </div>
        </div>
        <div class="ai-chat-messages" id="ai-chat-messages">
            <div class="ai-message">
                Hello! I'm your AI coding assistant. Ask me about this problem.
            </div>
        </div>
        <div class="ai-chat-input">
            <textarea id="ai-chat-input-text" placeholder="Ask a question about this problem..."></textarea>
            <button id="ai-chat-send">Send</button>
        </div>
    `;
    
    document.body.appendChild(chatPanel);
    setupDraggable(chatPanel);
    
    document.getElementById("ai-chat-close").addEventListener("click", () => {
        chatPanel.style.display = "none";
    });
    
    document.getElementById("ai-chat-minimize").addEventListener("click", () => {
        chatPanel.classList.toggle("minimized");
        const minimizeButton = document.getElementById("ai-chat-minimize");
        if (chatPanel.classList.contains("minimized")) {
            minimizeButton.innerHTML = `<img src="${maximizeIconURL}" alt="Maximize">`;
            minimizeButton.title = "Maximize";
        } else {
            minimizeButton.innerHTML = `<img src="${minimizeIconURL}" alt="Minimize">`;
            minimizeButton.title = "Minimize";
        }
    });
    
    document.getElementById("ai-chat-clear").addEventListener("click", () => {
        if (confirm("Clear chat history for this problem?")) {
            clearCurrentChatHistory();
            
            const messagesContainer = document.getElementById("ai-chat-messages");
            messagesContainer.innerHTML = `
                <div class="ai-message">
                    Hello! I'm your AI coding assistant. Ask me about this problem.
                </div>
            `;
            
            // Add problem information message
            const problemDetails = extractProblemDetails();
            if (problemDetails.title) {
                messagesContainer.innerHTML += `
                    <div class="ai-message">
                        I see you're working on "${problemDetails.title}". How can I help you with this problem?
                    </div>
                `;
            }
            
            // Save this initial state
            saveCurrentChatMessages();
        }
    });
    
    document.getElementById("ai-chat-export").addEventListener("click", exportConversation);
    document.getElementById("ai-chat-send").addEventListener("click", sendMessage);
    document.getElementById("ai-chat-input-text").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.querySelector('.ai-chat-header').addEventListener('dblclick', () => {
        document.getElementById("ai-chat-minimize").click();
    });
    
    // Load history for current problem immediately when opening the chat
    updateChatPanelForNewProblem();
}

// Save the current chat messages 
function saveCurrentChatMessages() {
    const messagesContainer = document.getElementById("ai-chat-messages");
    if (messagesContainer) {
        // Get the HTML content of the messages container
        const messagesHTML = messagesContainer.innerHTML;
        saveChatHistory(messagesHTML);
    }
}

// Setup listeners for copy buttons in AI messages
function setupCopyButtonListeners() {
    // First, remove any existing listener attributes to prevent duplicates
    document.querySelectorAll('.message-copy-btn, .code-copy-btn').forEach(button => {
        button.removeAttribute('data-listener-attached');
    });

    // Add listeners for message copy buttons
    const messageCopyButtons = document.querySelectorAll('.message-copy-btn');
    messageCopyButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-attached')) {
            button.addEventListener('click', handleMessageCopy);
            button.setAttribute('data-listener-attached', 'true');
        }
    });
    
    // Add listeners for code copy buttons
    const codeCopyButtons = document.querySelectorAll('.code-copy-btn');
    codeCopyButtons.forEach(button => {
        if (!button.hasAttribute('data-listener-attached')) {
            button.addEventListener('click', handleCodeCopy);
            button.setAttribute('data-listener-attached', 'true');
        }
    });
}



// Handle code copy button click
function handleCodeCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the code element
    const codeElement = this.parentElement.querySelector('code');
    
    // Get the raw text content, preserving line breaks
    const rawCode = codeElement.textContent
        .replace(/</g, '<')    // Replace HTML entity for <
        .replace(/>/g, '>')    // Replace HTML entity for >
        .replace(/&amp;/g, '&')   // Replace HTML entity for &
        .trim();
    
    // Copy to clipboard preserving line breaks and proper formatting
    navigator.clipboard.writeText(rawCode).then(() => {
        this.innerHTML = 'Copied!';
        setTimeout(() => {
            this.innerHTML = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
        this.innerHTML = 'Error!';
        setTimeout(() => {
            this.innerHTML = 'Copy';
        }, 2000);
    });
}

// Function to copy text to clipboard
function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCopyStatus("Text copied to clipboard!");
    }).catch(err => {
        showCopyStatus("Failed to copy: " + err, true);
    });
}

// Function to export the conversation as an HTML file
function exportConversation() {
    const messagesContainer = document.getElementById("ai-chat-messages");
    const problemDetails = extractProblemDetails();
    
    // Create HTML content
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Coding Assistant - ${problemDetails.title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
            }
            h1 {
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .problem-link {
                margin-bottom: 20px;
                word-break: break-all;
            }
            .message {
                padding: 10px 15px;
                border-radius: 8px;
                margin-bottom: 15px;
                max-width: 80%;
            }
            .ai-message {
                background-color: #f1f3f4;
                align-self: flex-start;
                margin-right: auto;
            }
            .user-message {
                background-color: #e3f2fd;
                align-self: flex-end;
                margin-left: auto;
            }
            pre {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
            }
            code {
                font-family: monospace;
                white-space: pre;
            }
            .container {
                display: flex;
                flex-direction: column;
            }
            .timestamp {
                font-size: 0.8em;
                color: #777;
                margin-top: 5px;
            }
        </style>
    </head>
    <body>
        <h1>AI Coding Assistant - ${problemDetails.title}</h1>
        <div class="problem-link">
            <a href="${problemDetails.url}" target="_blank">${problemDetails.url}</a>
        </div>
        <div class="container">
    `;
    
    // Get all messages
    const messages = messagesContainer.querySelectorAll('.ai-message, .user-message');
    const date = new Date();
    
    messages.forEach(message => {
        // Skip error, typing, and note messages
        if (message.classList.contains('error') || 
            message.classList.contains('typing') || 
            message.classList.contains('note')) return;
        
        const isAI = message.classList.contains('ai-message');
        const className = isAI ? 'ai-message' : 'user-message';
        const sender = isAI ? 'AI' : 'You';
        
        // Clone the message and remove the copy button
        const messageClone = message.cloneNode(true);
        const copyButton = messageClone.querySelector('.message-copy-btn');
        if (copyButton) {
            copyButton.remove();
        }
        
        htmlContent += `
            <div class="message ${className}">
                <strong>${sender}:</strong>
                <div>${messageClone.innerHTML}</div>
            </div>
        `;
    });
    
    // Add footer with timestamp
    htmlContent += `
        </div>
        <div class="timestamp">
            Exported on ${date.toLocaleString()}
        </div>
    </body>
    </html>`;
    
    // Create a blob and download link
    const blob = new Blob([htmlContent], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-coding-${problemDetails.title.replace(/[^a-zA-Z0-9]/g, '-')}-${date.getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showCopyStatus("Conversation exported successfully!");
}

// Show a temporary status message
function showCopyStatus(message, isError = false) {
    const statusElement = document.createElement('div');
    statusElement.className = 'copy-status';
    statusElement.textContent = message;
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '80px';
    statusElement.style.right = '20px';
    statusElement.style.zIndex = '10001';
    
    if (isError) {
        statusElement.style.backgroundColor = '#F44336';
    }
    
    document.body.appendChild(statusElement);
    
    // Remove the status message after 2 seconds
    setTimeout(() => {
        if (document.body.contains(statusElement)) {
            document.body.removeChild(statusElement);
        }
    }, 2000);
}

// Setup draggable functionality for the chat panel
function setupDraggable(chatPanel) {
    const chatHeader = chatPanel.querySelector('.ai-chat-header');
    let isDragging = false;
    let offsetX, offsetY;
    chatHeader.style.cursor = 'move';
    chatHeader.addEventListener('mousedown', function(e) {
        if (e.target.closest('button')) return;
        isDragging = true;
        chatPanel.style.transition = 'none';
        const rect = chatPanel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        const maxX = window.innerWidth - chatPanel.offsetWidth;
        const maxY = window.innerHeight - chatPanel.offsetHeight;
        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));
        chatPanel.style.position = 'fixed';
        chatPanel.style.left = boundedX + 'px';
        chatPanel.style.top = boundedY + 'px';
        chatPanel.style.right = 'auto';
        chatPanel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            chatPanel.style.transition = '';
        }
    });
}

// Function to send a message to the AI and display the response
async function sendMessage() {
    const inputElement = document.getElementById("ai-chat-input-text");
    const message = inputElement.value.trim();
    if (!message) return;
    inputElement.value = "";
    const messagesContainer = document.getElementById("ai-chat-messages");
    
    // Add user message to chat
    messagesContainer.innerHTML += `
        <div class="user-message">
            ${escapeHTML(message)}
        </div>
    `;
    
    // Save chat state after adding user message
    saveCurrentChatMessages();
    
    // Scroll to bottom to show new message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "ai-message typing";
    typingIndicator.innerHTML = "Thinking...";
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Get the API key from the background script using message passing
    chrome.runtime.sendMessage({ action: "getApiKey" }, async (response) => {
        if (chrome.runtime.lastError) {
            typingIndicator.innerHTML = `Error: ${chrome.runtime.lastError.message || "Unable to communicate with the extension. Please check your connection."}`;
            typingIndicator.className = "ai-message error";
            saveCurrentChatMessages();
            return;
        }
        
        const apiKey = response.apiKey; // Retrieve the API key from the background script
        if (!apiKey) {
            typingIndicator.innerHTML = "Please set your Gemini API key in the extension popup.";
            typingIndicator.className = "ai-message error";
            saveCurrentChatMessages();
            return;
        }

        const problemDetails = extractProblemDetails();
        const prompt = `
            Context: I'm looking at a coding problem with the title "${problemDetails.title}".
            URL: ${problemDetails.url}
            Description (if available): ${problemDetails.description.substring(0, 1000)}...
            Question: ${message}
            Please provide a clear, concise answer focused on helping me understand and solve this specific coding problem.
        `;

        try {
            const response = await fetchGeminiResponse(apiKey, prompt);
            typingIndicator.remove(); // Remove typing indicator after response is received
            
            // Create AI response message
            const aiMessageElement = document.createElement('div');
            aiMessageElement.className = "ai-message";
            
            // Format the markdown response with code handling
            aiMessageElement.innerHTML = formatMarkdown(response);
            
            // Add copy button to the AI message (only if not an error or typing message)
            if (!aiMessageElement.classList.contains('error') && !aiMessageElement.classList.contains('typing')) {
                const messageCopyButton = document.createElement('button');
                messageCopyButton.className = 'message-copy-btn';
                messageCopyButton.textContent = 'Copy';
                messageCopyButton.addEventListener('click', handleMessageCopy);
                messageCopyButton.setAttribute('data-listener-attached', 'true');
                aiMessageElement.appendChild(messageCopyButton);
            }
            
            // Add copy buttons for code blocks
            const codeBlocks = aiMessageElement.querySelectorAll('pre');
            codeBlocks.forEach(block => {
                if (!block.querySelector('.code-copy-btn')) {
                    const codeCopyButton = document.createElement('button');
                    codeCopyButton.className = 'code-copy-btn';
                    codeCopyButton.innerHTML = 'Copy';
                    codeCopyButton.setAttribute('data-listener-attached', 'true');
                    
                    block.style.position = 'relative';
                    block.style.paddingTop = '30px';
                    
                    codeCopyButton.addEventListener('click', handleCodeCopy);
                    
                    block.appendChild(codeCopyButton);
                }
            });
            
            messagesContainer.appendChild(aiMessageElement);
            
            // Save chat after AI response
            saveCurrentChatMessages();
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            typingIndicator.innerHTML = `Error: ${error.message || "Failed to get response from Gemini API"}`;
            typingIndicator.className = "ai-message error";
            saveCurrentChatMessages();
        }
    });
}

// Function to fetch response from Gemini API
async function fetchGeminiResponse(apiKey, prompt) {
    // Determine if this is a code request without explanation request
    const isCodeOnlyRequest = isRequestingCodeOnly(prompt);
    
    // Updated to use the correct API endpoint and model
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    
    // Modify the prompt based on whether it's a code-only request
    let enhancedPrompt = prompt;
    
    if (isCodeOnlyRequest) {
        enhancedPrompt = `
            ${prompt}
            
            Please provide ONLY the code solution with no explanation. Return just the complete, working code in a code block. Do not include any commentary, explanation, or analysis before or after the code block.
        `;
    } else if (prompt.includes('```') && isCodeCorrectionPrompt(prompt)) {
        enhancedPrompt = `
            ${prompt}
            
            As a coding assistant, please:
            1. Analyze the code for bugs, inefficiencies, and style issues
            2. Provide a clear explanation of any problems found
            3. Offer a complete corrected version of the code, not just snippets
            4. Explain the changes you made and why they improve the code
            
            Format your response with:
            - Analysis section explaining issues
            - Complete corrected code in a code block
            - Explanation of improvements
        `;
    }
    
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: enhancedPrompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
        }
    };
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || "Failed to get response");
        }
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No response generated");
        }
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("API fetch error:", error);
        throw error;
    }
}

// Helper function to determine if the user is requesting code only without explanation
function isRequestingCodeOnly(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for phrases that indicate code-only requests
    const codeOnlyIndicators = [
        'give me code',
        'provide code',
        'write code',
        'code for',
        'code to solve',
        'give code',
        'code solution',
        'show me code',
        'implement',
        'code only',
        'just the code',
        'code without explanation'
    ];
    
    // Check for phrases that indicate explanation is wanted
    const explanationIndicators = [
        'explain',
        'explanation',
        'why',
        'how',
        'understand',
        'describe',
        'clarify',
        'detailed',
        'step by step',
        'walk through',
        'break down'
    ];
    
    // If the prompt contains a code-only indicator and doesn't contain an explanation indicator,
    // we assume the user wants code only
    const hasCodeOnlyIndicator = codeOnlyIndicators.some(indicator => lowerPrompt.includes(indicator));
    const hasExplanationIndicator = explanationIndicators.some(indicator => lowerPrompt.includes(indicator));
    
    return hasCodeOnlyIndicator && !hasExplanationIndicator;
}

// Helper function to escape HTML
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to format markdown with improved code block handling
function formatMarkdown(text) {
    // Handle code blocks with language specification (```python, ```javascript, etc.)
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        // Preserve indentation and line breaks
        return `<pre><code class="language-${lang}">${escapeHTML(code.trim())}</code></pre>`;
    });
    
    // Handle code blocks without language specification
    text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHTML(code.trim())}</code></pre>`;
    });
    
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle other markdown elements
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Function to list all saved chat histories
function listSavedChatHistories() {
    const histories = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(CHAT_HISTORY_STORAGE_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                histories.push({
                    key: key,
                    problemId: key.replace(CHAT_HISTORY_STORAGE_PREFIX, ''),
                    title: data.problemTitle || 'Unknown Problem',
                    url: data.pageUrl || '',
                    lastUpdated: data.lastUpdated || '',
                    messageCount: countMessages(data.messages)
                });
            } catch (e) {
                console.error("Error parsing history:", e);
            }
        }
    }
    return histories;
}
// Count the actual messages in the HTML (excluding system messages)
function countMessages(messagesHTML) {
    if (!messagesHTML) return 0;
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messagesHTML;
    
    // Count only user and regular AI messages, not system messages
    const userMessages = tempDiv.querySelectorAll('.user-message').length;
    const aiMessages = Array.from(tempDiv.querySelectorAll('.ai-message')).filter(
        msg => !msg.classList.contains('typing') && 
        !msg.classList.contains('error') &&
        !msg.classList.contains('note')
    ).length;
    
    return userMessages + aiMessages;
}

// Function to add History Manager to the popup
function addHistoryManagerToChromeAction() {
    // This is typically handled in the popup.js file, but the function is here for reference
    // and can be called from the popup script
    const histories = listSavedChatHistories();
    console.log(`Found ${histories.length} saved chat histories`);
    return histories;
}

// Set up a mutation observer to watch for DOM changes
const observer = new MutationObserver(() => {
    addAIAssistantButton();
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Function to extract code from common code editors
function extractCodeFromEditor() {
    // Target common code editor elements across various platforms
    const possibleEditors = [
        // Monaco editor (used by LeetCode, many others)
        document.querySelector('.monaco-editor'),
        // CodeMirror (used by many platforms)
        document.querySelector('.CodeMirror'),
        // Ace editor
        document.querySelector('.ace_editor'),
        // Direct code elements
        document.querySelector('pre.code-block'),
        document.querySelector('.code-container'),
        // LeetCode specific
        document.querySelector('.react-codemirror2'),
        document.querySelector('.CodeMirror-code'),
        // HackerRank specific
        document.querySelector('#code-editor'),
        document.querySelector('.inputarea'),
        // Codeforces specific
        document.querySelector('.source')
    ];
    
    for (const editor of possibleEditors) {
        if (editor) {
            // Try different methods to extract code
            
            // Method 1: Get text from Monaco editor
            const monacoLines = editor.querySelectorAll('.view-line');
            if (monacoLines.length > 0) {
                let code = '';
                monacoLines.forEach(line => {
                    code += line.textContent + '\n';
                });
                return code.trim();
            }
            
            // Method 2: Get text from CodeMirror
            const cmLines = editor.querySelectorAll('.CodeMirror-line');
            if (cmLines.length > 0) {
                let code = '';
                cmLines.forEach(line => {
                    code += line.textContent + '\n';
                });
                return code.trim();
            }
            
            // Method 3: For Ace editor
            const aceLines = editor.querySelectorAll('.ace_line');
            if (aceLines.length > 0) {
                let code = '';
                aceLines.forEach(line => {
                    code += line.textContent + '\n';
                });
                return code.trim();
            }
            
            // Method 4: Direct content
            if (editor.textContent) {
                return editor.textContent.trim();
            }
        }
    }
    
    // Fallback: Look for textarea or other input elements
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
        if (textarea.value && (
            textarea.id.toLowerCase().includes('code') || 
            textarea.className.toLowerCase().includes('code') ||
            textarea.placeholder.toLowerCase().includes('code')
        )) {
            return textarea.value.trim();
        }
    }
    
    // If all methods fail
    return null;
}

// Detect programming language based on code content and page context
function detectProgrammingLanguage() {
    // First try to get language from UI elements
    const languageIndicators = [
        document.querySelector('.language-select'),
        document.querySelector('.language-picker'),
        document.querySelector('.lang-select'),
        document.querySelector('[data-cy="lang-select"]'),
        document.querySelector('.select-language')
    ];
    
    for (const indicator of languageIndicators) {
        if (indicator && indicator.textContent) {
            const text = indicator.textContent.toLowerCase();
            if (text.includes('python')) return 'python';
            if (text.includes('java') && !text.includes('javascript')) return 'java';
            if (text.includes('c++')) return 'cpp';
            if (text.includes('javascript') || text.includes('js')) return 'javascript';
            if (text.includes('ruby')) return 'ruby';
            if (text.includes('go')) return 'go';
            // Add more languages as needed
        }
    }
    
    // Try to detect from URL
    const url = window.location.href.toLowerCase();
    if (url.includes('python')) return 'python';
    if (url.includes('java') && !url.includes('javascript')) return 'java';
    if (url.includes('cpp') || url.includes('c++')) return 'cpp';
    if (url.includes('javascript') || url.includes('js')) return 'javascript';
    
    // Fallback to detecting from code itself
    const code = extractCodeFromEditor();
    if (!code) return null;
    
    // Simple pattern matching
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('public class ') || code.includes('private class ')) return 'java';
    if (code.includes('console.log') || code.includes('function ')) return 'javascript';
    if (code.includes('#include') && (code.includes('cout') || code.includes('std::'))) return 'cpp';
    
    // Default if we can't detect
    return 'unknown';
}

// Save current code to localStorage
function saveCurrentCode() {
    const code = extractCodeFromEditor();
    if (code) {
        const language = detectProgrammingLanguage();
        const codeData = {
            code: code,
            language: language,
            timestamp: new Date().toISOString(),
            problemId: getPageIdentifier()
        };
        localStorage.setItem('CURRENT_CODE', JSON.stringify(codeData));
        return codeData;
    }
    return null;
}

// Load the most recent code from localStorage
function loadSavedCode() {
    const savedCodeData = localStorage.getItem('CURRENT_CODE');
    if (savedCodeData) {
        try {
            const codeData = JSON.parse(savedCodeData);
            // Check if it's from the current problem
            if (codeData.problemId === getPageIdentifier()) {
                return codeData;
            }
        } catch (err) {
            console.error("Error parsing saved code:", err);
        }
    }
    // If no saved code or not for current problem, try to get fresh code
    return saveCurrentCode();
}

// Modify the existing sendMessage function to automatically include code when needed
const originalSendMessage = sendMessage;
sendMessage = async function() {
    const inputElement = document.getElementById("ai-chat-input-text");
    const message = inputElement.value.trim();
    
    // Key phrases that indicate the user wants code correction
    const codeRequestKeywords = [
        'fix', 'correct', 'debug', 'improve', 'optimize', 'refactor', 'solve',
        'what\'s wrong', 'error', 'not working', 'doesn\'t work', 'issue',
        'check my code', 'review', 'analyze', 'help with code', 'wrong output'
    ];
    
    // Check if this is a code correction request
    const isCodeRequest = codeRequestKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
    );
    
    // If it's a code request but no code is included, try to fetch it
    if (isCodeRequest && !message.includes('```')) {
        // First try to get live code from editor
        let codeData = saveCurrentCode();
        
        // If that fails, try to get saved code
        if (!codeData) {
            codeData = loadSavedCode();
        }
        
        if (codeData && codeData.code) {
            inputElement.value = message + "\n\nHere's my current code:\n```" + codeData.language + "\n" + codeData.code + "\n```";
        }
    }
    
    // Call the original sendMessage function
    originalSendMessage();
};

// Create an interval to periodically save the current code
function startCodeTracking() {
    // Save code on page load
    saveCurrentCode();
    
    // Save code every 30 seconds
    setInterval(() => {
        saveCurrentCode();
    }, 30000);
    
    // Save code on keypress in common code editors
    document.addEventListener('keyup', (e) => {
        // Check if the key was pressed inside a code editor
        const isInEditor = e.target.closest('.monaco-editor') || 
                          e.target.closest('.CodeMirror') || 
                          e.target.closest('.ace_editor') ||
                          e.target.nodeName === 'TEXTAREA';
        
        if (isInEditor) {
            // Don't save on every keystroke, use a debounce
            clearTimeout(window.codeSaveTimeout);
            window.codeSaveTimeout = setTimeout(saveCurrentCode, 1000);
        }
    });
}

// Enhance the AI response handling to highlight code corrections
const originalFetchGeminiResponse = fetchGeminiResponse;
fetchGeminiResponse = async function(apiKey, prompt) {
    // Enhance the prompt for code correction
    let enhancedPrompt = prompt;
    
    if (prompt.includes('```') && isCodeCorrectionPrompt(prompt)) {
        enhancedPrompt = `
            ${prompt}
            
            As a coding assistant, please:
            1. Analyze the code for bugs, inefficiencies, and style issues
            2. Provide a clear explanation of any problems found
            3. Offer a complete corrected version of the code, not just snippets
            4. Explain the changes you made and why they improve the code
            
            Format your response with:
            - Analysis section explaining issues
            - Complete corrected code in a code block
            - Explanation of improvements
        `;
    }
    
    // Call original function with enhanced prompt
    return originalFetchGeminiResponse(apiKey, enhancedPrompt);
};

// Helper function to check if a prompt is asking for code correction
function isCodeCorrectionPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const correctionTerms = [
        'fix', 'correct', 'debug', 'improve', 'optimize', 'refactor',
        'what\'s wrong', 'error', 'not working', 'doesn\'t work'
    ];
    
    return correctionTerms.some(term => lowerPrompt.includes(term));
}

// Initialize code tracking when the page loads
startCodeTracking();

// Try to add the button immediately
addAIAssistantButton();