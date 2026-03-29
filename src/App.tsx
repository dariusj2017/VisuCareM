import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoImage from "./img/regos-prieziuros-logotipas.png";
import marker9top from "./assets/markers/marker9top.svg";
import marker6bottom from "./assets/markers/marker6bottom.svg";
import marker6center from "./assets/markers/marker6center.svg";

type Step = "frontCapture" | "sideCapture" | "calibration";

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

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontImageRef = useRef<HTMLImageElement | null>(null);
  const sideImageRef = useRef<HTMLImageElement | null>(null);

  const [step, setStep] = useState<Step>("frontCapture");
  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">(
    "user"
  );

  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [horizontalTolerance, setHorizontalTolerance] = useState(3);
  const [verticalTolerance, setVerticalTolerance] = useState(3);
  const [horizontalRange, setHorizontalRange] = useState(30);
  const [verticalRange, setVerticalRange] = useState(30);

  const [markerScale, setMarkerScale] = useState(1);
  const [markerStrokeWidth, setMarkerStrokeWidth] = useState(1);

  const [showLevelUI, setShowLevelUI] = useState(true);
  const [levelPermissionState, setLevelPermissionState] = useState<
    "idle" | "granted" | "denied" | "unsupported"
  >("idle");
  const [levelEnabled, setLevelEnabled] = useState(false);
  const [levelHorizontalDeg, setLevelHorizontalDeg] = useState(0);
  const [levelVerticalDeg, setLevelVerticalDeg] = useState(0);

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);

  const [frontMarkers, setFrontMarkers] = useState<
    Partial<Record<FrontMarkerKey, MarkerPoint>>
  >({});
  const [sideMarkers, setSideMarkers] = useState<
    Partial<Record<SideMarkerKey, MarkerPoint>>
  >({});

  const [draggingMarker, setDraggingMarker] = useState<{
    key: MarkerKey;
    target: "front" | "side";
  } | null>(null);

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
    const image = createImageFromVideo();
    if (!image) return;

    if (step === "frontCapture") {
      setFrontImage(image);
      setStep("sideCapture");
      return;
    }

    if (step === "sideCapture") {
      setSideImage(image);
      setFrontMarkers(createFrontInitialMarkers());
      setSideMarkers(createSideInitialMarkers());
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
      const maybeIOS = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
        setLevelPermissionState("unsupported");
        return;
      }

      if (typeof maybeIOS.requestPermission === "function") {
        const result = await maybeIOS.requestPermission();
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

    const smoothing = 0.12;

    // ------------- ORIENTACIJOS KONVERTAVIMAS Į GULŠČIUKĄ -------------
    // DeviceOrientationEvent:
    //   alpha = pasisukimas aplink ekrano normalę (kompasinis pasisukimas)
    //   beta = pasisukimas aplink įrenginio kairė/dešinė ašį (priekinis/galinis pakrypimas)
    //   gamma = pasisukimas aplink įrenginio viršus/apačią ašį (šoninis pakrypimas)
    //
    // Tvarkos:
    //   - horizontalus gulsčiukas (kryžiaus aukštyje): gamma
    //   - vertikalus gulsčiukas (kryžiaus šonuose): beta - 90 (portreto režimui)
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const alpha = event.alpha ?? 0;

      console.log(`Alpha: ${alpha.toFixed(1)}°, Beta: ${beta.toFixed(1)}°, Gamma: ${gamma.toFixed(1)}°`);

      // Horizontalus lygis: gamma ašis, statmenas ekranui.
      // 0 = iPad lygus, +/-90 = pasisukimas horizontaliai.
      const nextHorizontal = clamp(gamma, -horizontalRange, horizontalRange);

      // Vertikalus lygis: matuoti kaip beta laipsnius su 90° centru.
      // 90° = vertikaliai tiesiai, +/- 30° per kairę/dešinę.
      const nextVertical = clamp(beta, 60, 120);

      setLevelHorizontalDeg((prev) => prev + (nextHorizontal - prev) * smoothing);
      setLevelVerticalDeg((prev) => prev + (nextVertical - prev) * smoothing);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [levelEnabled, horizontalRange, verticalRange]);

  const getRelativeCoordinates = (
    clientX: number,
    clientY: number,
    target: "front" | "side"
  ): MarkerPoint | null => {
    const ref = target === "front" ? frontImageRef.current : sideImageRef.current;
    if (!ref) return null;

    const rect = ref.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    return { x, y };
  };

  const handleMarkerPointerDown = (key: MarkerKey, target: "front" | "side") => {
    setDraggingMarker({ key, target });
  };

  const handleCalibrationPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingMarker) return;

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
  };

  const handleCalibrationPointerUp = () => {
    setDraggingMarker(null);
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

  // horizontalRange/verticalRange dabar 30 (±30°)
  const horizontalOffset = (levelHorizontalDeg / horizontalRange) * 90;
  // levelVerticalDeg = 60..120, todėl atimame 90°, kad gautume -30..+30
  const verticalOffset = ((levelVerticalDeg - 90) / verticalRange) * 90;

  // Rodyti vertikalų kampą tiesiogiai (90 ± 30)
  const verticalDisplayDeg = levelVerticalDeg;
  const horizontalDisplayDeg = levelHorizontalDeg;

  const horizontalOk = Math.abs(horizontalDisplayDeg) <= horizontalTolerance;
  const verticalOk = Math.abs(verticalDisplayDeg - 90) <= verticalTolerance;

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
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px + 10px))`,
                background: verticalOk ? "#19c15a" : "#d61f1f",
              }}
            />

            <div className="cross-level-readout">
              <div>Horizontal: {horizontalDisplayDeg.toFixed(1)}°</div>
              <div>Vertical: {verticalDisplayDeg.toFixed(1)}°</div>
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
              <button
                className="capture-btn"
                aria-label="Take front photo"
                type="button"
                onClick={captureCurrentStep}
              />

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
              <button
                className="capture-btn"
                aria-label="Take side photo"
                type="button"
                onClick={captureCurrentStep}
              />

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
            className="calibration-layout"
            onPointerMove={handleCalibrationPointerMove}
            onPointerUp={handleCalibrationPointerUp}
            onPointerLeave={handleCalibrationPointerUp}
          >
            <div className="calibration-front-panel">
              <div className="panel-header">
                <span>FRONT</span>
              </div>

              <div className="calibration-image-wrap">
                {frontImage && (
                  <img
                    ref={frontImageRef}
                    src={frontImage}
                    alt="Front calibration"
                    className="calibration-image"
                  />
                )}

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
                      onPointerDown={() =>
                        handleMarkerPointerDown(marker.key, "front")
                      }
                      title={marker.label}
                    >
                      <img src={marker.svg} alt={marker.label} draggable={false} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calibration-side-panel">
              <div className="panel-header">
                <span>SIDE</span>
              </div>

              <div className="calibration-image-wrap">
                {sideImage && (
                  <img
                    ref={sideImageRef}
                    src={sideImage}
                    alt="Side calibration"
                    className="calibration-image"
                  />
                )}

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
                      onPointerDown={() =>
                        handleMarkerPointerDown(marker.key, "side")
                      }
                      title={marker.label}
                    >
                      <img src={marker.svg} alt={marker.label} draggable={false} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="calibration-toolbar">
              <button
                className="toolbar-btn"
                type="button"
                onClick={backToSideCapture}
              >
                Retake Side
              </button>

              <div className="calibration-scale-box">
                {frontScale
                  ? `Front scale: ${frontScale.toFixed(3)} mm/px`
                  : "Front scale: n/a"}
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <aside className="settings-panel">
            <div className="settings-title">Settings</div>

            <div className="settings-group">
              <label className="settings-label">Step</label>
              <div className="settings-summary">{step}</div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Camera</label>
              <div className="settings-summary">
                {cameraFacingMode === "user" ? "Front camera" : "Back camera"}
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">View transform</label>

              <div className="transform-controls">
                <button type="button" className="settings-btn" onClick={rotate90}>
                  Rotate 90°
                </button>

                <button
                  type="button"
                  className={`settings-btn ${
                    flipHorizontal ? "settings-btn-active" : ""
                  }`}
                  onClick={toggleHorizontalFlip}
                >
                  Flip H
                </button>

                <button
                  type="button"
                  className={`settings-btn ${
                    flipVertical ? "settings-btn-active" : ""
                  }`}
                  onClick={toggleVerticalFlip}
                >
                  Flip V
                </button>
              </div>

              <div className="settings-summary">Rotation: {rotation}°</div>
              <div className="settings-summary">
                Horizontal flip: {flipHorizontal ? "ON" : "OFF"}
              </div>
              <div className="settings-summary">
                Vertical flip: {flipVertical ? "ON" : "OFF"}
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Horizontal tolerance</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={horizontalTolerance}
                  onChange={(e) => setHorizontalTolerance(Number(e.target.value))}
                />
                <div className="tolerance-value">{horizontalTolerance}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Vertical tolerance</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={verticalTolerance}
                  onChange={(e) => setVerticalTolerance(Number(e.target.value))}
                />
                <div className="tolerance-value">{verticalTolerance}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Horizontal full scale</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={horizontalRange}
                  onChange={(e) => setHorizontalRange(Number(e.target.value))}
                />
                <div className="tolerance-value">±{horizontalRange}°</div>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Vertical full scale</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={verticalRange}
                  onChange={(e) => setVerticalRange(Number(e.target.value))}
                />
                <div className="tolerance-value">±{verticalRange}°</div>
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
                <div className="tolerance-value">
                  {markerStrokeWidth.toFixed(1)}x
                </div>
              </div>
              <div className="settings-hint">
                Future-ready UI for SVG stroke control.
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Level UI</label>

              <div className="toggle-row">
                <button
                  type="button"
                  className={`settings-btn ${
                    showLevelUI ? "settings-btn-active" : ""
                  }`}
                  onClick={() => setShowLevelUI((prev) => !prev)}
                >
                  {showLevelUI ? "Hide level UI" : "Show level UI"}
                </button>

                <button
                  type="button"
                  className={`settings-btn ${
                    levelEnabled ? "settings-btn-active" : ""
                  }`}
                  onClick={requestLevelPermission}
                >
                  Enable live level
                </button>
              </div>

              <div className="settings-summary">
                Permission: {levelPermissionState}
              </div>
              <div className="settings-summary">
                Horizontal: {levelHorizontalDeg.toFixed(1)}°
              </div>
              <div className="settings-summary">
                Vertical: {levelVerticalDeg.toFixed(1)}°
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Front scale</label>
              <div className="settings-summary">
                {frontScale ? `${frontScale.toFixed(3)} mm/px` : "Need calibration"}
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}