import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { computeFrontMeasurements } from "./math.js";

// Čia laikysim dabartinius taškus (auto + ranka pataisyti)
export const frontData = {
  markerCircleTop: { x: 0, y: 0, diameterPx: 0 },
  pupilLeft:  { x: 0, y: 0 },
  pupilRight: { x: 0, y: 0 },
  frameRefLineY: 0
};

let onFrontResultCallback = null;

export function onFrontResult(cb) {
  onFrontResultCallback = cb;
}

/**
 * Paleidžia MediaPipe FaceMesh vyzdžių aptikimui.
 * videoElement – <video>, canvasElement – <canvas> overlay.
 */
export function initFaceAI(videoElement, canvasElement) {
  const faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  faceMesh.onResults((results) => {
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) return;

    const landmarks = results.multiFaceLandmarks[0];

    const leftIris = [468, 469, 470, 471].map(i => landmarks[i]);
    const rightIris = [473, 474, 475, 476].map(i => landmarks[i]);

    const pupilLeft = averagePoints(leftIris, canvasElement);
    const pupilRight = averagePoints(rightIris, canvasElement);

    frontData.pupilLeft = pupilLeft;
    frontData.pupilRight = pupilRight;

    // čia dar ne markeriai – tik vyzdžiai
    updateFrontResult();
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
    },
    width: 1280,
    height: 720
  });

  camera.start();
}

/**
 * Markerio aptikimas (Hough Circle per OpenCV.js).
 * imageData – iš <canvas> paimtas ImageData.
 */
export function detectMarkers(imageData) {
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const circles = new cv.Mat();
  cv.HoughCircles(
    gray,
    circles,
    cv.HOUGH_GRADIENT,
    1,
    50,
    100,
    30,
    10,
    200
  );

  let detected = [];
  for (let i = 0; i < circles.cols; ++i) {
    const x = circles.data32F[i * 3];
    const y = circles.data32F[i * 3 + 1];
    const r = circles.data32F[i * 3 + 2];
    detected.push({ x, y, diameterPx: r * 2 });
  }

  src.delete();
  gray.delete();
  circles.delete();

  // čia tu gali atskirti 9 mm ir 6 mm pagal px dydį
  // pvz. didžiausias – 9 mm viršutinis:
  if (detected.length) {
    const top = detected.reduce((a, b) =>
      a.diameterPx > b.diameterPx ? a : b
    );
    frontData.markerCircleTop = top;
  }

  updateFrontResult();
}

/**
 * Perskaičiuoja FRONT matavimus ir kviečia callback.
 */
function updateFrontResult() {
  if (!frontData.markerCircleTop.diameterPx) return;
  if (!frontData.pupilLeft.x || !frontData.pupilRight.x) return;
  if (!frontData.frameRefLineY) return;

  const result = computeFrontMeasurements(frontData);
  if (onFrontResultCallback) onFrontResultCallback(result, frontData);
}

/**
 * Konvertuoja MediaPipe normalizuotas koordinates į canvas px.
 */
function averagePoints(points, canvas) {
  let x = 0, y = 0;
  points.forEach(p => { x += p.x; y += p.y; });
  x /= points.length;
  y /= points.length;
  return {
    x: x * canvas.width,
    y: y * canvas.height
  };
}