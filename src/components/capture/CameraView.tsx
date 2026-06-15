"use client";

/**
 * src/components/capture/CameraView.tsx
 *
 * Handles all camera capture logic:
 *  - getUserMedia with environment facingMode (mobile rear camera)
 *  - Frame overlay (dashed border) sized for front/label steps
 *  - On capture: draw to offscreen canvas, scale to max 1024px longest side,
 *    export JPEG at quality 0.85, pass as File to onCapture
 *  - Permission denied: plain-language message (never expose browser error codes)
 *  - Desktop fallback: drag-and-drop / file input clearly labeled as desktop mode
 *  - Keyboard: Space or Enter fires capture
 *
 * No third-party camera library. getUserMedia directly.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Upload } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CameraViewProps {
  step: "front" | "label";
  onCapture: (file: File) => void;
}

// ── Camera state ──────────────────────────────────────────────────────────────

type CameraState =
  | "initializing"
  | "active"
  | "permission_denied"
  | "no_camera"
  | "error";

// ── Image resize helper ───────────────────────────────────────────────────────

const MAX_PX = 1024;
const JPEG_QUALITY = 0.85;

function resizeAndExport(
  videoEl: HTMLVideoElement,
  fileName: string,
  onDone: (file: File) => void
): void {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  if (vw === 0 || vh === 0) return;

  // Scale so longest side = MAX_PX
  const scale = Math.min(MAX_PX / vw, MAX_PX / vh, 1);
  const targetW = Math.round(vw * scale);
  const targetH = Math.round(vh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(videoEl, 0, 0, targetW, targetH);

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/jpeg" });
      onDone(file);
    },
    "image/jpeg",
    JPEG_QUALITY
  );
}

async function fileToResizedFile(
  inputFile: File,
  fileName: string,
  onDone: (file: File) => void
): Promise<void> {
  const bitmap = await createImageBitmap(inputFile);
  const { width: iw, height: ih } = bitmap;

  const scale = Math.min(MAX_PX / iw, MAX_PX / ih, 1);
  const targetW = Math.round(iw * scale);
  const targetH = Math.round(ih * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const file = new File([blob], fileName, { type: "image/jpeg" });
      onDone(file);
    },
    "image/jpeg",
    JPEG_QUALITY
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CameraView({ step, onCapture }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [isDragOver, setIsDragOver] = useState(false);

  const stepLabel = step === "front" ? "front of item" : "expiry label";
  const stepTitle = step === "front" ? "Front of item" : "Expiry label";

  // ── Start camera ────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraState("initializing");

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("no_camera");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      // NOTE: we do NOT attach the stream to videoRef here. The <video>
      // element is only rendered in the "active" state, so videoRef.current
      // is still null at this point. Flipping to "active" mounts the video,
      // and the effect below attaches the stream once it exists. Attaching
      // here silently no-ops and leaves a black feed.
      setCameraState("active");
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setCameraState("permission_denied");
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          // No camera hardware → show desktop fallback
          setCameraState("no_camera");
        } else {
          setCameraState("no_camera"); // e.g. NotReadableError → treat as no_camera
        }
      } else {
        setCameraState("error");
      }
    }
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    startCamera();

    return () => {
      // Stop stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // ── Attach stream once the <video> is mounted ───────────────────────────────
  // The <video> only exists in the "active" render. We must wait for that
  // commit before assigning srcObject; doing it earlier (in startCamera) hits a
  // null ref and leaves a black feed.
  useEffect(() => {
    if (cameraState !== "active") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    // playsInline + muted satisfy mobile autoplay policies; a rejected play()
    // is a benign race (element not yet ready), so we swallow it.
    video.play().catch(() => {});
  }, [cameraState]);

  // ── Capture from video ──────────────────────────────────────────────────────

  const handleCapture = useCallback(() => {
    if (!videoRef.current || cameraState !== "active") return;
    const fileName = `${step}_${Date.now()}.jpg`;
    resizeAndExport(videoRef.current, fileName, onCapture);
  }, [cameraState, onCapture, step]);

  // ── Keyboard: Space / Enter → capture ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        cameraState === "active" &&
        (e.code === "Space" || e.code === "Enter") &&
        (document.activeElement?.tagName !== "BUTTON" ||
          document.activeElement?.getAttribute("data-capture-btn") === "true")
      ) {
        e.preventDefault();
        handleCapture();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cameraState, handleCapture]);

  // ── Desktop fallback: file input / drag-and-drop ───────────────────────────

  const handleDesktopFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png)$/)) return;
      const fileName = `${step}_${Date.now()}.jpg`;
      await fileToResizedFile(file, fileName, onCapture);
    },
    [onCapture, step]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleDesktopFile(file);
    },
    [handleDesktopFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleDesktopFile(file);
    },
    [handleDesktopFile]
  );

  // ── Render states ───────────────────────────────────────────────────────────

  // Permission denied — plain English, no browser error strings
  if (cameraState === "permission_denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center">
          <Camera className="w-7 h-7 text-brand-500" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-brand-50">
            Camera access required
          </h2>
          <p className="text-sm text-brand-300 max-w-xs leading-relaxed">
            Camera access is required to grade your item. Please tap
            &ldquo;Allow&rdquo; when your browser asks, or enable camera access
            in your device settings.
          </p>
        </div>
        <button
          onClick={startCamera}
          className="rounded-xl border border-brand-700 bg-brand-950 px-6 py-3 text-sm font-medium text-brand-200 hover:border-brand-500 hover:text-brand-100 transition-all"
        >
          Try again
        </button>
      </div>
    );
  }

  // Desktop fallback — no environment camera detected
  if (cameraState === "no_camera") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
        {/* Clear labeling — this is a desktop fallback, not the primary flow */}
        <div className="rounded-xl border border-brand-700 bg-brand-950/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand-500">
          Desktop preview mode only
        </div>

        <div
          role="region"
          aria-label={`Drop zone for ${stepLabel} photo — desktop preview mode only`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer",
            "w-full max-w-sm h-64 transition-all duration-200",
            isDragOver
              ? "border-brand-400 bg-brand-900/30"
              : "border-brand-700 bg-brand-950/30 hover:border-brand-600",
          ].join(" ")}
        >
          <Upload
            className="w-8 h-8 text-brand-600"
            aria-hidden="true"
          />
          <div className="text-center space-y-1 px-4">
            <p className="text-sm font-medium text-brand-300">
              Desktop mode — drag your photo here or click to select
            </p>
            <p className="text-xs text-brand-600">
              {stepTitle} · JPEG or PNG
            </p>
          </div>
          {/* File input — desktop fallback ONLY, restricted to JPEG/PNG */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            aria-label={`Select ${stepLabel} photo — desktop preview mode only`}
            onChange={handleFileInputChange}
          />
        </div>

        <p className="text-xs text-brand-700 text-center max-w-xs">
          The mobile app uses the in-app camera exclusively. This upload is for
          developer preview only and does not reflect the production experience.
        </p>
      </div>
    );
  }

  // Initializing
  if (cameraState === "initializing") {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        aria-live="polite"
        aria-label="Starting camera…"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-700 border-t-brand-400 animate-spin" />
          <p className="text-sm text-brand-400">Starting camera…</p>
        </div>
      </div>
    );
  }

  // Error fallback
  if (cameraState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4 text-center">
        <p className="text-sm text-brand-300">
          Something went wrong starting the camera. Please refresh and try
          again.
        </p>
        <button
          onClick={startCamera}
          className="rounded-xl border border-brand-700 bg-brand-950 px-6 py-3 text-sm font-medium text-brand-200 hover:border-brand-500"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Active camera view ──────────────────────────────────────────────────────

  // Overlay dimensions: full-width for front, shorter centered for label
  const overlayStyles =
    step === "front"
      ? "inset-x-4 top-[15%] bottom-[25%]"
      : "inset-x-10 top-[25%] bottom-[40%]";

  return (
    <div className="relative w-full flex-1 overflow-hidden bg-black">
      {/* ── Live video feed ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        aria-hidden="true"
      />

      {/* ── Frame overlay ── */}
      <div
        aria-hidden="true"
        className={`absolute ${overlayStyles} rounded-xl pointer-events-none`}
        style={{
          border: "2px dashed rgba(255,255,255,0.6)",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        }}
      />

      {/* ── Step label ── */}
      <div
        aria-hidden="true"
        className="absolute top-4 left-0 right-0 flex justify-center"
      >
        <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          {stepTitle}
        </span>
      </div>

      {/* ── Capture instruction ── */}
      <div
        aria-hidden="true"
        className="absolute bottom-28 left-0 right-0 flex justify-center"
      >
        <span className="rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm">
          {step === "front"
            ? "Position item within the frame"
            : "Centre the expiry label in the frame"}
        </span>
      </div>

      {/* ── Capture button ── */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          data-capture-btn="true"
          onClick={handleCapture}
          aria-label={`Take photo of ${stepLabel}`}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl
                     active:scale-95 transition-transform duration-100
                     focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <Camera
            className="w-7 h-7 text-gray-900"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
