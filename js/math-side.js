// FILE: js/math-side.js

const SIDE_MARKER_DIAMETER_MM = 9;

export function computeSideScale(markerDiameterPx) {
  return SIDE_MARKER_DIAMETER_MM / markerDiameterPx;
}

export function computePantoscopicAngle(top, bottom) {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function computeVertexDistance(pupil, lensPoint, scaleMmPerPx) {
  const dx = pupil.x - lensPoint.x;
  const dy = pupil.y - lensPoint.y;
  return Math.sqrt(dx*dx + dy*dy) * scaleMmPerPx;
}

export function computeSideMeasurements(data) {
  const { markerTop, markerBottom, pupil, lensPoint } = data;
  const scale = computeSideScale(markerTop.diameterPx);
  return {
    scaleMmPerPx: scale,
    pantoscopicAngle: computePantoscopicAngle(markerTop, markerBottom),
    vertexDistance: computeVertexDistance(pupil, lensPoint, scale)
  };
}