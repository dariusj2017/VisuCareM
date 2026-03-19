// FILE: js/ai-side.js

import { computeSideMeasurements } from "./math-side.js";

export const sideData = {
  markerTop: { x:0, y:0, diameterPx:0 },
  markerBottom: { x:0, y:0, diameterPx:0 },
  pupil: { x:0, y:0 },
  lensPoint: { x:0, y:0 }
};

let sideCallback = null;
export function onSideResult(cb) { sideCallback = cb; }

export function detectSideMarkers(imageData) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const circles = new cv.Mat();
  cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 40, 100, 30, 10, 200);

  let detected = [];
  for (let i=0;i<circles.cols;i++){
    const x = circles.data32F[i*3];
    const y = circles.data32F[i*3+1];
    const r = circles.data32F[i*3+2];
    detected.push({ x, y, diameterPx: r*2 });
  }

  if (detected.length >= 2) {
    const top = detected.reduce((a,b)=>a.diameterPx>b.diameterPx?a:b);
    const bottom = detected.reduce((a,b)=>a.diameterPx<b.diameterPx?a:b);
    sideData.markerTop = top;
    sideData.markerBottom = bottom;
  }

  src.delete(); gray.delete(); circles.delete();
  updateSideResult();
}

export function updateSideResult() {
  if (!sideData.markerTop.diameterPx) return;
  if (!sideData.markerBottom.diameterPx) return;
  if (!sideData.pupil.x) return;
  if (!sideData.lensPoint.x) return;

  const result = computeSideMeasurements(sideData);
  if (sideCallback) sideCallback(result, sideData);
}