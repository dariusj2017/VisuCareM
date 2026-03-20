// FILE: js/app.js
// Paskirtis: visas workflow – ekranų perjungimas, kamera, freeze, CHECK ir RESULTS logika

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

// Ekranų valdymas
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

// FRONT rezultato callback – atnaujinam CHECK panelę
onFrontResult((res) => {
  lastFrontResult = res;
  updateCheckPanel();
});

// SIDE rezultato callback – atnaujinam CHECK panelę
onSideResult((res) => {
  lastSideResult = res;
  updateCheckPanel();
});

// FRONT Freeze – sustabdom kadrą, aptinkam markerį, einam į SIDE
document.getElementById("front-freeze").onclick = () => {
  ctxFront.drawImage(videoFront, 0, 0, canvasFront.width, canvasFront.height);
  const imgData = ctxFront.getImageData(0, 0, canvasFront.width, canvasFront.height);

  // Markerio aptikimas iš freeze kadro
  detectFrontMarkerFromImageData(imgData);

  // FRONT kadras CHECK overlay'ui
  document.getElementById("check-front-img").src = canvasFront.toDataURL("image/jpeg");

  // Pereinam į SIDE ekraną
  showScreen("side");
  initSideAI(videoSide, canvasSide);
};

// SIDE Freeze – sustabdom kadrą, aptinkam markerį
document.getElementById("side-freeze").onclick = () => {
  ctxSide.drawImage(videoSide, 0, 0, canvasSide.width, canvasSide.height);
  const imgData = ctxSide.getImageData(0, 0, canvasSide.width, canvasSide.height);

  // Markerio aptikimas SIDE kadre
  detectSideMarkersFromImageData(imgData);
};

// SIDE → CHECK
document.getElementById("side-to-check").onclick = () => {
  showScreen("check");
  initCheck();
};

// CHECK inicializacija – drag handle'iai
function initCheck() {
  const pupilLeftEl = document.getElementById("pupil-left");
  const pupilRightEl = document.getElementById("pupil-right");
  const markerTopEl = document.getElementById("marker-top");
  const frameRefLineEl = document.getElementById("frame-ref-line");

  // Pradinės pozicijos – centre
  pupilLeftEl.style.left = "260px";
  pupilLeftEl.style.top = "220px";
  pupilRightEl.style.left = "360px";
  pupilRightEl.style.top = "220px";
  markerTopEl.style.left = "300px";
  markerTopEl.style.top = "100px";
  frameRefLineEl.style.top = frontData.frameRefLineY + "px";

  // Drag – atnaujinam frontData ir perskaičiuojam
  makeDraggable(pupilLeftEl, (x, y) => {
    frontData.pupilLeft = { x, y };
    // rankinis override – perskaičiuojam
    frontData.frameRefLineY = parseFloat(frameRefLineEl.style.top);
    // frontResult bus atnaujintas ai-front.js
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

// Atnaujinam CHECK panelę iš paskutinių rezultatų
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

// RESULTS ekranas – fotografuojamas vaizdas
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

  // Patvirtinimas – čia galėtum siųsti į serverį ar pan.
  document.getElementById("confirm-order").onclick = () => {
    console.log("ORDER:", {
      front: lastFrontResult,
      side: lastSideResult,
      frontData,
      sideData
    });
  };
}

// START – paleidžiam FRONT ekraną ir AI
showScreen("front");
initFrontAI(videoFront, canvasFront);