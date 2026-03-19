const overlayCanvas = document.getElementById("overlayCanvas");
const overlayCtx = overlayCanvas.getContext("2d");

function drawOverlay() {
  if (!State.image) return;

  overlayCanvas.width = State.image.width;
  overlayCanvas.height = State.image.height;

  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  // Markerio taškai (jei yra)
  const m = State.points;
  if (m.markerTopLeft && m.markerTopRight) {
    drawCircle(overlayCtx, m.markerTopLeft.x, m.markerTopLeft.y, 6, "orange");
    drawCircle(overlayCtx, m.markerTopRight.x, m.markerTopRight.y, 6, "orange");
    drawLine(overlayCtx, m.markerTopLeft, m.markerTopRight, "orange");
  }

  // Vyzdžiai
  if (m.eyeLeft && m.eyeRight) {
    drawCircle(overlayCtx, m.eyeLeft.x, m.eyeLeft.y, 5, "cyan");
    drawCircle(overlayCtx, m.eyeRight.x, m.eyeRight.y, 5, "cyan");

    // PD linija
    drawLine(overlayCtx, m.eyeLeft, m.eyeRight, "white");

    // 5 mm žiedai
    const r5 = compute5mmRingRadius();
    if (r5) {
      drawCircle(overlayCtx, m.eyeLeft.x, m.eyeLeft.y, r5, "yellow");
      drawCircle(overlayCtx, m.eyeRight.x, m.eyeRight.y, r5, "yellow");
    }

    // Lesion 70 mm
    const lesionR = computeLesionRadius(70);
    if (lesionR) {
      drawCircle(overlayCtx, m.eyeLeft.x, m.eyeLeft.y, lesionR, "green");
      drawCircle(overlayCtx, m.eyeRight.x, m.eyeRight.y, lesionR, "green");
    }
  }
}

// Drag & drop taškų redagavimas
overlayCanvas.addEventListener("mousedown", onPointerDown);
overlayCanvas.addEventListener("mousemove", onPointerMove);
overlayCanvas.addEventListener("mouseup", onPointerUp);
overlayCanvas.addEventListener("mouseleave", onPointerUp);

function onPointerDown(e) {
  if (!State.editMode) return;

  const rect = overlayCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const pts = State.points;
  const candidates = [
    "markerTopLeft",
    "markerTopRight",
    "markerBottomLeft",
    "markerBottomRight",
    "eyeLeft",
    "eyeRight"
  ];

  for (const key of candidates) {
    const p = pts[key];
    if (p && pointHitTest(p, x, y)) {
      State.dragPoint = key;
      break;
    }
  }
}

function onPointerMove(e) {
  if (!State.editMode || !State.dragPoint) return;

  const rect = overlayCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  State.points[State.dragPoint] = { x, y };
  drawOverlay();
  updateMeasurementsPanel();
}

function onPointerUp() {
  State.dragPoint = null;
}

// UI mygtukai
document.getElementById("autoDetect").onclick = async () => {
  await detectIris();
  // Čia vėliau pridėsi markerio aptikimą
  drawOverlay();
};

document.getElementById("editPoints").onclick = () => {
  State.editMode = !State.editMode;
  alert(State.editMode ? "Taškų taisymo režimas įjungtas" : "Taškų taisymo režimas išjungtas");
};

document.getElementById("showMeasurements").onclick = () => {
  calibrate();
  updateMeasurementsPanel();
  document.getElementById("measurePanel").classList.remove("hidden");
};