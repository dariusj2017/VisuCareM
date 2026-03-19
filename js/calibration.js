function calibrate() {
  const p1 = State.points.markerTopLeft;
  const p2 = State.points.markerTopRight;

  if (!p1 || !p2) {
    alert("Trūksta markerio taškų kalibracijai.");
    return;
  }

  const px = dist(p1, p2);
  State.mmPerPixel = 120 / px;
}