// libs/mediapipe_iris.js

// Šitas loaderis naudoja MediaPipe Tasks Vision IrisLandmarker modelį.
// Tu turi turėti šiuos failus tame pačiame aplanke arba nurodyti teisingus kelius:
//
//  - vision_wasm_internal.wasm
//  - iris_landmarker.task
//
// Svarbu: iPad'e keliai turi būti santykiniai nuo index.html.

const IrisModel = (() => {
  let irisLandmarker = null;

  async function load() {
    if (irisLandmarker) return;

    // Čia naudosim oficialų MediaPipe Tasks Vision loaderį iš CDN.
    // Jei nori 100% offline, šitą vision_bundle.mjs irgi gali atsisiųsti ir laikyti lokaliai.
    const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.mjs");

    const { FilesetResolver, IrisLandmarker } = visionModule;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      // WASM failo kelias (pakeisk, jei laikysi kitur)
      "./libs/vision_wasm_internal.wasm"
    );

    irisLandmarker = await IrisLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        // Modelio failo kelias (pakeisk, jei laikysi kitur)
        modelAssetPath: "./libs/iris_landmarker.task"
      },
      runningMode: "IMAGE",
      numFaces: 1
    });
  }

  async function estimate(canvas) {
    if (!irisLandmarker) {
      throw new Error("Iris model not loaded. Call IrisModel.load() first.");
    }

    const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);

    const mpImage = {
      width: canvas.width,
      height: canvas.height,
      data: imageData.data
    };

    const result = irisLandmarker.detect(mpImage);

    if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
      throw new Error("No face/iris detected");
    }

    const face = result.faceLandmarks[0];

    // MediaPipe Iris turi specifinius indeksus vyzdžio taškams.
    // Paprastumo dėlei paimsim po vieną tašką iš kiekvienos akies centro zonos.
    // Vėliau galėsi patobulinti, darydamas vidurkį iš kelių taškų.

    // Čia pavyzdiniai indeksai – realiai reikėtų pasižiūrėti oficialią schemą.
    const LEFT_PUPIL_INDEX = 468;   // pavyzdys
    const RIGHT_PUPIL_INDEX = 473;  // pavyzdys

    const left = face[LEFT_PUPIL_INDEX];
    const right = face[RIGHT_PUPIL_INDEX];

    // MediaPipe grąžina normalizuotas koordinates [0..1], paversim į pikselius
    const leftCenter = {
      x: left.x * canvas.width,
      y: left.y * canvas.height
    };

    const rightCenter = {
      x: right.x * canvas.width,
      y: right.y * canvas.height
    };

    return {
      leftEye: { center: leftCenter },
      rightEye: { center: rightCenter }
    };
  }

  return { load, estimate };
})();