function computePD() {
  const L = State.points.eyeLeft;
  const R = State.points.eyeRight;
  if (!L || !R || !State.mmPerPixel) return null;

  const px = dist(L, R);
  return px * State.mmPerPixel;
}

function compute5mmRingRadius() {
  if (!State.mmPerPixel) return null;
  return 5 / State.mmPerPixel;
}

function computeLesionRadius(mm) {
  if (!State.mmPerPixel) return null;
  return (mm / 2) / State.mmPerPixel;
}

function updateMeasurementsPanel() {
  const panel = document.getElementById("measurements");
  panel.innerHTML = "";

  const pd = computePD();
  const r5 = compute5mmRingRadius();
  const lesionR = computeLesionRadius(70);

  const lines = [];
  if (pd) lines.push(`PD: ${pd.toFixed(2)} mm`);
  if (r5) lines.push(`5 mm žiedo spindulys: ${r5.toFixed(2)} px`);
  if (lesionR) lines.push(`Lesion 70 mm spindulys: ${lesionR.toFixed(2)} px`);

  panel.innerHTML = lines.join("<br>");
}