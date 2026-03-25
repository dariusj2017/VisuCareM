// FILE: js/ai-side.js
// Paskirtis: SIDE AI – MediaPipe FaceMesh akies taškas + markerio aptikimas (OpenCV)

import { computeSideMeasurements } from "./math-side.js";

// SIDE duomenų struktūra
export const sideData = {
  markerTop: { x: 0, y: 0, diameterPx: 40 },
  markerBottom: { x: 0, y: 0, diameterPx: 40 },
  pupil: { x: 0, y: 0 },
  lensPoint: { x: 320, y: 240 } // pradinis lęšio taškas – centre
};

let sideCallback = null;
export function onSideResult(cb) { sideCallback = cb; }

// MediaPipe FaceMesh SIDE kamerai
let faceMeshSide = null;

export function initSideAI(videoEl, canvasEl) {
  faceMeshSide = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMeshSide.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  faceMeshSide.onResults((results) => {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) return;

    const lm = results.multiFaceLandmarks[0];

    // Paprastas akies taškas – imame kelis akies kontūro taškus
    const eyeIdx = [33, 133, 159, 145];
    const eye = eyeIdx.map(i => lm[i]);

    sideData.pupil = toCanvasCenter(eye, canvasEl);

    updateSideResult();
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await faceMeshSide.send({ image: videoEl });
    },
    width: 1280,
    height: 720
  });

  camera.start();
}

function toCanvasCenter(points, canvas) {
  let x = 0, y = 0;
  points.forEach(p => { x += p.x; y += p.y; });
  x /= points.length;
  y /= points.length;
  return { x: x * canvas.width, y: y * canvas.height };
}

// Markerio aptikimas SIDE kadre
export function detectSideMarkersFromImageData(imageData) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const circles = new cv.Mat();
  cv.HoughCircles(
    gray,
    circles,
    cv.HOUGH_GRADIENT,
    1,
    40,
    120,
    30,
    8,
    80
  );

  let detected = [];
  for (let i = 0; i < circles.cols; i++) {
    const x = circles.data32F[i * 3];
    const y = circles.data32F[i * 3 + 1];
    const r = circles.data32F[i * 3 + 2];
    detected.push({ x, y, diameterPx: r * 2 });
  }

  if (detected.length >= 2) {
    // Viršutinis ir apatinis markeriai – pagal Y
    const top = detected.reduce((a, b) => a.y < b.y ? a : b);
    const bottom = detected.reduce((a, b) => a.y > b.y ? a : b);
    sideData.markerTop = top;
    sideData.markerBottom = bottom;
  }

  src.delete();
  gray.delete();
  circles.delete();

  updateSideResult();
}

// Perskaičiuojam SIDE matavimus ir kviečiam callback
export function updateSideResult() {
  if (!sideData.markerTop.diameterPx) return;
  if (!sideData.markerBottom.diameterPx) return;
  if (!sideData.pupil.x) return;
  if (!sideData.lensPoint.x) return;

  const result = computeSideMeasurements(sideData);
  if (sideCallback) sideCallback(result, sideData);
}