// FILE: js/app.js
// Tik iPad 11" 2025, landscape, be zoom, su fullscreen media, gulščiuku, flip/rotate, meniu

import {
  frontData,
  initFrontAI,
  detectFrontMarkerFromImageData,
  onFrontResult
} from "./ai-front.js";

import {
  sideData,
  initSideAI,
  detectSideMarkersFromImageData,
  onSideResult
} from "./ai-side.js";

import { makeDraggable } from "./drag.js";

// --- EKRANAI ---

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(name + "-screen").classList.add("active");
}

// FRONT
const videoFront = document.getElementById("video-front");
const canvasFront = document.getElementById("canvas-front");
const ctxFront = canvasFront.getContext("2d");

// SIDE
const videoSide = document.getElementById("video-side");
const canvasSide = document.getElementById("canvas-side");
const ctxSide = canvasSide.getContext("2d");

// CHECK / RESULTS
let lastFrontResult = null;
let lastSideResult = null;

onFrontResult((res) => {
  lastFrontResult = res;
  updateCheckPanel();
});

onSideResult((res) => {
  lastSideResult = res;
  updateCheckPanel();
});

// --- FRONT FREEZE / SHUTTER ---

const frontFreezeBtn = document.getElementById("front-freeze");

frontFreezeBtn.onclick = () => {
  canvasFront.width = videoFront.videoWidth || 2360;
  canvasFront.height = videoFront.videoHeight || 1640;

  ctxFront.drawImage(videoFront, 0, 0, canvasFront.width, canvasFront.height);
  const imgData = ctxFront.getImageData(0, 0, canvasFront.width, canvasFront.height);

  detectFrontMarkerFromImageData(imgData);

  document.getElementById("check-front-img").src = canvasFront.toDataURL("image/jpeg");

  showScreen("side");
  initSideAI(videoSide, canvasSide);
};

document.getElementById("front-shutter-left").onclick =
document.getElementById("front-shutter-right").onclick =
  () => frontFreezeBtn.click();

// --- SIDE FREEZE / SHUTTER ---

const sideFreezeBtn = document.getElementById("side-freeze");

sideFreezeBtn.onclick = () => {
  canvasSide.width = videoSide.videoWidth || 2360;
  canvasSide.height = videoSide.videoHeight || 1640;

  ctxSide.drawImage(videoSide, 0, 0, canvasSide.width, canvasSide.height);
  const imgData = ctxSide.getImageData(0, 0, canvasSide.width, canvasSide.height);

  detectSideMarkersFromImageData(imgData);
};

document.getElementById("side-shutter-left").onclick =
document.getElementById("side-shutter-right").onclick =
  () => sideFreezeBtn.click();

document.getElementById("side-to-check").onclick = () => {
  showScreen("check");
  initCheck();
};

// --- CHECK ---

function initCheck() {
  const pupilLeftEl = document.getElementById("pupil-left");
  const pupilRightEl = document.getElementById("pupil-right");
  const markerTopEl = document.getElementById("marker-top");
  const frameRefLineEl = document.getElementById("frame-ref-line");

  pupilLeftEl.style.left = "40%";
  pupilLeftEl.style.top = "50%";
  pupilRightEl.style.left = "60%";
  pupilRightEl.style.top = "50%";
  markerTopEl.style.left = "50%";
  markerTopEl.style.top = "25%";
  frameRefLineEl.style.top = (frontData.frameRefLineY || 300) + "px";

  makeDraggable(pupilLeftEl, (x, y) => {
    frontData.pupilLeft = { x, y };
  });

  makeDraggable(pupilRightEl, (x, y) => {
    frontData.pupilRight = { x, y };
  });

  makeDraggable(markerTopEl, (x, y) => {
    frontData.markerCircleTop.x = x;
    frontData.markerCircleTop.y = y;
  });

  makeDraggable(frameRefLineEl, (x, y) => {
    frontData.frameRefLineY = y;
    frameRefLineEl.style.top = y + "px";
  });

  document.getElementById("to-results").onclick = showResultsScreen;
}

function updateCheckPanel() {
  if (lastFrontResult) {
    document.getElementById("pd-value").textContent = lastFrontResult.PD_mm.toFixed(2);
    document.getElementById("hoc-left-value").textContent = lastFrontResult.HOC_Left_mm.toFixed(2);
    document.getElementById("hoc-right-value").textContent = lastFrontResult.HOC_Right_mm.toFixed(2);
  }
  if (lastSideResult) {
    document.getElementById("panto-value").textContent = lastSideResult.pantoscopicAngle.toFixed(1);
    document.getElementById("vertex-value").textContent = lastSideResult.vertexDistance.toFixed(2);
  }
}

// --- RESULTS ---

function showResultsScreen() {
  showScreen("results");

  document.getElementById("results-front-img").src =
    document.getElementById("check-front-img").src;

  document.getElementById("results-side-img").src =
    canvasSide.toDataURL("image/jpeg");

  if (lastFrontResult) {
    document.getElementById("res-pd").textContent = lastFrontResult.PD_mm.toFixed(2) + " mm";
    document.getElementById("res-hoc-l").textContent = lastFrontResult.HOC_Left_mm.toFixed(2) + " mm";
    document.getElementById("res-hoc-r").textContent = lastFrontResult.HOC_Right_mm.toFixed(2) + " mm";
  }
  if (lastSideResult) {
    document.getElementById("res-panto").textContent = lastSideResult.pantoscopicAngle.toFixed(1) + " °";
    document.getElementById("res-vertex").textContent = lastSideResult.vertexDistance.toFixed(2) + " mm";
  }

  document.getElementById("back-to-check").onclick = () => showScreen("check");

  document.getElementById("confirm-order").onclick = () => {
    console.log("ORDER:", {
      front: lastFrontResult,
      side: lastSideResult,
      frontData,
      sideData
    });
  };
}

// --- SIDEBAR / MENIU ---

const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("close-sidebar");

menuBtn.onclick = () => sidebar.classList.add("active");
closeSidebar.onclick = () => sidebar.classList.remove("active");

document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.remove("active");
  }
});

// SETTINGS PANEL

const settingsPanel = document.getElementById("settings-panel");
const closeSettings = document.getElementById("close-settings");
const rotationSelect = document.getElementById("rotation-select");
const flipSelect = document.getElementById("flip-select");
const horizonThresholdInput = document.getElementById("horizon-threshold");

closeSettings.onclick = () => settingsPanel.classList.remove("active");

// INFO MODAL

const infoModal = document.getElementById("info-modal");
const infoTitle = document.getElementById("info-title");
const infoText = document.getElementById("info-text");
const infoClose = document.getElementById("info-close");

function openInfo(title, text) {
  infoTitle.textContent = title;
  infoText.textContent = text;
  infoModal.classList.add("active");
}

infoClose.onclick = () => infoModal.classList.remove("active");

// MENU ITEMS

document.getElementById("menu-settings").onclick = () => {
  sidebar.classList.remove("active");
  settingsPanel.classList.add("active");
};

document.getElementById("menu-calibration").onclick = () => {
  sidebar.classList.remove("active");
  openInfo("Kalibravimas", "Kalibravimo funkcija bus pridėta.");
};

document.getElementById("menu-about").onclick = () => {
  sidebar.classList.remove("active");
  openInfo("Apie sistemą", "Regos Priežiūra matavimo sistema. Versija 1.0.");
};

document.getElementById("menu-help").onclick = () => {
  sidebar.classList.remove("active");
  openInfo("Pagalba", "Pagalbos turinys bus pridėtas.");
};

document.getElementById("menu-version").onclick = () => {
  sidebar.classList.remove("active");
  openInfo("Versija", "Sistema: 1.0.0\nBuild: iPad 11\" 2025 WebApp");
};

// --- ROTACIJA + FLIP + GULŠČIUKAS ---

function applyRotation(deg) {
  const elements = document.querySelectorAll(
    "video, canvas, .base-image, .results-img, .horizon-line"
  );

  const flip = localStorage.getItem("videoFlip") || "none";

  let scaleX = 1;
  let scaleY = 1;

  if (flip === "horizontal") scaleX = -1;
  if (flip === "vertical") scaleY = -1;
  if (flip === "both") { scaleX = -1; scaleY = -1; }

  elements.forEach(el => {
    el.style.transform = `rotate(${deg}deg) scale(${scaleX}, ${scaleY})`;
    el.style.transformOrigin = "center center";
  });

  updateHorizon();
}

function applyFlip(mode) {
  const elements = document.querySelectorAll(
    "video, canvas, .base-image, .results-img, .horizon-line"
  );

  let rotate = parseInt(localStorage.getItem("videoRotation") || 0);

  let scaleX = 1;
  let scaleY = 1;

  if (mode === "horizontal") scaleX = -1;
  if (mode === "vertical") scaleY = -1;
  if (mode === "both") { scaleX = -1; scaleY = -1; }

  elements.forEach(el => {
    el.style.transform = `rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`;
    el.style.transformOrigin = "center center";
  });

  updateHorizon();
}

rotationSelect.onchange = () => {
  const deg = parseInt(rotationSelect.value);
  localStorage.setItem("videoRotation", deg);
  applyRotation(deg);
};

flipSelect.onchange = () => {
  const mode = flipSelect.value;
  localStorage.setItem("videoFlip", mode);
  applyFlip(mode);
};

horizonThresholdInput.onchange = () => {
  const val = parseFloat(horizonThresholdInput.value);
  localStorage.setItem("horizonThreshold", val);
};

// Dinaminis gulščiukas

function updateHorizon() {
  const deg = parseInt(localStorage.getItem("videoRotation") || 0);
  const normalized = Math.abs((deg % 180 + 180) % 180);
  const threshold = parseFloat(localStorage.getItem("horizonThreshold") || 7);

  const lines = [
    document.getElementById("horizon-front"),
    document.getElementById("horizon-side")
  ];

  lines.forEach(line => {
    if (!line) return;

    if (normalized < threshold * 0.5) {
      line.style.background = "rgba(255,255,255,0.8)";
    } else if (normalized < threshold) {
      line.style.background = "rgba(255,255,0,0.8)";
    } else {
      line.style.background = "rgba(255,0,0,0.8)";
    }

    const flip = localStorage.getItem("videoFlip") || "none";

    let scaleX = 1;
    let scaleY = 1;

    if (flip === "horizontal") scaleX = -1;
    if (flip === "vertical") scaleY = -1;
    if (flip === "both") { scaleX = -1; scaleY = -1; }

    line.style.transform = `translateY(-50%) rotate(${deg}deg) scale(${scaleX}, ${scaleY})`;
  });
}

setInterval(updateHorizon, 200);

// Paleidžiant – pritaikom išsaugotus nustatymus

const savedRotation = localStorage.getItem("videoRotation");
if (savedRotation !== null) {
  rotationSelect.value = savedRotation;
  applyRotation(parseInt(savedRotation));
}

const savedFlip = localStorage.getItem("videoFlip");
if (savedFlip) {
  flipSelect.value = savedFlip;
  applyFlip(savedFlip);
}

const savedThreshold = localStorage.getItem("horizonThreshold");
if (savedThreshold !== null) {
  horizonThresholdInput.value = savedThreshold;
}

// --- START ---

showScreen("front");
initFrontAI(videoFront, canvasFront);