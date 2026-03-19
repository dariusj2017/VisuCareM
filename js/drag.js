// FILE: js/drag.js

export function makeDraggable(el, onMove) {
  let dragging = false, offsetX=0, offsetY=0;

  const start = (x,y)=>{
    dragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = x - rect.left;
    offsetY = y - rect.top;
  };

  const move = (x,y)=>{
    if (!dragging) return;
    el.style.left = `${x - offsetX}px`;
    el.style.top = `${y - offsetY}px`;
    if (onMove) onMove(x - offsetX, y - offsetY);
  };

  const end = ()=>{ dragging = false; };

  el.addEventListener("mousedown", e=>start(e.clientX,e.clientY));
  window.addEventListener("mousemove", e=>move(e.clientX,e.clientY));
  window.addEventListener("mouseup", end);

  el.addEventListener("touchstart", e=>{
    const t=e.touches[0]; start(t.clientX,t.clientY);
  });
  window.addEventListener("touchmove", e=>{
    const t=e.touches[0]; move(t.clientX,t.clientY);
  });
  window.addEventListener("touchend", end);
}