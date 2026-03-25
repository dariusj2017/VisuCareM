import { detectSideMarkers, detectSidePupil, onSideResult, sideData } from "./ai-side.js";
import { bindSideDrag } from "./drag-side.js";

const video = document.getElementById("video-side");
const canvas = document.getElementById("canvas-side");
const ctx = canvas.getContext("2d");

// drag & drop elementai
bindSideDrag(document.getElementById("pupil-side"), "pupil");
bindSideDrag(document.getElementById("marker-top-side"), "markerTop");
bindSideDrag(document.getElementById("marker-bottom-side"), "markerBottom");
bindSideDrag(document.getElementById("lens-point-side"), "lensPoint");

// AI rezultatai
onSideResult((result, data)=>{
  console.log("SIDE:", result);
});

// markerio aptikimas po „Freeze“
function captureSideFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  detectSideMarkers(imageData);
}