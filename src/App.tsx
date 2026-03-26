import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoImage from "./img/regos-prieziuros-logotipas.png";
import marker9top from "./assets/markers/marker9top.svg";
import marker6bottom from "./assets/markers/marker6bottom.svg";
import marker6center from "./assets/markers/marker6center.svg";

type ViewMode = "front" | "side";

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
};

const frontMarkerDefs: MarkerDef[] = [
  { key: "topLeft9", label: "Top left 9 mm", svg: marker9top, size: 54 },
  { key: "topRight9", label: "Top right 9 mm", svg: marker9top, size: 54 },
  { key: "topCenter6", label: "Top center 6 mm", svg: marker6center, size: 42 },
  { key: "bottomLeft6", label: "Bottom left 6 mm", svg: marker6bottom, size: 42 },
  { key: "bottomRight6", label: "Bottom right 6 mm", svg: marker6bottom, size: 42 },
];

const sideMarkerDefs: MarkerDef[] = [
  { key: "sideTop9", label: "Side top 9 mm", svg: marker9top, size: 54 },
  { key: "sideBottom6", label: "Side bottom 6 mm", svg: marker6bottom, size: 42 },
];

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("front");
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">(
    "user"
  );

  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [angleTolerance, setAngleTolerance] = useState(5);

  const [markerScale, setMarkerScale] = useState(1);
  const [markerStrokeWidth, setMarkerStrokeWidth] = useState(1);

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);

  const [frontMarkers, setFrontMarkers] = useState<
    Partial<Record<FrontMarkerKey, MarkerPoint>>
  >({});
  const [sideMarkers, setSideMarkers] = useState<
    Partial<Record<SideMarkerKey, MarkerPoint>>
  >({});

  const [draggingMarker, setDraggingMarker] = useState<MarkerKey | null>(null);

  const [showLevelUI, setShowLevelUI] = useState(true);
  const [levelPermissionState, setLevelPermissionState] = useState<
    "idle" | "granted" | "denied" | "unsupported"
  >("idle");
  const [levelEnabled, setLevelEnabled] = useState(false);
  const [levelX, setLevelX] = useState(0);
  const [levelY, setLevelY] = useState(0);

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
    startCamera();

    return () => {
      stopCamera();
    };
  }, [cameraFacingMode]);

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
    topLeft9: { x: 200, y: 140 },
    topRight9: { x: 520, y: 140 },
    topCenter6: { x: 360, y: 95 },
    bottomLeft6: { x: 230, y: 235 },
    bottomRight6: { x: 490, y: 235 },
  });

  const createSideInitialMarkers = (): Partial<Record<SideMarkerKey, MarkerPoint>> => ({
    sideTop9: { x: 380, y: 135 },
    sideBottom6: { x: 390, y: 250 },
  });

  const captureCurrentView = () => {
    const image = createImageFromVideo();
    if (!image) return;

    if (viewMode === "front") {
      setFrontImage(image);
      setFrontMarkers(createFrontInitialMarkers());
    } else {
      setSideImage(image);
      setSideMarkers(createSideInitialMarkers());
    }
  };

  const clearCurrentImage = () => {
    if (viewMode === "front") {
      setFrontImage(null);
      setFrontMarkers({});
    } else {
      setSideImage(null);
      setSideMarkers({});
    }

    setDraggingMarker(null);
  };

  const getCurrentImage = () => {
    return viewMode === "front" ? frontImage : sideImage;
  };

  const getCurrentMarkerDefs = () => {
    return viewMode === "front" ? frontMarkerDefs : sideMarkerDefs;
  };

  const getCurrentMarkers = () => {
    return viewMode === "front" ? frontMarkers : sideMarkers;
  };

  const setCurrentMarkers = (updater: any) => {
    if (viewMode === "front") {
      setFrontMarkers(updater);
    } else {
      setSideMarkers(updater);
    }
  };

  const getImageRelativeCoordinates = (
    clientX: number,
    clientY: number
  ): MarkerPoint | null => {
    const img = imageRef.current;
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    return { x, y };
  };

  const handleMarkerPointerDown = (key: MarkerKey) => {
    setDraggingMarker(key);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingMarker) return;

    const point = getImageRelativeCoordinates(e.clientX, e.clientY);
    if (!point) return;

    setCurrentMarkers((prev: any) => ({
      ...prev,
      [draggingMarker]: point,
    }));
  };

  const handlePointerUp = () => {
    setDraggingMarker(null);
  };

  const requestLevelPermission = async () => {
    try {
      const maybeIOS = (
        DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<"granted" | "denied">;
        }
      );

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

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      setLevelX(gamma);
      setLevelY(beta);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [levelEnabled]);

  const currentImage = getCurrentImage();
  const currentMarkers = getCurrentMarkers();
  const currentMarkerDefs = getCurrentMarkerDefs();

  let frontScale: number | null = null;
  if (frontMarkers.topLeft9 && frontMarkers.topRight9) {
    const dx = frontMarkers.topRight9.x - frontMarkers.topLeft9.x;
    const dy = frontMarkers.topRight9.y - frontMarkers.topLeft9.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    if (distPx > 0) {
      frontScale = 120 / distPx;
    }
  }

  const horizontalOk = Math.abs(levelX) <= angleTolerance;
  const verticalOk = Math.abs(levelY) <= angleTolerance;

  const horizontalOffset = Math.max(-60, Math.min(60, levelX * 2.5));
  const verticalOffset = Math.max(-60, Math.min(60, levelY * 1.2));

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
          {viewMode === "front" ? "FRONT PHOTO" : "SIDE PHOTO"}
        </div>

        <div className="topbar-actions">
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
        {!currentImage && (
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            style={{ transform: getVideoTransform() }}
          />
        )}

        {showLevelUI && !currentImage && (
          <>
            <div className="level-horizontal">
              <div
                className={`level-bubble ${horizontalOk ? "level-ok" : ""}`}
                style={{ transform: `translateX(${horizontalOffset}px)` }}
              />
            </div>

            <div className="level-vertical">
              <div
                className={`level-bubble ${verticalOk ? "level-ok" : ""}`}
                style={{ transform: `translateY(${verticalOffset}px)` }}
              />
            </div>

            <div className="level-readout">
              <div>H: {levelX.toFixed(1)}°</div>
              <div>V: {levelY.toFixed(1)}°</div>
            </div>
          </>
        )}

        {currentImage && (
          <div
            className="captured-fullscreen"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={currentImage}
              alt="Captured frame"
              className="captured-image-full"
            />

            {currentMarkerDefs.map((marker) => {
              const point = (currentMarkers as any)[marker.key];
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
                  onPointerDown={() => handleMarkerPointerDown(marker.key)}
                  title={marker.label}
                >
                  <img
                    src={marker.svg}
                    alt={marker.label}
                    draggable={false}
                    style={{
                      opacity: 1,
                      filter: `drop-shadow(0 0 0 rgba(0,0,0,0))`,
                    }}
                  />
                </div>
              );
            })}

            <div className="captured-toolbar">
              <button
                className="toolbar-btn"
                type="button"
                onClick={clearCurrentImage}
              >
                Retake
              </button>

              {viewMode === "front" && (
                <button
                  className="toolbar-btn primary-btn"
                  type="button"
                  onClick={() => setViewMode("side")}
                >
                  Next: Side
                </button>
              )}

              {viewMode === "side" && (
                <button
                  className="toolbar-btn primary-btn"
                  type="button"
                  onClick={() => setViewMode("front")}
                >
                  Back to Front
                </button>
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <aside className="settings-panel">
            <div className="settings-title">Settings</div>

            <div className="settings-group">
              <label className="settings-label">Current mode</label>
              <div className="mode-row">
                <button
                  type="button"
                  className={`mode-btn ${
                    viewMode === "front" ? "mode-btn-active" : ""
                  }`}
                  onClick={() => setViewMode("front")}
                >
                  FRONT
                </button>
                <button
                  type="button"
                  className={`mode-btn ${
                    viewMode === "side" ? "mode-btn-active" : ""
                  }`}
                  onClick={() => setViewMode("side")}
                >
                  SIDE
                </button>
              </div>
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
              <label className="settings-label">Angle tolerance</label>
              <div className="tolerance-row">
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={angleTolerance}
                  onChange={(e) => setAngleTolerance(Number(e.target.value))}
                />
                <div className="tolerance-value">{angleTolerance}°</div>
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
                This will be wired to SVG stroke control next.
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Level UI</label>

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
                Horizontal: {levelX.toFixed(1)}°
              </div>
              <div className="settings-summary">
                Vertical: {levelY.toFixed(1)}°
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Front scale</label>
              <div className="settings-summary">
                {frontScale ? `${frontScale.toFixed(3)} mm/px` : "Need FRONT markers"}
              </div>
            </div>
          </aside>
        )}

        {!currentImage && (
          <div className="overlay">
            <button
              className="capture-btn"
              aria-label="Take photo"
              type="button"
              onClick={captureCurrentView}
            ></button>

            {!isCameraOn && !error && (
              <div className="camera-status">Jungiama kamera...</div>
            )}

            {error && <div className="camera-status error">{error}</div>}
          </div>
        )}

        {!currentImage && (
          <div className="bottom-panel">
            <div className="instruction">
              <div className="instruction-title">
                {viewMode === "front" ? "Capture FRONT" : "Capture SIDE"}
              </div>
              <div className="instruction-text">
                {viewMode === "front"
                  ? `Keep head straight within ${angleTolerance}° tolerance and take FRONT image.`
                  : "Take SIDE image for pantoscopic angle markers."}
              </div>
            </div>

            <div className="mini-brand">VC</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;