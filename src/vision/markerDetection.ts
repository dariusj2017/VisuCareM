export type MarkerPoint = { x: number; y: number };

export type MarkerSet = {
  TL?: MarkerPoint;
  TC?: MarkerPoint;
  TR?: MarkerPoint;
  BL?: MarkerPoint;
  BR?: MarkerPoint;
};

function matchTemplate(
  src: cv.Mat,
  template: cv.Mat,
  threshold = 0.7
) {
  const result = new cv.Mat();
  cv.matchTemplate(src, template, result, cv.TM_CCOEFF_NORMED);

  const matches: { x: number; y: number; score: number }[] = [];

  for (let y = 0; y < result.rows; y++) {
    for (let x = 0; x < result.cols; x++) {
      const score = result.floatAt(y, x);
      if (score > threshold) {
        matches.push({ x, y, score });
      }
    }
  }

  return matches;
}

function getCenter(match: any, template: cv.Mat) {
  return {
    x: match.x + template.cols / 2,
    y: match.y + template.rows / 2,
  };
}

export function detectMarkers(
  canvas: HTMLCanvasElement,
  templates: {
    big: HTMLImageElement;
    center: HTMLImageElement;
    bottom: HTMLImageElement;
  }
): MarkerSet {
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const tBig = cv.imread(templates.big);
  const tCenter = cv.imread(templates.center);
  const tBottom = cv.imread(templates.bottom);

  cv.cvtColor(tBig, tBig, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(tCenter, tCenter, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(tBottom, tBottom, cv.COLOR_RGBA2GRAY);

  const bigMatches = matchTemplate(gray, tBig, 0.75);
  const centerMatches = matchTemplate(gray, tCenter, 0.75);
  const bottomMatches = matchTemplate(gray, tBottom, 0.75);

  const points: MarkerSet = {};

  // 👉 BIG → TL / TR
  if (bigMatches.length >= 2) {
    const sorted = bigMatches
      .map((m) => getCenter(m, tBig))
      .sort((a, b) => a.x - b.x);

    points.TL = sorted[0];
    points.TR = sorted[sorted.length - 1];
  }

  // 👉 CENTER → TC
  if (centerMatches.length > 0) {
    const best = centerMatches.sort((a, b) => b.score - a.score)[0];
    points.TC = getCenter(best, tCenter);
  }

  // 👉 BOTTOM → BL / BR
  if (bottomMatches.length >= 2) {
    const sorted = bottomMatches
      .map((m) => getCenter(m, tBottom))
      .sort((a, b) => a.x - b.x);

    points.BL = sorted[0];
    points.BR = sorted[sorted.length - 1];
  }

  return points;
}