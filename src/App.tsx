import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoImage from "./img/regos-prieziuros-logotipas.png";

type MarkerKey =
  | "bottomLeft9"
  | "bottomRight9"
  | "topCenterRaised6"
  | "wrapLeft6"
  | "wrapRight6";

type MarkerPoint = {
  x: number;
  y: number;
};

type MarkerVisualType =
  | "marker9"
  | "marker6Bottom"
  | "marker6TopRaised";

type BasePointKey =
  | "frameCenter"
  | "leftReference"
  | "rightReference"
  | "bridgeReference"
  | "pupilLeft"
  | "pupilRight";

const markerOrder: MarkerKey[] = [
  "bottomLeft9",
  "bottomRight9",
  "topCenterRaised6",
  "wrapLeft6",
  "wrapRight6",
];

const markerLabels: Record<MarkerKey, string> = {
  bottomLeft9: "Bottom left 9 mm",
  bottomRight9: "Bottom right 9 mm",
  topCenterRaised6: "Top raised center marker",
  wrapLeft6: "Bottom left 6 mm",
  wrapRight6: "Bottom right 6 mm",
};

const markerTypeMap: Record<MarkerKey, MarkerVisualType> = {
  bottomLeft9: "marker9",
  bottomRight9: "marker9",
  topCenterRaised6: "marker6TopRaised",
  wrapLeft6: "marker6Bottom",
  wrapRight6: "marker6Bottom",
};

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedImageRef = useRef<HTMLImageElement | null>(null);

  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [angleTolerance, setAngleTolerance] = useState(5);

  const [basePoints, setBasePoints] = useState<Record<BasePointKey, boolean>>({
    frameCenter: true,
    leftReference: true,
    rightReference: true,
    bridgeReference: true,
    pupilLeft: true,
    pupilRight: true,
  });

  const [markers, setMarkers] = useState<Partial<Record<MarkerKey, MarkerPoint>>>(
    {}
  );
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0);
  const [draggingMarker, setDraggingMarker] = useState<MarkerKey | null>(null);

  const startCamera = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
    } catch (err) {
      setError("Nepavyko įjungti kameros. Patikrink naršyklės leidimus.");
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

  const rotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleHorizontalFlip = () => {
    setFlipHorizontal((prev) => !prev);
  };

  const toggleVerticalFlip = () => {
    setFlipVertical((prev) => !prev);
  };

  const getVideoTransform = () => {
    const scaleX = flipHorizontal ? -1 : 1;
    const scaleY = flipVertical ? -1 : 1;
    return `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
  };

  const takePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const rotated = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = rotated ? sourceHeight : sourceWidth;
    canvas.height = rotated ? sourceWidth : sourceHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const imageDataUrl = canvas.toDataURL("image/png");
    setCapturedImage(imageDataUrl);
    setMarkers({});
    setCurrentMarkerIndex(0);
  };

  const closeCapturedImage = () => {
    setCapturedImage(null);
    setMarkers({});
    setCurrentMarkerIndex(0);
    setDraggingMarker(null);
  };

  const toggleBasePoint = (key: BasePointKey) => {
    setBasePoints((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getImageRelativeCoordinates = (
    clientX: number,
    clientY: number
  ): MarkerPoint | null => {
    const img = capturedImageRef.current;
    if (!img) return null;

    const rect = img.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    return { x, y };
  };

  const handleCapturedImageClick = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    const point = getImageRelativeCoordinates(e.clientX, e.clientY);
    if (!point) return;

    const key = markerOrder[currentMarkerIndex];
    if (!key) return;

    setMarkers((prev) => ({
      ...prev,
      [key]: point,
    }));

    if (currentMarkerIndex < markerOrder.length - 1) {
      setCurrentMarkerIndex((prev) => prev + 1);
    }
  };

  const handleMarkerPointerDown = (key: MarkerKey) => {
    setDraggingMarker(key);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingMarker) return;

    const point = getImageRelativeCoordinates(e.clientX, e.clientY);
    if (!point) return;

    setMarkers((prev) => ({
      ...prev,
      [draggingMarker]: point,
    }));
  };

  const handlePointerUp = () => {
    setDraggingMarker(null);
  };

  let scale: number | null = null;
  if (markers.bottomLeft9 && markers.bottomRight9) {
    const dx = markers.bottomRight9.x - markers.bottomLeft9.x;
    const dy = markers.bottomRight9.y - markers.bottomLeft9.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    if (distPx > 0) {
      scale = 120 / distPx;
    }
  }

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

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

        <div className="title">FRONT PHOTO</div>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={rotate90}
            title="Rotate 90°"
          >
            ↻
          </button>

          <button
            className={`icon-btn ${flipHorizontal ? "active-btn" : ""}`}
            type="button"
            onClick={toggleHorizontalFlip}
            title="Flip horizontal"
          >
            H
          </button>

          <button
            className={`icon-btn ${flipVertical ? "active-btn" : ""}`}
            type="button"
            onClick={toggleVerticalFlip}
            title="Flip vertical"
          >
            V
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
        {!capturedImage && (
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            style={{ transform: getVideoTransform() }}
          />
        )}

        {capturedImage && (
          <div
            className="captured-fullscreen"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              ref={capturedImageRef}
              src={capturedImage}
              alt="Captured frame"
              className="captured-image-full"
              onClick={handleCapturedImageClick}
            />

            {Object.entries(markers).map(([key, point]) => {
              const typedKey = key as MarkerKey;
              const markerType = markerTypeMap[typedKey];

              return (
                <div
                  key={typedKey}
                  className={`program-marker ${markerType}`}
                  style={{
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                  }}
                  onPointerDown={() => handleMarkerPointerDown(typedKey)}
                  title={markerLabels[typedKey]}
                >
                  {markerType === "marker9" && (
                    <>
                      <div className="program-marker-ring" />
                      <div className="program-marker-inner-circle marker9-inner" />
                    </>
                  )}

                  {markerType === "marker6Bottom" && (
                    <div className="marker6-bottom-shape">
                      <div className="marker6-bottom-quarter q1" />
                      <div className="marker6-bottom-quarter q2" />
                      <div className="marker6-bottom-quarter q3" />
                      <div className="marker6-bottom-quarter q4" />
                    </div>
                  )}

                  {markerType === "marker6TopRaised" && (
                    <div className="marker6-top-shape">
                      <div className="marker6-top-quarter q1" />
                      <div className="marker6-top-quarter q2" />
                      <div className="marker6-top-quarter q3" />
                      <div className="marker6-top-quarter q4" />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="marker-instruction">
              Place:{" "}
              {markerOrder[currentMarkerIndex]
                ? markerLabels[markerOrder[currentMarkerIndex]]
                : "Done"}
            </div>

            {scale && (
              <div className="scale-info">Scale: {scale.toFixed(3)} mm/px</div>
            )}

            <div className="captured-toolbar">
              <button
                className="toolbar-btn"
                type="button"
                onClick={closeCapturedImage}
              >
                Retake
              </button>

              <a
                href={capturedImage}
                download="visucarem-photo.png"
                className="toolbar-btn primary-btn"
              >
                Save
              </a>
            </div>
          </div>
        )}

        {showSettings && (
          <aside className="settings-panel">
            <div className="settings-title">Settings</div>

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
              <label className="settings-label">Base points to search</label>

              <div className="checkbox-list">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.frameCenter}
                    onChange={() => toggleBasePoint("frameCenter")}
                  />
                  <span>Frame center</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.leftReference}
                    onChange={() => toggleBasePoint("leftReference")}
                  />
                  <span>Left reference point</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.rightReference}
                    onChange={() => toggleBasePoint("rightReference")}
                  />
                  <span>Right reference point</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.bridgeReference}
                    onChange={() => toggleBasePoint("bridgeReference")}
                  />
                  <span>Bridge reference</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.pupilLeft}
                    onChange={() => toggleBasePoint("pupilLeft")}
                  />
                  <span>Left pupil</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={basePoints.pupilRight}
                    onChange={() => toggleBasePoint("pupilRight")}
                  />
                  <span>Right pupil</span>
                </label>
              </div>
            </div>
          </aside>
        )}

        {!capturedImage && (
          <div className="overlay">
            <div className="glasses-guide">
              <div className="top-line"></div>

              <div className="left-marker marker">
                <div className="marker-inner"></div>
              </div>

              <div className="center-marker marker black"></div>

              <div className="right-marker marker">
                <div className="marker-inner"></div>
              </div>

              <div className="left-leg"></div>
              <div className="right-leg"></div>
            </div>

            <div className="nose-target">
              <div className="cross horizontal"></div>
              <div className="cross vertical"></div>
              <div className="cross-dot"></div>
            </div>

            <button
              className="capture-btn"
              aria-label="Take photo"
              type="button"
              onClick={takePhoto}
            ></button>

            {!isCameraOn && !error && (
              <div className="camera-status">Jungiama kamera...</div>
            )}

            {error && <div className="camera-status error">{error}</div>}
          </div>
        )}

        {!capturedImage && (
          <div className="bottom-panel">
            <div className="mini-target">
              <div className="mini-h"></div>
              <div className="mini-v"></div>
              <div className="mini-dot"></div>
            </div>

            <div className="instruction">
              <div className="instruction-title">Centered!</div>
              <div className="instruction-text">
                Keep head straight within {angleTolerance}° tolerance and press
                the photo button.
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