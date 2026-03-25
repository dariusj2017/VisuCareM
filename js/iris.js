async function detectIris() {
  // ČIA: vietoj šito darysi realų MediaPipe Iris kvietimą.
  // Dabar – demo logika: paima maždaug vidurį kadro.
  const c = State.image;
  const w = c.width;
  const h = c.height;

  State.points.eyeLeft = { x: w * 0.4, y: h * 0.5 };
  State.points.eyeRight = { x: w * 0.6, y: h * 0.5 };

  State.autoDetected.iris = true;
}