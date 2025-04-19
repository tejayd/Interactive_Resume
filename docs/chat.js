const API = location.hostname === "localhost" ? "http://localhost:8787/ask" : "/ask";
const chat = document.getElementById("chat");
const mic = document.getElementById("mic");
const stopSpeech = document.getElementById("stop-speech");
const chatContainer = document.getElementById("chat-container");
const chatTrigger = document.getElementById("chat-trigger");
const synth = speechSynthesis;

// Track the microphone state before speech started
let wasListeningBeforeSpeech = false;

// Get references to new elements
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const hideChat = document.getElementById("hide-chat");
const chatHeader = document.querySelector(".chat-header");

// Initialize chat and handle chat trigger
chatTrigger.addEventListener("click", () => {
  chatContainer.classList.add("active");
  if (!chat.hasChildNodes()) {
    greet(); // Initial greeting only if chat is empty
    
    // After a short delay to allow greeting to finish, automatically ask about experience
    setTimeout(() => {
      ask("Tell me about Teja's experience");
    }, 1500);
  } else {
    // If chat is already active, just ask about experience
    ask("Tell me about Teja's experience");
  }
});

// Click outside chat container to close
document.addEventListener("click", (e) => {
  if (!chatContainer.contains(e.target) && !chatTrigger.contains(e.target)) {
    chatContainer.classList.remove("active");
  }
});

// Handle hide chat button click
hideChat.addEventListener("click", () => {
  chatContainer.classList.remove("active");
});

// Make chat header toggle chat visibility when clicked
chatHeader.addEventListener("click", (e) => {
  // Only toggle if the click was directly on the header or its span element
  // and not on the hide button (to avoid conflicts with the hide button)
  if (e.target === chatHeader || e.target.tagName === "SPAN") {
    chatContainer.classList.toggle("active");
  }
});

// Stop speech synthesis when stop button is clicked
stopSpeech.addEventListener("click", () => {
  if (synth.speaking) {
    synth.cancel();
    stopSpeech.classList.add("active");
    // Reset button color after a brief delay to give visual feedback
    setTimeout(() => {
      stopSpeech.classList.remove("active");
    }, 300);
  }
});

// Add speech start and end event listeners to manage button state
synth.addEventListener('voiceschanged', () => {
  // Initialize speech synthesis events
  setupSpeechEvents();
});

function setupSpeechEvents() {
  // This function sets up event listeners for speech synthesis
  if (!window.speechSynthesisInitialized) {
    window.speechSynthesisInitialized = true;
    
    // Make button red when speaking starts and disable microphone if it's active
    speechSynthesis.addEventListener('start', () => {
      stopSpeech.classList.add("active");
      
      // Store current listening state and disable microphone if active
      wasListeningBeforeSpeech = recognising;
      if (recognising) {
        stopListen();
      }
    });
    
    // Return to green when speaking ends and restore microphone if it was active
    speechSynthesis.addEventListener('end', () => {
      stopSpeech.classList.remove("active");
      
      // Restore microphone state if it was active before speech started
      if (wasListeningBeforeSpeech) {
        startListen();
        wasListeningBeforeSpeech = false;
      }
    });
    
    // Also handle speech errors
    speechSynthesis.addEventListener('error', () => {
      stopSpeech.classList.remove("active");
      
      // Restore microphone state if it was active before speech started
      if (wasListeningBeforeSpeech) {
        startListen();
        wasListeningBeforeSpeech = false;
      }
    });
  }
}

let recognising = false, recog;
mic.onclick = () => recognising ? stopListen() : startListen();

function startListen() {
  recog = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recog.lang = "en-US";
  recog.onresult = e => ask(e.results[0][0].transcript);
  recog.onend = () => recognising && recog.start();
  recog.start(); 
  recognising = true; 
  mic.textContent = "⏸️";
}

function stopListen() { 
  recognising = false; 
  recog.stop(); 
  mic.textContent = "🎤"; 
}

async function ask(q) {
  addBubble(q, "user");
  const r = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({question: q})
  }).then(r => r.json());
  speak(r.answer);
}

function addBubble(text, cls) {
  const b = document.getElementById("bubble").content.cloneNode(true);
  b.firstElementChild.textContent = text;
  b.firstElementChild.classList.add(cls);
  chat.append(b);
  chat.scrollTop = chat.scrollHeight;
}

function greet() {
  const msg = "Hi! I'm Teja's interactive portfolio. Ask me anything about his work.";
  addBubble(msg, "bot");
  synth.speak(new SpeechSynthesisUtterance(msg));
}

function speak(t) {
  addBubble(t, "bot");
  const utterance = new SpeechSynthesisUtterance(t);
  
  // Set event handlers for this specific utterance
  utterance.onstart = () => {
    stopSpeech.classList.add("active");
    
    // Store current listening state and disable microphone if active
    wasListeningBeforeSpeech = recognising;
    if (recognising) {
      stopListen();
    }
  };
  
  utterance.onend = () => {
    stopSpeech.classList.remove("active");
    
    // Restore microphone state if it was active before speech started
    if (wasListeningBeforeSpeech) {
      startListen();
      wasListeningBeforeSpeech = false;
    }
  };
  
  utterance.onerror = () => {
    stopSpeech.classList.remove("active");
    
    // Restore microphone state if it was active before speech started
    if (wasListeningBeforeSpeech) {
      startListen();
      wasListeningBeforeSpeech = false;
    }
  };
  
  synth.speak(utterance);
}

// Handle sending messages from the text input
sendButton.addEventListener("click", () => {
  if (chatInput.value.trim() !== "") {
    ask(chatInput.value.trim());
    chatInput.value = "";
  }
});

// Also allow pressing Enter to send messages
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    ask(chatInput.value.trim());
    chatInput.value = "";
  }
});
