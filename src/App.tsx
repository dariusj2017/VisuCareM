import { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
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
      setError("Nepavyko įjungti kameros. Patikrink leidimus naršyklėje.");
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
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#f5f7fb",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>VisuCareM</h1>
        <p>Akinių matavimo sistema – kameros testas</p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <button
            onClick={startCamera}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Įjungti kamerą
          </button>

          <button
            onClick={stopCamera}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Išjungti kamerą
          </button>
        </div>

        {error && (
          <p style={{ color: "crimson", fontWeight: 600 }}>{error}</p>
        )}

        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            background: "#ddd",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        <p style={{ marginTop: "16px", color: "#444" }}>
          Būsena: {isCameraOn ? "kamera įjungta" : "kamera išjungta"}
        </p>
      </div>
    </div>
  );
}

export default App;