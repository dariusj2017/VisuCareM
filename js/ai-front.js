// FILE: js/ai-front.js

import { computeFrontMeasurements } from "./math-front.js";

export const frontData = {
  markerCircleTop: { x:0, y:0, diameterPx:0 },
  pupilLeft: { x:0, y:0 },
  pupilRight: { x:0, y:0 },
  frameRefLineY: 0
};

let frontCallback = null;
export function onFrontResult(cb) { frontCallback = cb; }

export function detectFrontMarkers(imageData) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const circles = new cv.Mat();
  cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 50, 100, 30, 10, 200);

  let detected = [];
  for (let i=0;i<circles.cols;i++){
    const x = circles.data32F[i*3];
    const y = circles.data32F[i*3+1];
    const r = circles.data32F[i*3+2];
    detected.push({ x, y, diameterPx: r*2 });
  }

  if (detected.length) {
    const top = detected.reduce((a,b)=>a.diameterPx>b.diameterPx?a:b);
    frontData.markerCircleTop = top;
  }

  src.delete(); gray.delete(); circles.delete();
  updateFrontResult();
}

export function updateFrontResult() {
  if (!frontData.markerCircleTop.diameterPx) return;
  if (!frontData.pupilLeft.x || !frontData.pupilRight.x) return;
  if (!frontData.frameRefLineY) return;

  const result = computeFrontMeasurements(frontData);
  if (frontCallback) frontCallback(result, frontData);
}