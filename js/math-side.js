// FILE: js/math-side.js
// Paskirtis: SIDE kadro matematika – pantoskopinis kampas, vertex distance

const SIDE_MARKER_DIAMETER_MM = 9; // tas pats markeris, 9 mm

// mm/px skalė iš markerio
export function computeSideScale(markerDiameterPx) {
  return SIDE_MARKER_DIAMETER_MM / markerDiameterPx;
}

// Pantoskopinis kampas iš dviejų markerio taškų
export function computePantoscopicAngle(top, bottom) {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// Vertex distance = atstumas tarp vyzdžio ir lęšio taško
export function computeVertexDistance(pupil, lensPoint, scaleMmPerPx) {
  const dx = pupil.x - lensPoint.x;
  const dy = pupil.y - lensPoint.y;
  return Math.sqrt(dx * dx + dy * dy) * scaleMmPerPx;
}

// Pilnas SIDE matavimų paketas
export function computeSideMeasurements(data) {
  const { markerTop, markerBottom, pupil, lensPoint } = data;
  const scale = computeSideScale(markerTop.diameterPx);
  return {
    scaleMmPerPx: scale,
    pantoscopicAngle: computePantoscopicAngle(markerTop, markerBottom),
    vertexDistance: computeVertexDistance(pupil, lensPoint, scale)
  };
}