document.addEventListener("DOMContentLoaded", () => {
  const CLOUD_RUN_URL = "https://interactive-resume-874080876766.us-central1.run.app";
  const API = location.hostname === "localhost" ? "http://localhost:8080/ask" : `${CLOUD_RUN_URL}/ask`;
  const chat = document.getElementById("chat");
  const mic = document.getElementById("mic");
  const stopSpeech = document.getElementById("stop-speech");
  const chatContainer = document.getElementById("chat-container");
  const chatTrigger = document.getElementById("chat-trigger");
  const synth = speechSynthesis;

  let wasListeningBeforeSpeech = false;

  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const hideChat = document.getElementById("hide-chat");
  const chatHeader = document.querySelector(".chat-header");

  chatTrigger.addEventListener("click", () => {
    chatContainer.classList.add("active");
    if (!chat.hasChildNodes()) {
      greet();
      setTimeout(() => {
        ask("Tell me about Teja's experience");
      }, 1500);
    } else {
      ask("Tell me about Teja's experience");
    }
  });

  document.addEventListener("click", (e) => {
    if (!chatContainer.contains(e.target) && !chatTrigger.contains(e.target)) {
      chatContainer.classList.remove("active");
    }
  });

  hideChat.addEventListener("click", () => {
    chatContainer.classList.remove("active");
  });

  chatHeader.addEventListener("click", (e) => {
    if (e.target === chatHeader || e.target.tagName === "SPAN") {
      chatContainer.classList.toggle("active");
    }
  });

  stopSpeech.addEventListener("click", () => {
    if (synth.speaking) {
      synth.cancel();
      stopSpeech.classList.add("active");
      setTimeout(() => {
        stopSpeech.classList.remove("active");
      }, 300);
    }
  });

  synth.addEventListener('voiceschanged', () => {
    setupSpeechEvents();
  });

  function setupSpeechEvents() {
    if (!window.speechSynthesisInitialized) {
      window.speechSynthesisInitialized = true;

      speechSynthesis.addEventListener('start', () => {
        stopSpeech.classList.add("active");
        wasListeningBeforeSpeech = recognising;
        if (recognising) stopListen();
      });

      speechSynthesis.addEventListener('end', () => {
        stopSpeech.classList.remove("active");
        if (wasListeningBeforeSpeech) {
          startListen();
          wasListeningBeforeSpeech = false;
        }
      });

      speechSynthesis.addEventListener('error', () => {
        stopSpeech.classList.remove("active");
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
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        mode: "cors",
        body: JSON.stringify({question: q})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const r = await response.json();
      if (r.answer) {
        speak(r.answer);
      } else {
        speak("Sorry, I couldn't process that request. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching from API:", error);
      speak("Sorry, I'm having trouble connecting to my backend. Please check the console for details.");
    }
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

    utterance.onstart = () => {
      stopSpeech.classList.add("active");
      wasListeningBeforeSpeech = recognising;
      if (recognising) stopListen();
    };

    utterance.onend = () => {
      stopSpeech.classList.remove("active");
      if (wasListeningBeforeSpeech) {
        startListen();
        wasListeningBeforeSpeech = false;
      }
    };

    utterance.onerror = () => {
      stopSpeech.classList.remove("active");
      if (wasListeningBeforeSpeech) {
        startListen();
        wasListeningBeforeSpeech = false;
      }
    };

    synth.speak(utterance);
  }

  sendButton.addEventListener("click", () => {
    if (chatInput.value.trim() !== "") {
      ask(chatInput.value.trim());
      chatInput.value = "";
    }
  });

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
      ask(chatInput.value.trim());
      chatInput.value = "";
    }
  });
});
