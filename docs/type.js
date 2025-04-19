export function typeText(el, str, speed = 40) {
    el.textContent = "";
    [...str].forEach((ch, i) => setTimeout(() => el.textContent += ch, i*speed));
  }
  