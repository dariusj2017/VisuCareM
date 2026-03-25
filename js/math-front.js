// FILE: js/math-front.js
// Paskirtis: FRONT kadro matematika – markerio skalė, PD, HOC skaičiavimai

export const MARKER_TOP_DIAMETER_MM = 9; // markerio skersmuo mm

// Apskaičiuojam mm/px skalę pagal markerio skersmenį pikseliais
export function computeScaleFromMarker(markerDiameterPx) {
  return MARKER_TOP_DIAMETER_MM / markerDiameterPx;
}

// PD = atstumas tarp vyzdžių * skalė
export function computePD(xLeft, xRight, scaleMmPerPx) {
  return Math.abs(xRight - xLeft) * scaleMmPerPx;
}

// HOC = vertikalus atstumas tarp vyzdžio ir ref linijos * skalė
export function computeHOC(pupilY, refLineY, scaleMmPerPx) {
  return (refLineY - pupilY) * scaleMmPerPx;
}

// Pilnas FRONT matavimų paketas
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