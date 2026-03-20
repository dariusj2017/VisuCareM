// FILE: js/app.js
// Paskirtis: visas workflow – ekranų perjungimas, kamera, freeze, shutter mygtukai, CHECK/RESULTS, meniu, settings, rotacija/flip, dinaminis gulščiukas

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

// --- EKRANŲ VALDYMAS ---

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(name + "-screen").classList.add("active");
}

// FRONT elementai
const videoFront = document.getElementById("video-front");
const canvasFront = document.getElementById("canvas-front");
const ctxFront = canvasFront.getContext("2d");

// SIDE elementai
const videoSide = document.getElementById("video-side");
const canvasSide = document.getElementById("canvas-side");
const ctxSide = canvasSide.getContext("2d");

// CHECK / RESULTS kintamieji
let lastFrontResult = null;
let lastSideResult = null;

// FRONT rezultato callback
onFrontResult((res) => {
  lastFrontResult = res;
  updateCheckPanel();
});

// SIDE rezultato callback
onSideResult((res) => {
  lastSideResult = res;
  updateCheckPanel();
});

// --- FRONT FREEZE / SHUTTER ---

const frontFreezeBtn = document.getElementById("front-freeze");

frontFreezeBtn.onclick = () => {
  // Freeze FRONT kadrą
  ctxFront.drawImage(videoFront, 0, 0, canvasFront.width, canvasFront.height);
  const imgData = ctxFront.getImageData(0, 0, canvasFront.width, canvasFront.height);

  // Markerio aptikimas
  detectFrontMarkerFromImageData(imgData);

  // FRONT kadras CHECK overlay'ui
  document.getElementById("check-front-img").src = canvasFront.toDataURL("image/jpeg");

  // Pereinam į SIDE
  showScreen("side");
  initSideAI(videoSide, canvasSide);
};

// Permatomi shutter mygtukai FRONT
document.getElementById("front-shutter-left").onclick =
document.getElementById("front-shutter-right").onclick =
  () => frontFreezeBtn.click();

// --- SIDE FREEZE / SHUTTER ---

const sideFreezeBtn = document.getElementById("side-freeze");

sideFreezeBtn.onclick = () => {
  ctxSide.drawImage(videoSide, 0, 0, canvasSide.width, canvasSide.height);
  const imgData = ctxSide.getImageData(0, 0, canvasSide.width, canvasSide.height);

  // Markerio aptikimas SIDE
  detectSideMarkersFromImageData(imgData);
};

// Permatomi shutter mygtukai SIDE
document.getElementById("side-shutter-left").onclick =
document.getElementById("side-shutter-right").onclick =
  () => sideFreezeBtn.click();

// SIDE → CHECK
document.getElementById("side-to-check").onclick = () => {
  showScreen("check");
  initCheck();
};

// --- CHECK inicializacija ---

function initCheck() {
  const pupilLeftEl = document.getElementById("pupil-left");
  const pupilRightEl = document.getElementById("pupil-right");
  const markerTopEl = document.getElementById("marker-top");
  const frameRefLineEl = document.getElementById("frame-ref-line");

  // Pradinės pozicijos (apytikslės)
  pupilLeftEl.style.left = "40%";
  pupilLeftEl.style.top = "50%";
  pupilRightEl.style.left = "60%";
  pupilRightEl.style.top = "50%";
  markerTopEl.style.left = "50%";
  markerTopEl.style.top = "25%";
  frameRefLineEl.style.top = frontData.frameRefLineY + "px";

  // Drag – atnaujinam frontData
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

// --- CHECK panelės atnaujinimas ---

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

// --- RESULTS ekranas ---

function showResultsScreen() {
  showScreen("results");

  // FRONT ir SIDE kadrai
  document.getElementById("results-front-img").src =
    document.getElementById("check-front-img").src;

  document.getElementById("results-side-img").src =
    canvasSide.toDataURL("image/jpeg");

  // Skaičiai
  if (lastFrontResult) {
    document.getElementById("res-pd").textContent = lastFrontResult.PD_mm.toFixed(2) + " mm";
    document.getElementById("res-hoc-l").textContent = lastFrontResult.HOC_Left_mm.toFixed(2) + " mm";
    document.getElementById("res-hoc-r").textContent = lastFrontResult.HOC_Right_mm.toFixed(2) + " mm";
  }
  if (lastSideResult) {
    document.getElementById("res-panto").textContent = lastSideResult.pantoscopicAngle.toFixed(1) + " °";
    document.getElementById("res-vertex").textContent = lastSideResult.vertexDistance.toFixed(2) + " mm";
  }

  // Atgal į CHECK
  document.getElementById("back-to-check").onclick = () => {
    showScreen("check");
  };

  // Patvirtinimas – čia galėtum siųsti į serverį
  document.getElementById("confirm-order").onclick = () => {
    console.log("ORDER:", {
      front: lastFrontResult,
      side: lastSideResult,
      frontData,
      sideData
    });
  };
}

// --- SIDEBAR LOGIKA ---

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

// --- SETTINGS PANEL ---

const settingsPanel = document.getElementById("settings-panel");
const closeSettings = document.getElementById("close-settings");
const rotationSelect = document.getElementById("rotation-select");
const flipSelect = document.getElementById("flip-select");
const horizonThresholdInput = document.getElementById("horizon-threshold");

closeSettings.onclick = () => settingsPanel.classList.remove("active");

// --- INFO MODAL ---

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

// --- MENU ITEMS ---

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
  openInfo("Versija", "Sistema: 1.0.0\nBuild: iPad WebApp");
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

// Settings – rotacija
rotationSelect.onchange = () => {
  const deg = parseInt(rotationSelect.value);
  localStorage.setItem("videoRotation", deg);
  applyRotation(deg);
};

// Settings – flip
flipSelect.onchange = () => {
  const mode = flipSelect.value;
  localStorage.setItem("videoFlip", mode);
  applyFlip(mode);
};

// Settings – gulščiuko slenkstis
horizonThresholdInput.onchange = () => {
  const val = parseFloat(horizonThresholdInput.value);
  localStorage.setItem("horizonThreshold", val);
};

// Dinaminis gulščiukas
function updateHorizon() {
  const deg = parseInt(localStorage.getItem("videoRotation") || 0);

  // Normalizuojam kampą į 0–180
  const normalized = Math.abs((deg % 180 + 180) % 180);

  // Vartotojo slenkstis
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

// Periodiškai atnaujinam (jei kas nors pasikeitė)
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