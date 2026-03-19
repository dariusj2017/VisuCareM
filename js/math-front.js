// FILE: js/math-front.js

export const MARKER_TOP_DIAMETER_MM = 9;

export function computeScaleFromMarker(markerDiameterPx) {
  return MARKER_TOP_DIAMETER_MM / markerDiameterPx;
}

export function computePD(xLeft, xRight, scaleMmPerPx) {
  return Math.abs(xRight - xLeft) * scaleMmPerPx;
}

export function computeHOC(pupilY, refLineY, scaleMmPerPx) {
  return (refLineY - pupilY) * scaleMmPerPx;
}

export function computeFrontMeasurements(data) {
  const { markerCircleTop, pupilLeft, pupilRight, frameRefLineY } = data;
  const scale = computeScaleFromMarker(markerCircleTop.diameterPx);
  return {
    scaleMmPerPx: scale,
    PD_mm: computePD(pupilLeft.x, pupilRight.x, scale),
    HOC_Left_mm: computeHOC(pupilLeft.y, frameRefLineY, scale),
    HOC_Right_mm: computeHOC(pupilRight.y, frameRefLineY, scale)
  };
}