import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

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

  const takePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/png");
    window.open(imageDataUrl, "_blank");
  };

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
          <div className="brand-logo">VC</div>
          <div className="brand-text">
            <div>VISUCAREM</div>
            <div>POSITION OF WEAR</div>
          </div>
        </div>

        <div className="title">FRONT PHOTO</div>

        <div className="topbar-actions">
          <button className="icon-btn" aria-label="Settings" type="button">
            ⚙
          </button>
        </div>
      </header>

      <main className="viewer">
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

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

        <div className="bottom-panel">
          <div className="mini-target">
            <div className="mini-h"></div>
            <div className="mini-v"></div>
            <div className="mini-dot"></div>
          </div>

          <div className="instruction">
            <div className="instruction-title">Centered!</div>
            <div className="instruction-text">
              Now you can take the photo by clicking the button on the right.
            </div>
          </div>

          <div className="mini-brand">VC</div>
        </div>
      </main>
    </div>
  );
}

export default App;