import React, { useState, useEffect, useRef } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  Camera, 
  QrCode, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader, 
  RefreshCw,
  Sparkles,
  Play
} from "lucide-react";

export const StudentScanner = () => {
  const { token } = useAuth();
  
  // Scanning state steps: "scan_qr" -> "verify_face" -> "success"
  const [step, setStep] = useState("scan_qr");
  
  // Scanned QR session details
  const [qrId, setQrId] = useState("");
  const [manualQrId, setManualQrId] = useState("");
  const [qrDetails, setQrDetails] = useState(null);
  
  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Webcam video capture states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [capturingFace, setCapturingFace] = useState(false);

  // Initialize html5-qrcode scanner
  useEffect(() => {
    if (step === "scan_qr") {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Parse JSON payload or handle UUID string
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.qr_id) {
              handleQRDetected(parsed.qr_id);
              scanner.clear();
            } else {
              handleQRDetected(decodedText);
              scanner.clear();
            }
          } catch (e) {
            // Text-based QR ID
            handleQRDetected(decodedText);
            scanner.clear();
          }
        },
        (error) => {
          // Silence noise
        }
      );

      return () => {
        scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      };
    }
  }, [step]);

  // Manage Webcam stream for face recognition
  useEffect(() => {
    if (step === "verify_face") {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [step]);

  const startWebcam = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      setError("Webcam access denied. Please grant permissions to perform face verification.");
      console.error(err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const handleQRDetected = async (scannedId) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/qr/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_id: scannedId }),
      });

      if (response.ok) {
        setQrId(scannedId);
        // Move to face verification step
        setStep("verify_face");
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Invalid QR Code or class mismatch.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualQrId) return;
    handleQRDetected(manualQrId.trim());
  };

  const captureAndVerifyFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturingFace(true);
    setError("");

    try {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const dataUrl = canvasRef.current.toDataURL("image/jpeg");

      const response = await fetch(`${API_BASE_URL}/qr/verify-face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qr_id: qrId,
          image: dataUrl
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData(data);
        setStep("success");
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Face validation failed. Align face clearly and try again.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCapturingFace(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-400" />
          Mark Attendance Session
        </h1>
        <p className="text-slate-400 text-sm">
          Follow the dual authorization flow: Scan active session QR code and verify your live facial credentials.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Step 1: QR Scanning */}
      {step === "scan_qr" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Scanner Screen */}
          <div className="glass-panel p-6 flex flex-col items-center justify-center min-h-[350px]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Live Camera QR Scan
            </h3>
            
            <div className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-800 bg-black/40 p-2">
              <div id="qr-reader-container" className="w-full"></div>
            </div>
          </div>

          {/* Backup Manual Fallback Input */}
          <div className="glass-panel p-6 flex flex-col justify-center space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Manual Fallback Registry Check
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If camera permissions are blocked or you are testing locally in a headless environment, 
              enter the session UUID generated by your teacher below to proceed.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">QR Session ID</label>
                <input
                  type="text"
                  placeholder="Enter 36-character session UUID"
                  value={manualQrId}
                  onChange={(e) => setManualQrId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white font-mono placeholder-slate-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Verify Session ID
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Face Verification */}
      {step === "verify_face" && (
        <div className="max-w-xl mx-auto glass-panel p-6 space-y-6 flex flex-col items-center">
          <div className="text-center">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Authorization Step 2: Face Match
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Position your face inside the webcam frame to complete your attendance verification.
            </p>
          </div>

          <div className="w-full aspect-[4/3] max-w-sm border border-slate-800 bg-black rounded-2xl overflow-hidden relative">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" width={640} height={480} />
            
            {/* Holographic scanner laser animation effect */}
            {streamActive && (
              <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 shadow-md shadow-cyan-400/50 animate-[scan_2.5s_ease-in-out_infinite]"></div>
            )}
            
            {/* Visual target guides */}
            <div className="absolute inset-0 border-[24px] border-slate-950/40 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-56 rounded-full border border-indigo-400/40 border-dashed shadow-[0_0_0_999px_rgba(2,6,23,0.3)]"></div>
            </div>
          </div>

          <div className="w-full flex gap-3 max-w-sm">
            <button
              onClick={() => setStep("scan_qr")}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel Scan
            </button>
            <button
              onClick={captureAndVerifyFace}
              disabled={capturingFace || !streamActive}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
            >
              {capturingFace ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Verify Face ID
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === "success" && successData && (
        <div className="max-w-md mx-auto glass-panel p-8 text-center space-y-6 flex flex-col items-center border border-emerald-500/20">
          <div className="relative inline-block p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded-full">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white">Attendance Verified!</h2>
            <p className="text-slate-400 text-xs">
              Welcome, <span className="font-semibold text-white">{successData.student_name}</span>. Your lecture presence is logged.
            </p>
          </div>

          <div className="w-full bg-slate-950/60 border border-slate-850 rounded-xl p-4 text-left text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Lecture</span>
              <span className="font-semibold text-slate-200">{successData.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp</span>
              <span className="font-semibold text-slate-200">{successData.date} {successData.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Entry Status</span>
              <span className="font-semibold text-emerald-400">{successData.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Face Recognition Match</span>
              <span className="font-semibold text-indigo-400 font-mono">{successData.face_confidence}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setStep("scan_qr");
              setSuccessData(null);
              setQrId("");
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Mark Another Attendance
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentScanner;
