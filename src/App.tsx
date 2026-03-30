import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoImage from "./img/regos-prieziuros-logotipas.png";
import marker9top from "./assets/markers/marker9top.svg";
import marker6bottom from "./assets/markers/marker6bottom.svg";
import marker6center from "./assets/markers/marker6center.svg";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"frontCapture" | "sideCapture" | "calibration">("frontCapture");
  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");

  // 🔧 FIX TS – paliekam tik naudojamus
  const [flipHorizontal, setFlipHorizontal] = useState(true);

  // 🔧 Gulsčiukas
  const [verticalTolerance] = useState(5);
  const [verticalRange] = useState(15);
  const [levelVerticalDeg, setLevelVerticalDeg] = useState(0);
  const [levelEnabled] = useState(true);

  // 🆕 Landscape kontrolė
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const check = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 🎥 Kamera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      setIsCameraOn(true);
    } catch {
      setError("Nepavyko įjungti kameros");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraFacingMode]);

  // 🔥 GULSČIUKAS – TEISINGAS FIX
  useEffect(() => {
    if (!levelEnabled) return;

    const smoothing = 0.2;

    const handler = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

      const angle = screen.orientation?.angle ?? 0;

      let v = 0;

      if (angle === 0 || angle === 180) {
        v = beta - 90;
      } else {
        v = gamma;
        if (angle === 270 || angle === -90) v = -v;
      }

      v = clamp(v, -verticalRange, verticalRange);

      setLevelVerticalDeg((prev) => prev + ((-v) - prev) * smoothing);
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [levelEnabled, verticalRange]);

  const verticalOffset = clamp((levelVerticalDeg / verticalRange) * 90, -90, 90);
  const verticalOk = Math.abs(levelVerticalDeg) <= verticalTolerance;

  const capture = () => {
    if (!isLandscape) return;

    if (step === "frontCapture") setStep("sideCapture");
    else setStep("calibration");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={logoImage} className="brand-logo-image" />
        </div>

        <div className="title">{step}</div>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={() => setFlipHorizontal((p) => !p)}
          >
            Flip H
          </button>

          <button
            className="icon-btn"
            onClick={() =>
              setCameraFacingMode((p) => (p === "user" ? "environment" : "user"))
            }
          >
            ⇄
          </button>
        </div>
      </header>

      <main className="viewer">
        {/* 🆕 BLOKAS jei portrait */}
        {!isLandscape && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 28 }}>🔄 Pasukite iPad</div>
              <div>Naudokite LANDSCAPE režimą</div>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
          style={{
            transform: `scaleX(${flipHorizontal ? -1 : 1})`,
          }}
        />

        {/* GULSČIUKAS */}
        <div className="cross-level-ui">
          <div className="cross-level-vertical-slot" />

          <div
            className="cross-level-bubble cross-level-bubble-vertical"
            style={{
              transform: `translate(-50%, calc(-50% + ${verticalOffset}px))`,
              background: verticalOk ? "#19c15a" : "#d61f1f",
            }}
          />

          <div className="cross-level-center-dot" />

          <div className="cross-level-readout">
            {(-levelVerticalDeg).toFixed(1)}°
          </div>
        </div>

        {/* FOTO MYGTUKAS */}
        {isLandscape && (
          <button
            className="capture-btn"
            onClick={capture}
          />
        )}

        {!isCameraOn && !error && (
          <div className="camera-status">Jungiama kamera...</div>
        )}

        {error && <div className="camera-status error">{error}</div>}
      </main>
    </div>
  );
}