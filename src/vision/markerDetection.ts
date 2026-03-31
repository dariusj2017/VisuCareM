export type MarkerPoint = { x: number; y: number };

export type FrontDetectedMarkers = {
  topLeft9?: MarkerPoint;
  topRight9?: MarkerPoint;
  topCenter6?: MarkerPoint;
  bottomLeft6?: MarkerPoint;
  bottomRight6?: MarkerPoint;
};

export type SideDetectedMarkers = {
  sideTop9?: MarkerPoint;
  sideBottom6?: MarkerPoint;
};

declare global {
  interface Window {
    cv: any;
  }
}

function ensureCv() {
  const cv = window.cv;
  if (!cv || typeof cv.imread !== "function") {
    throw new Error("OpenCV.js dar neužsikrovė");
  }
  return cv;
}

type MatchCandidate = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
};

function overlap(a: MatchCandidate, b: MatchCandidate) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));

  return overlapX * overlapY;
}

function nonMaximumSuppression(
  candidates: MatchCandidate[],
  maxCount: number,
  overlapRatio = 0.35
) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const kept: MatchCandidate[] = [];

  for (const candidate of sorted) {
    const blocked = kept.some((k) => {
      const overlapArea = overlap(candidate, k);
      const minArea = Math.min(
        candidate.width * candidate.height,
        k.width * k.height
      );
      return minArea > 0 && overlapArea / minArea > overlapRatio;
    });

    if (!blocked) {
      kept.push(candidate);
    }

    if (kept.length >= maxCount) break;
  }

  return kept;
}

function matchTemplateMultiScale(
  cv: any,
  sourceGray: any,
  templateGray: any,
  threshold: number,
  scales: number[],
  maxCount: number
) {
  const allCandidates: MatchCandidate[] = [];

  for (const scale of scales) {
    const scaled = new cv.Mat();
    const scaledWidth = Math.max(8, Math.round(templateGray.cols * scale));
    const scaledHeight = Math.max(8, Math.round(templateGray.rows * scale));

    cv.resize(
      templateGray,
      scaled,
      new cv.Size(scaledWidth, scaledHeight),
      0,
      0,
      cv.INTER_AREA
    );

    if (
      scaled.cols >= sourceGray.cols ||
      scaled.rows >= sourceGray.rows ||
      scaled.cols < 8 ||
      scaled.rows < 8
    ) {
      scaled.delete();
      continue;
    }

    const result = new cv.Mat();
    cv.matchTemplate(sourceGray, scaled, result, cv.TM_CCOEFF_NORMED);

    for (let y = 0; y < result.rows; y++) {
      for (let x = 0; x < result.cols; x++) {
        const score = result.floatAt(y, x);
        if (score >= threshold) {
          allCandidates.push({
            x,
            y,
            width: scaled.cols,
            height: scaled.rows,
            score,
          });
        }
      }
    }

    result.delete();
    scaled.delete();
  }

  return nonMaximumSuppression(allCandidates, maxCount);
}

function candidateCenter(candidate: MatchCandidate): MarkerPoint {
  return {
    x: candidate.x + candidate.width / 2,
    y: candidate.y + candidate.height / 2,
  };
}

export function buildMarkerTemplatesFromSheet(sheetImage: HTMLImageElement) {
  const width = sheetImage.naturalWidth || sheetImage.width;
  const height = sheetImage.naturalHeight || sheetImage.height;

  const crop = (sx: number, sy: number, sw: number, sh: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Nepavyko sukurti canvas konteksto");

    ctx.drawImage(sheetImage, sx, sy, sw, sh, 0, 0, sw, sh);

    return canvas;
  };

  const big = crop(
    Math.round(width * 0.01),
    Math.round(height * 0.08),
    Math.round(width * 0.34),
    Math.round(height * 0.84)
  );

  const center = crop(
    Math.round(width * 0.36),
    Math.round(height * 0.18),
    Math.round(width * 0.27),
    Math.round(height * 0.64)
  );

  const bottom = crop(
    Math.round(width * 0.68),
    Math.round(height * 0.16),
    Math.round(width * 0.24),
    Math.round(height * 0.68)
  );

  return { big, center, bottom };
}

export function detectFrontMarkers(
  sourceCanvas: HTMLCanvasElement,
  templateCanvases: {
    big: HTMLCanvasElement;
    center: HTMLCanvasElement;
    bottom: HTMLCanvasElement;
  }
): FrontDetectedMarkers {
  const cv = ensureCv();

  const src = cv.imread(sourceCanvas);
  const srcGray = new cv.Mat();
  cv.cvtColor(src, srcGray, cv.COLOR_RGBA2GRAY);

  const tplBig = cv.imread(templateCanvases.big);
  const tplCenter = cv.imread(templateCanvases.center);
  const tplBottom = cv.imread(templateCanvases.bottom);

  const tplBigGray = new cv.Mat();
  const tplCenterGray = new cv.Mat();
  const tplBottomGray = new cv.Mat();

  cv.cvtColor(tplBig, tplBigGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(tplCenter, tplCenterGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(tplBottom, tplBottomGray, cv.COLOR_RGBA2GRAY);

  const bigMatches = matchTemplateMultiScale(
    cv,
    srcGray,
    tplBigGray,
    0.62,
    [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3],
    6
  );

  const centerMatches = matchTemplateMultiScale(
    cv,
    srcGray,
    tplCenterGray,
    0.6,
    [0.7, 0.8, 0.9, 1, 1.1, 1.2],
    4
  );

  const bottomMatches = matchTemplateMultiScale(
    cv,
    srcGray,
    tplBottomGray,
    0.6,
    [0.7, 0.8, 0.9, 1, 1.1, 1.2],
    6
  );

  const result: FrontDetectedMarkers = {};

  if (bigMatches.length >= 2) {
    const sorted = bigMatches
      .map(candidateCenter)
      .sort((a, b) => a.x - b.x);

    result.topLeft9 = sorted[0];
    result.topRight9 = sorted[sorted.length - 1];
  }

  if (centerMatches.length >= 1) {
    const bestCenter = centerMatches
      .map(candidateCenter)
      .sort(
        (a, b) =>
          Math.abs(a.x - sourceCanvas.width / 2) -
          Math.abs(b.x - sourceCanvas.width / 2)
      )[0];

    result.topCenter6 = bestCenter;
  }

  if (bottomMatches.length >= 2) {
    const sorted = bottomMatches
      .map(candidateCenter)
      .sort((a, b) => a.x - b.x);

    result.bottomLeft6 = sorted[0];
    result.bottomRight6 = sorted[sorted.length - 1];
  }

  src.delete();
  srcGray.delete();
  tplBig.delete();
  tplCenter.delete();
  tplBottom.delete();
  tplBigGray.delete();
  tplCenterGray.delete();
  tplBottomGray.delete();

  return result;
}

export function detectSideMarkers(
  sourceCanvas: HTMLCanvasElement,
  templateCanvases: {
    big: HTMLCanvasElement;
    bottom: HTMLCanvasElement;
  }
): SideDetectedMarkers {
  const cv = ensureCv();

  const src = cv.imread(sourceCanvas);
  const srcGray = new cv.Mat();
  cv.cvtColor(src, srcGray, cv.COLOR_RGBA2GRAY);

  const tplBig = cv.imread(templateCanvases.big);
  const tplBottom = cv.imread(templateCanvases.bottom);

  const tplBigGray = new cv.Mat();
  const tplBottomGray = new cv.Mat();

  cv.cvtColor(tplBig, tplBigGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(tplBottom, tplBottomGray, cv.COLOR_RGBA2GRAY);

  const bigMatches = matchTemplateMultiScale(
    cv,
    srcGray,
    tplBigGray,
    0.62,
    [0.7, 0.8, 0.9, 1, 1.1, 1.2],
    4
  );

  const bottomMatches = matchTemplateMultiScale(
    cv,
    srcGray,
    tplBottomGray,
    0.6,
    [0.7, 0.8, 0.9, 1, 1.1, 1.2],
    4
  );

  const result: SideDetectedMarkers = {};

  if (bigMatches.length >= 1) {
    const bestTop = bigMatches
      .map(candidateCenter)
      .sort((a, b) => a.y - b.y)[0];

    result.sideTop9 = bestTop;
  }

  if (bottomMatches.length >= 1) {
    const bestBottom = bottomMatches
      .map(candidateCenter)
      .sort((a, b) => b.y - a.y)[0];

    result.sideBottom6 = bestBottom;
  }

  src.delete();
  srcGray.delete();
  tplBig.delete();
  tplBottom.delete();
  tplBigGray.delete();
  tplBottomGray.delete();

  return result;
}

export async function imageUrlToCanvas(imageUrl: string) {
  const img = new Image();
  img.src = imageUrl;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nepavyko sukurti canvas konteksto");

  ctx.drawImage(img, 0, 0);
  return canvas;
}