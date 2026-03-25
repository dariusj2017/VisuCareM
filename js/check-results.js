// FILE: js/check-results.js

import { frontData, detectFrontMarkers, updateFrontResult, onFrontResult } from "./ai-front.js";
import { sideData, detectSideMarkers, updateSideResult, onSideResult } from "./ai-side.js";
import { makeDraggable } from "./drag.js";

let lastFrontResult = null;
let lastSideResult = null;

const videoFront = document.getElementById("video-front");
const canvasFront = document.getElementById("canvas-front");
const ctxFront = canvasFront.getContext("2d");

const videoSide = document.getElementById("video-side");
const canvasSide = document.getElementById("canvas-side");
const ctxSide = canvasSide.getContext("2d");

// Paleidžiam kamerą
navigator.mediaDevices.getUserMedia({ video:true }).then(stream=>{
  videoFront.srcObject = stream;
  videoSide.srcObject = stream;
});

// FRONT freeze
document.getElementById("front-freeze").onclick = ()=>{
  ctxFront.drawImage(videoFront,0,0,canvasFront.width,canvasFront.height);
  const imgData = ctxFront.getImageData(0,0,canvasFront.width,canvasFront.height);
  detectFrontMarkers(imgData);
  document.getElementById("check-front-img").src = canvasFront.toDataURL("image/jpeg");
  document.getElementById("front-screen").style.display = "none";
  document.getElementById("side-screen").style.display = "flex";
};

// SIDE freeze
document.getElementById("side-freeze").onclick = ()=>{
  ctxSide.drawImage(videoSide,0,0,canvasSide.width,canvasSide.height);
  const imgData = ctxSide.getImageData(0,0,canvasSide.width,canvasSide.height);
  detectSideMarkers(imgData);
};

// Į CHECK
document.getElementById("side-to-check").onclick = ()=>{
  document.getElementById("side-screen").style.display = "none";
  document.getElementById("check-screen").style.display = "flex";
  initCheck();
};

// FRONT rezultatai
onFrontResult((res)=>{
  lastFrontResult = res;
  updateCheckPanel();
});

// SIDE rezultatai
onSideResult((res)=>{
  lastSideResult = res;
  updateCheckPanel();
});

function initCheck() {
  const pupilLeftEl = document.getElementById("pupil-left");
  const pupilRightEl = document.getElementById("pupil-right");
  const markerTopEl = document.getElementById("marker-top");
  const frameRefLineEl = document.getElementById("frame-ref-line");

  frontData.frameRefLineY = 400;
  frameRefLineEl.style.top = frontData.frameRefLineY + "px";

  makeDraggable(pupilLeftEl, (x,y)=>{
    frontData.pupilLeft = { x, y };
    updateFrontResult();
  });

  makeDraggable(pupilRightEl, (x,y)=>{
    frontData.pupilRight = { x, y };
    updateFrontResult();
  });

  makeDraggable(markerTopEl, (x,y)=>{
    frontData.markerCircleTop.x = x;
    frontData.markerCircleTop.y = y;
    updateFrontResult();
  });

  makeDraggable(frameRefLineEl, (x,y)=>{
    frontData.frameRefLineY = y;
    frameRefLineEl.style.top = y + "px";
    updateFrontResult();
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

function showResultsScreen() {
  document.getElementById("check-screen").style.display = "none";
  document.getElementById("results-screen").style.display = "flex";

  document.getElementById("results-front-img").src =
    document.getElementById("check-front-img").src;

  document.getElementById("results-side-img").src =
    canvasSide.toDataURL("image/jpeg");

  if (lastFrontResult) {
    document.getElementById("res-pd").textContent = lastFrontResult.PD_mm.toFixed(2) + " mm";
    document.getElementById("res-hoc-l").textContent = lastFront