// Replace this with your actual Netlify site URL after deployment
const PROXY_URL = 'https://capable-brioche-99db20.netlify.app/.netlify/functions/chat-proxy';

// Main chatbot class
class Chatbot {
  constructor() {
    this.isLoading = false;
    this.init();
  }

  // Initialize the chatbot
  init() {
    this.createChatInterface();
    this.attachEventListeners();
    this.addWelcomeMessage();
  }

  // Create the chat interface if it doesn't exist
  createChatInterface() {
    // Check if chat container already exists (in case your HTML already has it)
    let chatContainer = document.getElementById('chatbot-container');
    
    if (!chatContainer) {
      // Create the chat interface
      chatContainer = document.createElement('div');
      chatContainer.id = 'chatbot-container';
      chatContainer.innerHTML = `
        <div id="chatbot-header">
          <h3>Chat Assistant</h3>
          <button id="chatbot-toggle">−</button>
        </div>
        <div id="chatbot-messages"></div>
        <div id="chatbot-input-area">
          <input type="text" id="chatbot-input" placeholder="Type your message..." />
          <button id="chatbot-send">Send</button>
        </div>
      `;
      document.body.appendChild(chatContainer);
    }

    // Get references to elements
    this.messagesContainer = document.getElementById('chatbot-messages');
    this.inputField = document.getElementById('chatbot-input');
    this.sendButton = document.getElementById('chatbot-send');
    this.toggleButton = document.getElementById('chatbot-toggle');
  }

  // Attach event listeners
  attachEventListeners() {
    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.handleUserMessage();
    });

    // Enter key press
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isLoading) {
        this.handleUserMessage();
      }
    });

    // Toggle chat visibility
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.toggleChat();
      });
    }
  }

  // Handle user message
  async handleUserMessage() {
    const message = this.inputField.value.trim();
    
    if (!message || this.isLoading) {
      return;
    }

    // Clear input and disable while processing
    this.inputField.value = '';
    this.setLoading(true);

    // Display user message
    this.addMessage(message, 'user');

    try {
      // Send to assistant via proxy
      const response = await this.callAssistant(message);
      this.addMessage(response, 'assistant');
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant', true);
    } finally {
      this.setLoading(false);
    }
  }

  // Call the assistant through the proxy
  async callAssistant(message) {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.reply;
  }

  // Add a message to the chat
  addMessage(text, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message chatbot-message-${sender}`;
    
    if (isError) {
      messageDiv.className += ' chatbot-message-error';
    }

    messageDiv.innerHTML = `
      <div class="chatbot-message-content">
        ${this.formatMessage(text)}
      </div>
      <div class="chatbot-message-time">
        ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  // Format message text (handle line breaks, etc.)
  formatMessage(text) {
    return text.replace(/\n/g, '<br>');
  }

  // Set loading state
  setLoading(loading) {
    this.isLoading = loading;
    this.sendButton.disabled = loading;
    this.inputField.disabled = loading;
    
    if (loading) {
      this.sendButton.textContent = '...';
      this.showTypingIndicator();
    } else {
      this.sendButton.textContent = 'Send';
      this.hideTypingIndicator();
    }
  }

  // Show typing indicator
  showTypingIndicator() {
    // Remove existing typing indicator
    this.hideTypingIndicator();
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'chatbot-typing';
    typingDiv.className = 'chatbot-message chatbot-message-assistant';
    typingDiv.innerHTML = `
      <div class="chatbot-message-content">
        <div class="chatbot-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  // Hide typing indicator
  hideTypingIndicator() {
    const typingDiv = document.getElementById('chatbot-typing');
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  // Scroll to bottom of messages
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  // Toggle chat visibility
  toggleChat() {
    const container = document.getElementById('chatbot-container');
    const isMinimized = container.classList.contains('minimized');
    
    if (isMinimized) {
      container.classList.remove('minimized');
      this.toggleButton.textContent = '−';
    } else {
      container.classList.add('minimized');
      this.toggleButton.textContent = '+';
    }
  }

  // Add welcome message
  addWelcomeMessage() {
    setTimeout(() => {
      this.addMessage('Hello! How can I help you today?', 'assistant');
    }, 500);
  }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.chatbot = new Chatbot();
});

// Also initialize if page is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new Chatbot();
  });
} else {
  window.chatbot = new Chatbot();
}
