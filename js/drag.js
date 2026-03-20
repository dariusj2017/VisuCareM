// FILE: js/drag.js
// Paskirtis: bendras drag & drop mechanizmas rankiniam taškų patikslinimui

export function makeDraggable(el, onMove) {
  let dragging = false;
  let offsetX = 0, offsetY = 0;

  // Pradžia – pelė arba touch
  const start = (x, y) => {
    dragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = x - rect.left;
    offsetY = y - rect.top;
  };

  // Judėjimas – atnaujinam poziciją ir kviečiam callback
  const move = (x, y) => {
    if (!dragging) return;
    const left = x - offsetX;
    const top = y - offsetY;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    if (onMove) onMove(left, top);
  };

  const end = () => { dragging = false; };

  // Mouse events
  el.addEventListener("mousedown", e => start(e.clientX, e.clientY));
  window.addEventListener("mousemove", e => move(e.clientX, e.clientY));
  window.addEventListener("mouseup", end);

  // Touch events
  el.addEventListener("touchstart", e => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  });
  window.addEventListener("touchmove", e => {
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  });
  window.addEventListener("touchend", end);
}