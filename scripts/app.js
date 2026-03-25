/* File: scripts/app.js
   Description: Pagrindinė logika – pradėti kamerą (iPad draugiškai),
                Captures FRONT/SIDE, atlikti matavimus (stubai),
                eksportuoti JSON/CSV ir valdyti rezultatų skydelį.
*/

// Globalūs kintamieji
let videoFront, videoSide;
let overlayFront, overlaySide;
let ctxFront, ctxSide;
let detector;
let camStream = null;
let results = {
  finalScale: null,
  wrapAngle: null,
  pantoskopinisKampas: null,
  vertexDistance: null,
  eyeCenters: { left: null, right: null },
  frameDims: null,
  orientation: { yaw: null, pitch: null, roll: null }
};

// File: scripts/app.js (start)
function onOpenCvReady() {
  // Pradinis detektorius (OpenCV priklausomybė galima įjungti)
  detector = new MarkerDetector();
  // Kamera pradėjimo mygtuko paspaudime
  // Kadangi iPad reikalauja vartotojo gestų, laukia pradžios mygtukas
}

// Pradėti kamerą (vienas srautas, kurį atvaizduosime dviejose vietose)
async function startCameras() {
  if (camStream) return; // jau pradėta
  try {
    const constraints = { video: { facingMode: "environment" }, audio: false };
    camStream = await navigator.mediaDevices.getUserMedia(constraints);
    // Abi kameros rodomos ta pačia srautu (paprastas MVP)
    videoFront.srcObject = camStream;
    videoSide.srcObject = camStream;
    // Start is sufficient
  } catch (e) {
    alert("Klaida atidarant kamerą: " + e.message);
  }
}

// Initialization of DOM elements
const btnStart = document.getElementById('start-cams');
const videoFrontEl = document.getElementById('video-front');
const videoSideEl  = document.getElementById('video-side');
const canvasFront  = document.getElementById('overlay-front');
const canvasSide   = document.getElementById('overlay-side');
const ctxFrontEl   = canvasFront.getContext('2d');
const ctxSideEl    = canvasSide.getContext('2d');
btnStart.addEventListener('click', async () => {
  await startCameras();
  // Leidimas: nustatome dydžius po srauto paleidimo
  updateCanvasSizes();
  // galima pradėti nuolatinį piešimą (overlay) jei reikia
});

// Captures
document
