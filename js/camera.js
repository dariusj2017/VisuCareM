let videoStream = null;
const videoEl = document.getElementById("cameraView");
const cameraSection = document.getElementById("cameraSection");
const photoSection = document.getElementById("photoSection");

async function startCamera(facingMode) {
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());

  videoStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode }
  });

  videoEl.srcObject = videoStream;
}

document.getElementById("frontCam").onclick = () => startCamera("user");
document.getElementById("backCam").onclick = () => startCamera("environment");

document.getElementById("takePhoto").onclick = () => {
  const photoCanvas = document.getElementById("photoCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const ctx = photoCanvas.getContext("2d");

  photoCanvas.width = videoEl.videoWidth;
  photoCanvas.height = videoEl.videoHeight;
  overlayCanvas.width = photoCanvas.width;
  overlayCanvas.height = photoCanvas.height;

  // Hoya adapterio apvertimas (pvz. vertikalus flip)
  ctx.save();
  ctx.scale(1, -1);
  ctx.drawImage(videoEl, 0, -photoCanvas.height);
  ctx.restore();

  State.image = photoCanvas;

  cameraSection.classList.add("hidden");
  photoSection.classList.remove("hidden");
};

document.getElementById("retake").onclick = () => {
  photoSection.classList.add("hidden");
  cameraSection.classList.remove("hidden");
};