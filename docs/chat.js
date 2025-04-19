const API = location.hostname === "localhost" ? "http://localhost:8787/ask" : "/ask";
const chat = document.getElementById("chat");
const mic  = document.getElementById("mic");
const synth = speechSynthesis;

greet();   // one‑time greeting

let recognising = false, recog;
mic.onclick = () => recognising ? stopListen() : startListen();

function startListen() {
  recog = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recog.lang = "en-US";
  recog.onresult = e => ask(e.results[0][0].transcript);
  recog.onend = () => recognising && recog.start();
  recog.start(); recognising = true; mic.textContent="⏸️";
}
function stopListen(){ recognising=false; recog.stop(); mic.textContent="🎤"; }

async function ask(q) {
  addBubble(q,"user");
  const r = await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q})}).then(r=>r.json());
  speak(r.answer);
}

function addBubble(text, cls){
  const b = document.getElementById("bubble").content.cloneNode(true);
  b.firstElementChild.textContent=text;
  b.firstElementChild.classList.add(cls);
  chat.append(b); chat.scrollTop=chat.scrollHeight;
}

function greet(){
  const msg = "Hi! I'm Teja's interactive portfolio. Ask me anything about his work.";
  addBubble(msg,"bot"); synth.speak(new SpeechSynthesisUtterance(msg));
}

function speak(t){ addBubble(t,"bot"); synth.speak(new SpeechSynthesisUtterance(t)); }
