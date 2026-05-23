import React, { useRef, useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { Camera, CameraOff, AlertCircle, Loader, CheckCircle, Clock } from "lucide-react";

export const AttendanceScanner = () => {
  const { token } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // Hidden canvas for capture
  const overlayCanvasRef = useRef(null); // Visual canvas for bounding boxes
  
  const [streamActive, setStreamActive] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [ws, setWs] = useState(null);
  const [logs, setLogs] = useState([]); // List of scanned student results
  const [cameraError, setCameraError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Bind stream to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isLoading]);

  // Initialize WebSockets and start video on mount
  useEffect(() => {
    startCamera();
    connectWebSocket();
    
    return () => {
      stopCamera();
      closeWebSocket();
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setMediaStream(stream);
      setStreamActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Could not access your webcam. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setStreamActive(false);
  };

  const connectWebSocket = () => {
    // Dynamically derive WebSocket URL from API_BASE_URL (handles ws/wss based on http/https protocol)
    const getWsUrl = () => {
      try {
        const url = new URL(API_BASE_URL);
        const protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${url.host}${url.pathname}/ws/attendance`;
      } catch (e) {
        console.error("Failed to parse API_BASE_URL, falling back to local WS", e);
        return "ws://localhost:8000/api/v1/ws/attendance";
      }
    };
    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected.");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.faces) {
        drawBoundingBoxes(data.faces);
        processScannedFaces(data.faces);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket closed. Reconnecting...");
      setTimeout(connectWebSocket, 3000); // Auto reconnect after 3 seconds
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(socket);
  };

  const closeWebSocket = () => {
    if (ws) {
      ws.close();
    }
  };

  // Capture frame and send to WebSocket
  useEffect(() => {
    if (!streamActive || !ws || ws.readyState !== WebSocket.OPEN) return;

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        if (!video.videoWidth || !video.videoHeight) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Make canvas size match video resolution
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 jpeg
        const base64Image = canvas.toDataURL("image/jpeg", 0.6); // 60% quality is plenty
        
        // Send base64 payload to WebSocket
        ws.send(JSON.stringify({ image: base64Image }));
      }
    }, 400); // Scan every 400ms

    return () => clearInterval(interval);
  }, [streamActive, ws]);

  // Draw bounding boxes on overlay canvas
  const drawBoundingBoxes = (faces) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!video.clientWidth || !video.clientHeight || !video.videoWidth || !video.videoHeight) return;
    const ctx = canvas.getContext("2d");

    // Match overlay canvas size to video dimensions
    if (canvas.width !== video.clientWidth) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    faces.forEach((face) => {
      const [x, y, w, h] = face.box;
      
      // Calculate scaled coords
      const sx = x * scaleX;
      const sy = y * scaleY;
      const sw = w * scaleX;
      const sh = h * scaleY;

      // Mirror the coordinate manually since the video is mirrored but canvas is not
      const sxMirrored = canvas.width - sx - sw;

      // Select color based on recognition status
      let color = "#e2e8f0"; // Slate-200 for scanning/unknown
      if (face.status === "Marked") color = "#10b981"; // Emerald
      if (face.status === "Already Marked") color = "#3b82f6"; // Blue

      // Bounding box border
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sxMirrored, sy, sw, sh);

      // Label background
      ctx.fillStyle = color;
      ctx.font = "12px sans-serif";
      const text = `${face.name} (${face.student_id})`;
      const textWidth = ctx.measureText(text).width;
      
      ctx.fillRect(sxMirrored - 1, sy - 20, textWidth + 10, 20);

      // Label Text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, sxMirrored + 4, sy - 6);
    });
  };

  // Add scan outputs to log list
  const processScannedFaces = (faces) => {
    faces.forEach((face) => {
      if (face.student_id !== "Unknown" && (face.status === "Marked" || face.status === "Already Marked")) {
        // Play success tone if just marked
        if (face.status === "Marked") {
          playBeep();
        }
        
        // Add to local state list, ensuring no duplicate visual display logs
        setLogs((prevLogs) => {
          const existsIndex = prevLogs.findIndex(
            (log) => log.student_id === face.student_id
          );
          
          const newLog = {
            student_id: face.student_id,
            name: face.name,
            status: face.status,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            detail: face.detail
          };

          if (existsIndex >= 0) {
            // Remove previous log of same student to float the newest scan on top
            const filtered = prevLogs.filter((_, i) => i !== existsIndex);
            return [newLog, ...filtered].slice(0, 10);
          }
          return [newLog, ...prevLogs].slice(0, 10);
        });
      }
    });
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // Beep for 150ms
    } catch (e) {
      console.warn("Audio Beep failed to play:", e);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attendance Scanner</h1>
        <p className="text-slate-400 text-sm">Stand in front of the camera to mark your daily attendance automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch">
        {/* Camera Feed Card */}
        <div className="glass-panel p-5 lg:col-span-2 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/70 border border-slate-800">
          {cameraError ? (
            <div className="text-center p-6 max-w-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-200">{cameraError}</p>
              <button 
                onClick={startCamera} 
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition"
              >
                Allow Camera
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Starting camera stream...</p>
            </div>
          ) : (
            <div className="relative w-full max-w-2xl rounded-lg overflow-hidden bg-black/40 border border-slate-800 shadow-2xl">
              {/* Webcam Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto block scale-x-[-1]" // Mirror feed
              />

              {/* Bounding box visual overlay */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Laser Line Scanner Overlay */}
              {streamActive && (
                <div className="absolute left-0 right-0 h-0.5 bg-cyan-400/80 shadow-[0_0_8px_#22d3ee] scanner-laser opacity-40"></div>
              )}

              {/* Offline indicator */}
              {!streamActive && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3">
                  <CameraOff className="w-10 h-10 text-slate-500" />
                  <p className="text-slate-400 text-sm">Camera is inactive</p>
                  <button 
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold"
                  >
                    Start Scanner
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          {streamActive && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-red-600/20 border border-red-500/20 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-semibold transition"
              >
                Stop Scanner
              </button>
              <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>SYSTEM LIVE • WEBSOCKET SCANNING</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Scans Panel */}
        <div className="glass-panel p-5 flex flex-col h-[500px]">
          <h4 className="text-sm font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">Scanned Students Log</h4>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div 
                  key={`${log.student_id}-${index}`} 
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    log.status === "Marked" 
                      ? "bg-emerald-950/20 border-emerald-500/10 text-emerald-400"
                      : "bg-indigo-950/20 border-indigo-500/10 text-indigo-400"
                  }`}
                >
                  <div>
                    <h5 className="font-semibold text-sm text-slate-200">{log.name}</h5>
                    <p className="text-xs font-mono text-slate-400 mt-1">{log.student_id}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">{log.detail}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-400">{log.time}</span>
                    <div className="flex items-center space-x-1 justify-end mt-1.5">
                      {log.status === "Marked" ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Success</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Already</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Camera className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-xs">Waiting for face detection logs...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvases for video frame grabbing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};
export default AttendanceScanner;
