// 9 mm viršutinis markeris
const MARKER_TOP_DIAMETER_MM = 9;

/**
 * Skalė mm/px pagal 9 mm markerį.
 */
export function computeScaleFromMarker(markerDiameterPx) {
  if (!markerDiameterPx || markerDiameterPx <= 0) {
    throw new Error("Neteisingas markerio skersmuo pikseliais");
  }
  return MARKER_TOP_DIAMETER_MM / markerDiameterPx;
}

/**
 * PD mm iš kairio ir dešinio vyzdžio X.
 */
export function computePD(xLeft, xRight, scaleMmPerPx) {
  return Math.abs(xRight - xLeft) * scaleMmPerPx;
}

/**
 * HOC mm (nuo referencinės linijos).
 */
export function computeHOC(pupilY, refLineY, scaleMmPerPx) {
  return (refLineY - pupilY) * scaleMmPerPx;
}

/**
 * Pilnas FRONT matavimas.
 */
export function computeFrontMeasurements(data) {
  const {
    markerCircleTop,   // { x, y, diameterPx }
    pupilLeft,         // { x, y }
    pupilRight,        // { x, y }
    frameRefLineY      // number
  } = data;

  const scale = computeScaleFromMarker(markerCircleTop.diameterPx);
  const pd = computePD(pupilLeft.x, pupilRight.x, scale);
  const hocLeft = computeHOC(pupilLeft.y, frameRefLineY, scale);
  const hocRight = computeHOC(pupilRight.y, frameRefLineY, scale);

  return {
    scaleMmPerPx: scale,
    PD_mm: pd,
    HOC_Left_mm: hocLeft,
    HOC_Right_mm: hocRight
  };
}