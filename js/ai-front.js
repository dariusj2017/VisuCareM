// FILE: js/ai-front.js
// Paskirtis: FRONT AI – MediaPipe FaceMesh vyzdžių aptikimas + markerio aptikimas (OpenCV)

import { computeFrontMeasurements } from "./math-front.js";

// FRONT duomenų struktūra
export const frontData = {
  markerCircleTop: { x: 0, y: 0, diameterPx: 40 },
  pupilLeft: { x: 0, y: 0 },
  pupilRight: { x: 0, y: 0 },
  frameRefLineY: 400
};

let frontCallback = null;
export function onFrontResult(cb) { frontCallback = cb; }

// MediaPipe FaceMesh instancija
let faceMeshFront = null;

// Inicializuojam MediaPipe FaceMesh FRONT kamerai
export function initFrontAI(videoEl, canvasEl) {
  faceMeshFront = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMeshFront.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true, // būtina iris
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  faceMeshFront.onResults((results) => {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) return;

    const lm = results.multiFaceLandmarks[0];

    // Iris indeksai (MediaPipe)
    const leftIrisIdx = [468, 469, 470, 471];
    const rightIrisIdx = [473, 474, 475, 476];

    const leftIris = leftIrisIdx.map(i => lm[i]);
    const rightIris = rightIrisIdx.map(i => lm[i]);

    frontData.pupilLeft = toCanvasCenter(leftIris, canvasEl);
    frontData.pupilRight = toCanvasCenter(rightIris, canvasEl);

    updateFrontResult();
  });

  // Kamera – MediaPipe CameraUtils
  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await faceMeshFront.send({ image: videoEl });
    },
    width: 1280,
    height: 720
  });

  camera.start();
}

// Konvertuojam MediaPipe normalizuotas koordinates į canvas px
function toCanvasCenter(points, canvas) {
  let x = 0, y = 0;
  points.forEach(p => { x += p.x; y += p.y; });
  x /= points.length;
  y /= points.length;
  return { x: x * canvas.width, y: y * canvas.height };
}

// Markerio aptikimas iš freeze kadro (OpenCV Hough Circle)
export function detectFrontMarkerFromImageData(imageData) {
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

  if (detected.length) {
    // Imame didžiausią – laikom kaip markerį
    const top = detected.reduce((a, b) => a.diameterPx > b.diameterPx ? a : b);
    frontData.markerCircleTop = top;
  }

  src.delete();
  gray.delete();
  circles.delete();

  updateFrontResult();
}

// Perskaičiuojam FRONT matavimus ir kviečiam callback
export function updateFrontResult() {
  if (!frontData.markerCircleTop.diameterPx) return;
  if (!frontData.pupilLeft.x || !frontData.pupilRight.x) return;
  if (!frontData.frameRefLineY) return;

  const result = computeFrontMeasurements(frontData);
  if (frontCallback) frontCallback(result, frontData);
}