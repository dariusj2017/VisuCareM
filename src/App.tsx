import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoImage from "./img/regos-prieziuros-logotipas.png";
import marker9top from "./assets/markers/marker9top.svg";
import marker6bottom from "./assets/markers/marker6bottom.svg";
import marker6center from "./assets/markers/marker6center.svg";
import markerTemplatesSheet from "./assets/marker-templates.png";
import {
  buildMarkerTemplatesFromSheet,
  detectFrontMarkers,
  detectSideMarkers,
  imageUrlToCanvas,
  type FrontDetectedMarkers,
  type SideDetectedMarkers,
} from "./vision/markerDetection";

declare global {
  interface Window {
    cv: any;
  }
}

type Step = "frontCapture" | "sideCapture" | "calibration";
type CalibrationPanelTarget = "front" | "side";

type FrontMarkerKey =
  | "topLeft9"
  | "topRight9"
  | "topCenter6"
  | "bottomLeft6"
  | "bottomRight6";

type SideMarkerKey = "sideTop9" | "sideBottom6";

type MarkerKey = FrontMarkerKey | SideMarkerKey;

type MarkerPoint = {
  x: number;
  y: number;
};

type MarkerDef = {
  key: MarkerKey;
  label: string;
  svg: string;
  size: number;
  target: "front" | "side";
};

type PanelViewState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const frontMarkerDefs: MarkerDef[] = [
  { key: "topLeft9", label: "Top left 9 mm", svg: marker9top, size: 54, target: "front" },
  { key: "topRight9", label: "Top right 9 mm", svg: marker9top, size: 54, target: "front" },
  { key: "topCenter6", label: "Top center 6 mm", svg: marker6center, size: 42, target: "front" },
  { key: "bottomLeft6", label: "Bottom left 6 mm", svg: marker6bottom, size: 42, target: "front" },
  { key: "bottomRight6", label: "Bottom right 6 mm", svg: marker6bottom, size: 42, target: "front" },
];

const sideMarkerDefs: MarkerDef[] = [
  { key: "sideTop9", label: "Side top 9 mm", svg: marker9top, size: 54, target: "side" },
  { key: "sideBottom6", label: "Side bottom 6 mm", svg: marker6bottom, size: 42, target: "side" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function loadNumberSetting(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadBooleanSetting(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function loadStringSetting<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return (raw as T) || fallback;
}

function getDefaultPanelView(): PanelViewState {
  return { scale: 1, offsetX: 0, offsetY: 0 };
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontViewportRef = useRef<HTMLDivElement | null>(null);
  const sideViewportRef = useRef<HTMLDivElement | null>(null);

  const horizontalLastUpdateRef = useRef(0);
  const horizontalSamplesRef = useRef<number[]>([]);
  const templateSheetImageRef = useRef<HTMLImageElement | null>(null);
  const templateCanvasesRef = useRef<{
    big: HTMLCanvasElement;
    center: HTMLCanvasElement;
    bottom: HTMLCanvasElement;
  } | null>(null);

  const [cvReady, setCvReady] = useState(false);
  const [detectStatus, setDetectStatus] = useState("");
  const [frontDetectedMarkers, setFrontDetectedMarkers] =
    useState<FrontDetectedMarkers | null>(null);
  const [sideDetectedMarkers, setSideDetectedMarkers] =
    useState<SideDetectedMarkers | null>(null);

  const [step, setStep] = useState<Step>("frontCapture");
  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">(
    "user"
  );

  const [rotation, setRotation] = useState(() =>
    loadNumberSetting("vc_rotation", 0)
  );
  const [flipHorizontal, setFlipHorizontal] = useState(() =>
    loadBooleanSetting("vc_flipHorizontal", false)
  );
  const [flipVertical, setFlipVertical] = useState(() =>
    loadBooleanSetting("vc_flipVertical", false)
  );

  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  const [horizontalTolerance, setHorizontalTolerance] = useState(() =>
    loadNumberSetting("vc_horizontalTolerance", 1)
  );
  const [verticalTolerance, setVerticalTolerance] = useState(() =>
    loadNumberSetting("vc_verticalTolerance", 1)
  );
  const [horizontalRange, setHorizontalRange] = useState(() =>
    loadNumberSetting("vc_horizontalRange", 10)
  );
  const [verticalRange, setVerticalRange] = useState(() =>
    loadNumberSetting("vc_verticalRange", 5)
  );

  const [horizontalSmoothing, setHorizontalSmoothing] = useState(() =>
    loadNumberSetting("vc_horizontalSmoothing", 0.1)
  );
  const [verticalSmoothing, setVerticalSmoothing] = useState(() =>
    loadNumberSetting("vc_verticalSmoothing", 0.22)
  );
  const [horizontalDeadbandDeg, setHorizontalDeadbandDeg] = useState(() =>
    loadNumberSetting("vc_horizontalDeadbandDeg", 1.2)
  );
  const [verticalDeadbandDeg, setVerticalDeadbandDeg] = useState(() =>
    loadNumberSetting("vc_verticalDeadbandDeg", 0.2)
  );
  const [betaFilterStrength, setBetaFilterStrength] = useState(() =>
    loadNumberSetting("vc_betaFilterStrength", 0.12)
  );

  const [horizontalUpdateIntervalMs, setHorizontalUpdateIntervalMs] = useState(() =>
    loadNumberSetting("vc_horizontalUpdateIntervalMs", 50)
  );
  const [horizontalMaxStepDeg, setHorizontalMaxStepDeg] = useState(() =>
    loadNumberSetting("vc_horizontalMaxStepDeg", 0.3)
  );
  const [horizontalSampleWindow, setHorizontalSampleWindow] = useState(() =>
    loadNumberSetting("vc_horizontalSampleWindow", 5)
  );

  const [markerScale, setMarkerScale] = useState(() =>
    loadNumberSetting("vc_markerScale", 1)
  );
  const [markerStrokeWidth, setMarkerStrokeWidth] = useState(() =>
    loadNumberSetting("vc_markerStrokeWidth", 1)
  );

  const [showLevelUI, setShowLevelUI] = useState(() =>
    loadBooleanSetting("vc_showLevelUI", true)
  );
  const [levelPermissionState, setLevelPermissionState] = useState<
    "idle" | "granted" | "denied" | "unsupported"
  >("idle");
  const [levelEnabled, setLevelEnabled] = useState(false);

  const [levelHorizontalDeg, setLevelHorizontalDeg] = useState(0);
  const [levelVerticalDeg, setLevelVerticalDeg] = useState(0);
  const [filteredBeta, setFilteredBeta] = useState(0);

  const [alphaDeg, setAlphaDeg] = useState(0);
  const [betaDeg, setBetaDeg] = useState(0);
  const [gammaDeg, setGammaDeg] = useState(0);

  const [verticalAngleSource, setVerticalAngleSource] = useState<
    "alpha" | "beta" | "gamma"
  >(() => loadStringSetting("vc_verticalAngleSource", "gamma"));
  const [invertVerticalAngle, setInvertVerticalAngle] = useState(() =>
    loadBooleanSetting("vc_invertVerticalAngle", false)
  );

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);

  const [frontMarkers, setFrontMarkers] = useState<
    Partial<Record<FrontMarkerKey, MarkerPoint>>
  >({});
  const [sideMarkers, setSideMarkers] = useState<
    Partial<Record<SideMarkerKey, MarkerPoint>>
  >({});

  const [activeCalibrationPanel, setActiveCalibrationPanel] =
    useState<CalibrationPanelTarget>(() =>
      loadStringSetting("vc_activeCalibrationPanel", "front")
    );

  const [frontView, setFrontView] = useState<PanelViewState>(() => getDefaultPanelView());
  const [sideView, setSideView] = useState<PanelViewState>(() => getDefaultPanelView());

  const [draggingMarker, setDraggingMarker] = useState<{
    key: MarkerKey;
    target: CalibrationPanelTarget;
  } | null>(null);

  const [panningPanel, setPanningPanel] = useState<{
    target: CalibrationPanelTarget;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("vc_rotation", String(rotation));
    localStorage.setItem("vc_flipHorizontal", String(flipHorizontal));
    localStorage.setItem("vc_flipVertical", String(flipVertical));
    localStorage.setItem("vc_horizontalTolerance", String(horizontalTolerance));
    localStorage.setItem("vc_verticalTolerance", String(verticalTolerance));
    localStorage.setItem("vc_horizontalRange", String(horizontalRange));
    localStorage.setItem("vc_verticalRange", String(verticalRange));
    localStorage.setItem("vc_horizontalSmoothing", String(horizontalSmoothing));
    localStorage.setItem("vc_verticalSmoothing", String(verticalSmoothing));
    localStorage.setItem("vc_horizontalDeadbandDeg", String(horizontalDeadbandDeg));
    localStorage.setItem("vc_verticalDeadbandDeg", String(verticalDeadbandDeg));
    localStorage.setItem("vc_betaFilterStrength", String(betaFilterStrength));
    localStorage.setItem("vc_horizontalUpdateIntervalMs", String(horizontalUpdateIntervalMs));
    localStorage.setItem("vc_horizontalMaxStepDeg", String(horizontalMaxStepDeg));
    localStorage.setItem("vc_horizontalSampleWindow", String(horizontalSampleWindow));
    localStorage.setItem("vc_markerScale", String(markerScale));
    localStorage.setItem("vc_markerStrokeWidth", String(markerStrokeWidth));
    localStorage.setItem("vc_showLevelUI", String(showLevelUI));
    localStorage.setItem("vc_verticalAngleSource", verticalAngleSource);
    localStorage.setItem("vc_invertVerticalAngle", String(invertVerticalAngle));
    localStorage.setItem("vc_activeCalibrationPanel", activeCalibrationPanel);
  }, [
    rotation,
    flipHorizontal,
    flipVertical,
    horizontalTolerance,
    verticalTolerance,
    horizontalRange,
    verticalRange,
    horizontalSmoothing,
    verticalSmoothing,
    horizontalDeadbandDeg,
    verticalDeadbandDeg,
    betaFilterStrength,
    horizontalUpdateIntervalMs,
    horizontalMaxStepDeg,
    horizontalSampleWindow,
    markerScale,
    markerStrokeWidth,
    showLevelUI,
    verticalAngleSource,
    invertVerticalAngle,
    activeCalibrationPanel,
  ]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = markerTemplatesSheet;
    img.onload = () => {
      templateSheetImageRef.current = img;
      try {
        templateCanvasesRef.current = buildMarkerTemplatesFromSheet(img);
      } catch (err) {
        console.error(err);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (window.cv && typeof window.cv.imread === "function") {
        setCvReady(true);
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const startCamera = async () => {
    try {
      setError("");

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
    } catch (err) {
      setError("Nepavyko įjungti kameros. Patikrink leidimus.");
      setIsCameraOn(false);
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  };

  useEffect(() => {
    if (step === "calibration") return;

    startCamera();

    return () => {
      stopCamera();
    };
  }, [cameraFacingMode, step]);

  useEffect(() => {
    if (videoRef.current && streamRef.current && step !== "calibration") {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step, cameraFacingMode]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const rotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleHorizontalFlip = () => {
    setFlipHorizontal((prev) => !prev);
  };

  const toggleVerticalFlip = () => {
    setFlipVertical((prev) => !prev);
  };

  const switchCamera = () => {
    setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const getVideoTransform = () => {
    const scaleX = flipHorizontal ? -1 : 1;
    const scaleY = flipVertical ? -1 : 1;
    return `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();

        const orientationApi = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };

        if (orientationApi?.lock) {
          try {
            await orientationApi.lock("landscape");
          } catch {
            // Safari may ignore this
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createImageFromVideo = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return null;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const rotated = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = rotated ? sourceHeight : sourceWidth;
    canvas.height = rotated ? sourceWidth : sourceHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.drawImage(
      video,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight
    );
    ctx.restore();

    return canvas.toDataURL("image/png");
  };

  const createFrontInitialMarkers = (): Partial<Record<FrontMarkerKey, MarkerPoint>> => ({
    topLeft9: { x: 180, y: 120 },
    topRight9: { x: 520, y: 120 },
    topCenter6: { x: 350, y: 85 },
    bottomLeft6: { x: 215, y: 255 },
    bottomRight6: { x: 485, y: 255 },
  });

  const createSideInitialMarkers = (): Partial<Record<SideMarkerKey, MarkerPoint>> => ({
    sideTop9: { x: 180, y: 110 },
    sideBottom6: { x: 190, y: 260 },
  });

  const captureCurrentStep = () => {
    if (!isLandscape) return;

    const image = createImageFromVideo();
    if (!image) return;

    if (step === "frontCapture") {
      setFrontImage(image);
      setFrontDetectedMarkers(null);
      setStep("sideCapture");
      return;
    }

    if (step === "sideCapture") {
      setSideImage(image);
      setFrontMarkers(createFrontInitialMarkers());
      setSideMarkers(createSideInitialMarkers());
      setFrontView(getDefaultPanelView());
      setSideView(getDefaultPanelView());
      setFrontDetectedMarkers(null);
      setSideDetectedMarkers(null);
      setActiveCalibrationPanel("front");
      setStep("calibration");
    }
  };

  const backToFrontCapture = () => {
    setSideImage(null);
    setStep("frontCapture");
  };

  const backToSideCapture = () => {
    setSideImage(null);
    setStep("sideCapture");
  };

  const requestLevelPermission = async () => {
    try {
      if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
        setLevelPermissionState("unsupported");
        setLevelEnabled(false);
        return;
      }

      const orientationCtor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (typeof orientationCtor.requestPermission === "function") {
        const result = await orientationCtor.requestPermission();

        if (result === "granted") {
          setLevelPermissionState("granted");
          setLevelEnabled(true);
        } else {
          setLevelPermissionState("denied");
          setLevelEnabled(false);
        }
      } else {
        setLevelPermissionState("granted");
        setLevelEnabled(true);
      }
    } catch (err) {
      console.error(err);
      setLevelPermissionState("denied");
      setLevelEnabled(false);
    }
  };

  useEffect(() => {
    if (!levelEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha ?? 0;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      setAlphaDeg(alpha);
      setBetaDeg(beta);
      setGammaDeg(gamma);

      setFilteredBeta((prevFiltered) => {
        const now = performance.now();

        const nextFiltered =
          prevFiltered + (beta - prevFiltered) * betaFilterStrength;

        horizontalSamplesRef.current.push(nextFiltered);
        if (horizontalSamplesRef.current.length > horizontalSampleWindow) {
          horizontalSamplesRef.current.shift();
        }

        if (now - horizontalLastUpdateRef.current >= horizontalUpdateIntervalMs) {
          horizontalLastUpdateRef.current = now;

          const samples = horizontalSamplesRef.current;
          const avg =
            samples.reduce((sum, value) => sum + value, 0) /
            Math.max(samples.length, 1);

          const horizontalBubbleDeg = clamp(avg, -horizontalRange, horizontalRange);
          const horizontalSnapped =
            Math.abs(horizontalBubbleDeg) <= horizontalDeadbandDeg
              ? 0
              : horizontalBubbleDeg;

          setLevelHorizontalDeg((prev) => {
            const smoothed =
              prev + (horizontalSnapped - prev) * horizontalSmoothing;

            const delta = smoothed - prev;
            const limitedDelta = clamp(
              delta,
              -horizontalMaxStepDeg,
              horizontalMaxStepDeg
            );

            return prev + limitedDelta;
          });
        }

        return nextFiltered;
      });

      let verticalSelected = 0;

      if (verticalAngleSource === "alpha") {
        verticalSelected = alpha;
      } else if (verticalAngleSource === "beta") {
        verticalSelected = beta - 90;
      } else {
        let diff = gamma - 90;

        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        if (diff < -90) diff += 180;
        if (diff > 90) diff -= 180;

        verticalSelected = diff;
      }

      const verticalFinalValue = invertVerticalAngle ? -verticalSelected : verticalSelected;
      const verticalBubbleDeg = clamp(verticalFinalValue, -verticalRange, verticalRange);
      const verticalSnapped =
        Math.abs(verticalBubbleDeg) <= verticalDeadbandDeg ? 0 : verticalBubbleDeg;

      setLevelVerticalDeg(
        (prev) => prev + (verticalSnapped - prev) * verticalSmoothing
      );
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [
    levelEnabled,
    horizontalRange,
    verticalRange,
    verticalAngleSource,
    invertVerticalAngle,
    horizontalSmoothing,
    verticalSmoothing,
    horizontalDeadbandDeg,
    verticalDeadbandDeg,
    betaFilterStrength,
    horizontalUpdateIntervalMs,
    horizontalMaxStepDeg,
    horizontalSampleWindow,
  ]);

  const getPanelRef = (target: CalibrationPanelTarget) =>
    target === "front" ? frontViewportRef.current : sideViewportRef.current;

  const getPanelView = (target: CalibrationPanelTarget) =>
    target === "front" ? frontView : sideView;

  const setPanelView = (target: CalibrationPanelTarget, view: PanelViewState) => {
    if (target === "front") {
      setFrontView(view);
    } else {
      setSideView(view);
    }
  };

  const getRelativeCoordinates = (
    clientX: number,
    clientY: number,
    target: CalibrationPanelTarget
  ): MarkerPoint | null => {
    const ref = getPanelRef(target);
    if (!ref) return null;

    const rect = ref.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getPanelView(target);

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
      return null;
    }

    const x = (localX - offsetX) / scale;
    const y = (localY - offsetY) / scale;

    return { x, y };
  };

  const handleMarkerPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    key: MarkerKey,
    target: CalibrationPanelTarget
  ) => {
    e.stopPropagation();
    setActiveCalibrationPanel(target);
    setDraggingMarker({ key, target });
  };

  const handlePanelPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    target: CalibrationPanelTarget
  ) => {
    if (draggingMarker) return;

    setActiveCalibrationPanel(target);
    const current = getPanelView(target);

    setPanningPanel({
      target,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetX: current.offsetX,
      startOffsetY: current.offsetY,
    });
  };

  const handleCalibrationPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingMarker) {
      const point = getRelativeCoordinates(
        e.clientX,
        e.clientY,
        draggingMarker.target
      );
      if (!point) return;

      if (draggingMarker.target === "front") {
        setFrontMarkers((prev) => ({
          ...prev,
          [draggingMarker.key as FrontMarkerKey]: point,
        }));
      } else {
        setSideMarkers((prev) => ({
          ...prev,
          [draggingMarker.key as SideMarkerKey]: point,
        }));
      }
      return;
    }

    if (panningPanel) {
      const dx = e.clientX - panningPanel.startClientX;
      const dy = e.clientY - panningPanel.startClientY;

      setPanelView(panningPanel.target, {
        ...getPanelView(panningPanel.target),
        offsetX: panningPanel.startOffsetX + dx,
        offsetY: panningPanel.startOffsetY + dy,
      });
    }
  };

  const handleCalibrationPointerUp = () => {
    setDraggingMarker(null);
    setPanningPanel(null);
  };

  const zoomPanel = (target: CalibrationPanelTarget, delta: number) => {
    const current = getPanelView(target);
    const nextScale = clamp(current.scale + delta, 0.5, 4);

    setPanelView(target, {
      ...current,
      scale: nextScale,
    });
  };

  const resetPanelView = (target: CalibrationPanelTarget) => {
    setPanelView(target, getDefaultPanelView());
  };

  const handlePanelWheel = (
    e: React.WheelEvent<HTMLDivElement>,
    target: CalibrationPanelTarget
  ) => {
    e.preventDefault();
    setActiveCalibrationPanel(target);

    const current = getPanelView(target);
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const nextScale = clamp(current.scale + delta, 0.5, 4);

    setPanelView(target, {
      ...current,
      scale: nextScale,
    });
  };

  const handleDetectMarkers = async () => {
    try {
      if (!cvReady) {
        setDetectStatus("OpenCV dar neužsikrovė");
        return;
      }

      if (!templateCanvasesRef.current) {
        setDetectStatus("Marker template dar neužkrautas");
        return;
      }

      if (!frontImage) {
        setDetectStatus("Nėra front nuotraukos");
        return;
      }

      setDetectStatus("Ieškau markerių...");

      const frontCanvas = await imageUrlToCanvas(frontImage);
      const detectedFront = detectFrontMarkers(frontCanvas, templateCanvasesRef.current);

      setFrontDetectedMarkers(detectedFront);

      const nextFrontMarkers: Partial<Record<FrontMarkerKey, MarkerPoint>> = {
        ...(detectedFront.topLeft9 ? { topLeft9: detectedFront.topLeft9 } : {}),
        ...(detectedFront.topRight9 ? { topRight9: detectedFront.topRight9 } : {}),
        ...(detectedFront.topCenter6 ? { topCenter6: detectedFront.topCenter6 } : {}),
        ...(detectedFront.bottomLeft6 ? { bottomLeft6: detectedFront.bottomLeft6 } : {}),
        ...(detectedFront.bottomRight6 ? { bottomRight6: detectedFront.bottomRight6 } : {}),
      };

      if (Object.keys(nextFrontMarkers).length > 0) {
        setFrontMarkers((prev) => ({
          ...prev,
          ...nextFrontMarkers,
        }));
      }

      if (sideImage) {
        const sideCanvas = await imageUrlToCanvas(sideImage);
        const detectedSide = detectSideMarkers(sideCanvas, {
          big: templateCanvasesRef.current.big,
          bottom: templateCanvasesRef.current.bottom,
        });

        setSideDetectedMarkers(detectedSide);

        const nextSideMarkers: Partial<Record<SideMarkerKey, MarkerPoint>> = {
          ...(detectedSide.sideTop9 ? { sideTop9: detectedSide.sideTop9 } : {}),
          ...(detectedSide.sideBottom6 ? { sideBottom6: detectedSide.sideBottom6 } : {}),
        };

        if (Object.keys(nextSideMarkers).length > 0) {
          setSideMarkers((prev) => ({
            ...prev,
            ...nextSideMarkers,
          }));
        }
      }

      setDetectStatus("Markeriai aptikti");
    } catch (err) {
      console.error(err);
      setDetectStatus("Markerių aptikimas nepavyko");
    }
  };

  const resetSettings = () => {
    const keys = [
      "vc_rotation",
      "vc_flipHorizontal",
      "vc_flipVertical",
      "vc_horizontalTolerance",
      "vc_verticalTolerance",
      "vc_horizontalRange",
      "vc_verticalRange",
      "vc_horizontalSmoothing",
      "vc_verticalSmoothing",
      "vc_horizontalDeadbandDeg",
      "vc_verticalDeadbandDeg",
      "vc_betaFilterStrength",
      "vc_horizontalUpdateIntervalMs",
      "vc_horizontalMaxStepDeg",
      "vc_horizontalSampleWindow",
      "vc_markerScale",
      "vc_markerStrokeWidth",
      "vc_showLevelUI",
      "vc_verticalAngleSource",
      "vc_invertVerticalAngle",
      "vc_activeCalibrationPanel",
    ];

    keys.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  let frontScale: number | null = null;
  if (frontMarkers.topLeft9 && frontMarkers.topRight9) {
    const dx = frontMarkers.topRight9.x - frontMarkers.topLeft9.x;
    const dy = frontMarkers.topRight9.y - frontMarkers.topLeft9.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    if (distPx > 0) {
      frontScale = 120 / distPx;
    }
  }

  const horizontalDisplayDeg = clamp(levelHorizontalDeg, -horizontalRange, horizontalRange);
  const verticalDisplayDeg = clamp(levelVerticalDeg, -verticalRange, verticalRange);

  const horizontalOffset = clamp(
    (horizontalDisplayDeg / horizontalRange) * 90,
    -90,
    90
  );

  const verticalOffset = clamp(
    (verticalDisplayDeg / verticalRange) * 90,
    -90,
    90
  );

  const horizontalOk = Math.abs(horizontalDisplayDeg) <= horizontalTolerance;
  const verticalOk = Math.abs(verticalDisplayDeg) <= verticalTolerance;

  const frontDimmed = step === "calibration" && activeCalibrationPanel !== "front";
  const sideDimmed = step === "calibration" && activeCalibrationPanel !== "side";

  const renderDebugDot = (point?: MarkerPoint, color = "#00e5ff") => {
    if (!point) return null;

    return (
      <div
        style={{
          position: "absolute",
          left: `${point.x - 6}px`,
          top: `${point.y - 6}px`,
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: color,
          border: "2px solid white",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      />
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img
            src={logoImage}
            alt="Regos priežiūra logo"
            className="brand-logo-image"
          />
          <div className="brand-text">
            <div>VisuCareM</div>
            <div>POSITION OF WEAR</div>
          </div>
        </div>

        <div className="title">
          {step === "frontCapture" && "FRONT PHOTO"}
          {step === "sideCapture" && "SIDE PHOTO"}
          {step === "calibration" && "CALIBRATION"}
        </div>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            {isFullscreen ? "⤢" : "⛶"}
          </button>

          <button
            className="icon-btn"
            type="button"
            onClick={switchCamera}
            title="Switch front/back camera"
          >
            ⇄
          </button>

          <button
            className={`icon-btn ${showSettings ? "active-btn" : ""}`}
            type="button"
            title="Settings"
            onClick={() => setShowSettings((prev) => !prev)}
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="viewer">
        {!isLandscape && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.82)",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              textAlign: "center",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔄 Pasukite iPad</div>
            <div style={{ fontSize: "18px", opacity: 0.9 }}>
              Naudokite LANDSCAPE režimą
            </div>
          </div>
        )}

        {step !== "calibration" && (
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            style={{ transform: getVideoTransform() }}
          />
        )}

        {step !== "calibration" && showLevelUI && (
          <div className="cross-level-ui">
            <div className="cross-level-horizontal-slot" />
            <div className="cross-level-vertical-slot" />

            <div
              className="cross-level-bubble cross-level-bubble-horizontal"
              style={{
                transform: `translate(calc(-50% + ${horizontalOffset}px), -50%)`,
                background: horizontalOk ? "#19c15a" : "#d61f1f",
              }}
            />

            <div
              className="cross-level-bubble cross-level-bubble-vertical"
              style={{
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px))`,
                background: verticalOk ? "#19c15a" : "#d61f1f",
              }}
            />

            <div className="cross-level-center-dot" />

            <div className="cross-level-readout">
              <div>H: {horizontalDisplayDeg.toFixed(1)}°</div>
              <div>V: {verticalDisplayDeg.toFixed(1)}°</div>
            </div>
          </div>
        )}

        {step === "frontCapture" && (
          <>
            <div className="front-capture-overlay">
              <div className="front-dim front-dim-left" />
              <div className="front-dim front-dim-right" />

              <div className="front-clear-window">
                <div className="front-dashed front-dashed-left" />
                <div className="front-dashed front-dashed-right" />
              </div>
            </div>

            <div className="overlay">
              {isLandscape && (
                <button
                  className="capture-btn"
                  aria-label="Take front photo"
                  type="button"
                  onClick={captureCurrentStep}
                />
              )}

              {!isCameraOn && !error && (
                <div className="camera-status">Jungiama kamera...</div>
              )}

              {error && <div className="camera-status error">{error}</div>}
            </div>

            <div className="bottom-panel">
              <div className="instruction">
                <div className="instruction-title">Capture FRONT</div>
                <div className="instruction-text">
                  Align the face inside the clear window between the dashed lines.
                </div>
              </div>

              <div className="mini-brand">VC</div>
            </div>
          </>
        )}

        {step === "sideCapture" && (
          <>
            <div className="overlay">
              {isLandscape && (
                <button
                  className="capture-btn"
                  aria-label="Take side photo"
                  type="button"
                  onClick={captureCurrentStep}
                />
              )}

              <button
                className="side-back-btn"
                type="button"
                onClick={backToFrontCapture}
              >
                Back
              </button>

              {!isCameraOn && !error && (
                <div className="camera-status">Jungiama kamera...</div>
              )}

              {error && <div className="camera-status error">{error}</div>}
            </div>

            <div className="bottom-panel">
              <div className="instruction">
                <div className="instruction-title">Capture SIDE</div>
                <div className="instruction-text">
                  Take the side photo. Calibration will start after this step.
                </div>
              </div>

              <div className="mini-brand">VC</div>
            </div>
          </>
        )}

        {step === "calibration" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "10px",
              padding: "10px",
              background: "#101010",
              zIndex: 30,
            }}
            onPointerMove={handleCalibrationPointerMove}
            onPointerUp={handleCalibrationPointerUp}
            onPointerLeave={handleCalibrationPointerUp}
          >
            <div
              style={{
                position: "relative",
                background: "#1a1a1a",
                borderRadius: "14px",
                overflow: "hidden",
                opacity: frontDimmed ? 0.35 : 1,
                transition: "opacity 0.2s ease",
                outline: activeCalibrationPanel === "front" ? "2px solid #1267d6" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 6,
                  padding: "10px 14px",
                  background: "rgba(0,0,0,0.48)",
                  color: "#fff",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>FRONT</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => setActiveCalibrationPanel("front")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => zoomPanel("front", 0.1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => zoomPanel("front", -0.1)}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => resetPanelView("front")}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div
                ref={frontViewportRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  cursor: panningPanel?.target === "front" ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={(e) => handlePanelPointerDown(e, "front")}
                onWheel={(e) => handlePanelWheel(e, "front")}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translate(${frontView.offsetX}px, ${frontView.offsetY}px) scale(${frontView.scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {frontImage && (
                    <img
                      src={frontImage}
                      alt="Front calibration"
                      draggable={false}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#111",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                  )}

                  {renderDebugDot(frontDetectedMarkers?.topLeft9)}
                  {renderDebugDot(frontDetectedMarkers?.topRight9)}
                  {renderDebugDot(frontDetectedMarkers?.topCenter6)}
                  {renderDebugDot(frontDetectedMarkers?.bottomLeft6)}
                  {renderDebugDot(frontDetectedMarkers?.bottomRight6)}

                  {frontMarkerDefs.map((marker) => {
                    const point = frontMarkers[marker.key as FrontMarkerKey];
                    if (!point) return null;

                    return (
                      <div
                        key={marker.key}
                        className="svg-marker"
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`,
                          width: `${marker.size * markerScale}px`,
                          height: `${marker.size * markerScale}px`,
                        }}
                        onPointerDown={(e) =>
                          handleMarkerPointerDown(e, marker.key, "front")
                        }
                        title={marker.label}
                      >
                        <img src={marker.svg} alt={marker.label} draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                background: "#1a1a1a",
                borderRadius: "14px",
                overflow: "hidden",
                opacity: sideDimmed ? 0.35 : 1,
                transition: "opacity 0.2s ease",
                outline: activeCalibrationPanel === "side" ? "2px solid #1267d6" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 6,
                  padding: "10px 14px",
                  background: "rgba(0,0,0,0.48)",
                  color: "#fff",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>SIDE</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => setActiveCalibrationPanel("side")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => zoomPanel("side", 0.1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => zoomPanel("side", -0.1)}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => resetPanelView("side")}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div
                ref={sideViewportRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  cursor: panningPanel?.target === "side" ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={(e) => handlePanelPointerDown(e, "side")}
                onWheel={(e) => handlePanelWheel(e, "side")}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translate(${sideView.offsetX}px, ${sideView.offsetY}px) scale(${sideView.scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {sideImage && (
                    <img
                      src={sideImage}
                      alt="Side calibration"
                      draggable={false}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#111",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    />
                  )}

                  {renderDebugDot(sideDetectedMarkers?.sideTop9, "#7CFF6B")}
                  {renderDebugDot(sideDetectedMarkers?.sideBottom6, "#7CFF6B")}

                  {sideMarkerDefs.map((marker) => {
                    const point = sideMarkers[marker.key as SideMarkerKey];
                    if (!point) return null;

                    return (
                      <div
                        key={marker.key}
                        className="svg-marker"
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`,
                          width: `${marker.size * markerScale}px`,
                          height: `${marker.size * markerScale}px`,
                        }}
                        onPointerDown={(e) =>
                          handleMarkerPointerDown(e, marker.key, "side")
                        }
                        title={marker.label}
                      >
                        <img src={marker.svg} alt={marker.label} draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: 10,
                right: 10,
                bottom: 10,
                zIndex: 50,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                className="toolbar-btn"
                type="button"
                onClick={backToSideCapture}
              >
                Retake Side
              </button>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  className="toolbar-btn"
                  type="button"
                  onClick={handleDetectMarkers}
                >
                  Detect markers
                </button>

                <div
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    color: "#111",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {frontScale
                    ? `Front scale: ${frontScale.toFixed(3)} mm/px`
                    : "Front scale: n/a"}
                </div>

                {detectStatus && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "#111",
                      padding: "12px 16px",
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    {detectStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <aside className="settings-panel">
            <div className="settings-title">Settings</div>

            <div className="settings-group">
              <label className="settings-label">General</label>
              <div className="settings-summary">Step: {step}</div>
              <div className="settings-summary">
                Camera: {cameraFacingMode === "user" ? "Front camera" : "Back camera"}
              </div>
              <div className="settings-summary">Rotation: {rotation}°</div>
              <div className="settings-summary">
                Horizontal flip: {flipHorizontal ? "ON" : "OFF"}
              </div>
              <div className="settings-summary">
                Vertical flip: {flipVertical ? "ON" : "OFF"}
              </div>
              <div className="settings-summary">
                Permission: {levelPermissionState}
              </div>
              <div className="settings-summary">
                OpenCV: {cvReady ? "READY" : "loading..."}
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">General controls</label>

              <div className="transform-controls">
                <button type="button" className="settings-btn" onClick={rotate90}>
                  Rotate 90°
                </button>

                <button
                  type="button"
                  className={`settings-btn ${flipHorizontal ? "settings-btn-active" : ""}`}
                  onClick={toggleHorizontalFlip}
                >
                  Flip H
                </button>

                <button
                  type="button"
                  className={`settings-btn ${flipVertical ? "settings-btn-active" : ""}`}
                  onClick={toggleVerticalFlip}
                >
                  Flip V
                </button>
              </div>

              <div className="toggle-row">
                <button
                  type="button"
                  className={`settings-btn ${showLevelUI ? "settings-btn-active" : ""}`}
                  onClick={() => setShowLevelUI((prev) => !prev)}
                >
                  {showLevelUI ? "Hide level UI" : "Show level UI"}
                </button>

                <button
                  type="button"
                  className={`settings-btn ${levelEnabled ? "settings-btn-active" : ""}`}
                  onClick={requestLevelPermission}
                >
                  Enable live level
                </button>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Horizontal bubble</label>
              <div className="settings-summary">Raw source: beta</div>
              <div className="settings-summary">Raw beta: {betaDeg.toFixed(1)}°</div>
              <div className="settings-summary">Filtered beta: {filteredBeta.toFixed(2)}°</div>
              <div className="settings-summary">Current H bubble: {levelHorizontalDeg.toFixed(1)}°</div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H tolerance</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={horizontalTolerance}
                  onChange={(e) => setHorizontalTolerance(Number(e.target.value))}
                />
                <div className="tolerance-value">±{horizontalTolerance}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H full scale</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={horizontalRange}
                  onChange={(e) => setHorizontalRange(Number(e.target.value))}
                />
                <div className="tolerance-value">±{horizontalRange}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H smoothing</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.02"
                  max="0.5"
                  step="0.01"
                  value={horizontalSmoothing}
                  onChange={(e) => setHorizontalSmoothing(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalSmoothing.toFixed(2)}</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H deadband</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={horizontalDeadbandDeg}
                  onChange={(e) => setHorizontalDeadbandDeg(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalDeadbandDeg.toFixed(1)}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H beta pre-filter</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.02"
                  max="0.3"
                  step="0.01"
                  value={betaFilterStrength}
                  onChange={(e) => setBetaFilterStrength(Number(e.target.value))}
                />
                <div className="tolerance-value">{betaFilterStrength.toFixed(2)}</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H update interval</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="16"
                  max="120"
                  step="1"
                  value={horizontalUpdateIntervalMs}
                  onChange={(e) => setHorizontalUpdateIntervalMs(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalUpdateIntervalMs} ms</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H max step</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={horizontalMaxStepDeg}
                  onChange={(e) => setHorizontalMaxStepDeg(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalMaxStepDeg.toFixed(2)}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">H sample window</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={horizontalSampleWindow}
                  onChange={(e) => setHorizontalSampleWindow(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalSampleWindow}</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Vertical bubble</label>
              <div className="settings-summary">Raw alpha: {alphaDeg.toFixed(1)}°</div>
              <div className="settings-summary">Raw beta: {betaDeg.toFixed(1)}°</div>
              <div className="settings-summary">Raw gamma: {gammaDeg.toFixed(1)}°</div>
              <div className="settings-summary">Selected source: {verticalAngleSource}</div>
              <div className="settings-summary">Current V bubble: {levelVerticalDeg.toFixed(1)}°</div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Vertical source</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`settings-btn ${verticalAngleSource === "alpha" ? "settings-btn-active" : ""}`}
                  onClick={() => setVerticalAngleSource("alpha")}
                >
                  alpha
                </button>

                <button
                  type="button"
                  className={`settings-btn ${verticalAngleSource === "beta" ? "settings-btn-active" : ""}`}
                  onClick={() => setVerticalAngleSource("beta")}
                >
                  beta
                </button>

                <button
                  type="button"
                  className={`settings-btn ${verticalAngleSource === "gamma" ? "settings-btn-active" : ""}`}
                  onClick={() => setVerticalAngleSource("gamma")}
                >
                  gamma
                </button>
              </div>

              <div className="toggle-row" style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className={`settings-btn ${invertVerticalAngle ? "settings-btn-active" : ""}`}
                  onClick={() => setInvertVerticalAngle((prev) => !prev)}
                >
                  {invertVerticalAngle ? "Invert ON" : "Invert OFF"}
                </button>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">V tolerance</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={verticalTolerance}
                  onChange={(e) => setVerticalTolerance(Number(e.target.value))}
                />
                <div className="tolerance-value">±{verticalTolerance}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">V full scale</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={verticalRange}
                  onChange={(e) => setVerticalRange(Number(e.target.value))}
                />
                <div className="tolerance-value">±{verticalRange}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">V smoothing</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.02"
                  max="0.5"
                  step="0.01"
                  value={verticalSmoothing}
                  onChange={(e) => setVerticalSmoothing(Number(e.target.value))}
                />
                <div className="tolerance-value">{verticalSmoothing.toFixed(2)}</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">V deadband</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={verticalDeadbandDeg}
                  onChange={(e) => setVerticalDeadbandDeg(Number(e.target.value))}
                />
                <div className="tolerance-value">{verticalDeadbandDeg.toFixed(1)}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Calibration / markers</label>
              <div className="settings-summary">
                Front scale: {frontScale ? `${frontScale.toFixed(3)} mm/px` : "Need calibration"}
              </div>
              <div className="settings-summary">
                Active panel: {activeCalibrationPanel}
              </div>
              <div className="settings-summary">
                Detect status: {detectStatus || "-"}
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Marker size</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.6"
                  max="2"
                  step="0.1"
                  value={markerScale}
                  onChange={(e) => setMarkerScale(Number(e.target.value))}
                />
                <div className="tolerance-value">{markerScale.toFixed(1)}x</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Marker line width</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={markerStrokeWidth}
                  onChange={(e) => setMarkerStrokeWidth(Number(e.target.value))}
                />
                <div className="tolerance-value">{markerStrokeWidth.toFixed(1)}x</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Stored settings</label>
              <button type="button" className="settings-btn" onClick={resetSettings}>
                Reset saved settings
              </button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}