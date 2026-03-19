import { initFaceAI, detectMarkers, frontData, onFrontResult } from "./ai.js";
import { bindPupilDrag } from "./drag.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pupilLeftEl = document.getElementById("pupil-left");
const pupilRightEl = document.getElementById("pupil-right");

// 1) paleidžiam AI vyzdžiams
initFaceAI(video, canvas);

// 2) paleidžiam drag & drop pataisymui
bindPupilDrag(pupilLeftEl, pupilRightEl, canvas);

// 3) kai turim kadrą – aptinkam markerį (pvz. po „Freeze“)
function captureFrameAndDetectMarkers() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  detectMarkers(imageData);
}

// 4) nustatom rėmelio referencinę liniją (pvz. per UI sliderį ar drag)
frontData.frameRefLineY = canvas.height * 0.7;

// 5) gaunam rezultatus ir atnaujinam UI
onFrontResult((result, data) => {
  // čia atnaujini PD/HOC lentelę
  console.log("FRONT:", result);
});