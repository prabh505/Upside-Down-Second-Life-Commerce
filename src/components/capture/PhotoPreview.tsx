"use client";

/**
 * src/components/capture/PhotoPreview.tsx
 *
 * Shows object URL thumbnails for captured photos.
 * Each thumbnail has a "Retake" button — always visible on touch, hover-visible on desktop.
 * Submit CTA with aria-busy and Spinner when isSubmitting.
 * Object URLs revoked on unmount.
 */

import { useEffect, useRef } from "react";
import { RotateCcw, Camera, Loader2 } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PhotoPreviewProps {
  frontFile: File;
  labelFile?: File;
  onRetake: (step: "front" | "label") => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// ── Thumbnail sub-component ───────────────────────────────────────────────────

interface ThumbnailProps {
  file: File;
  label: string;
  retakeStep: "front" | "label";
  onRetake: (step: "front" | "label") => void;
  disabled: boolean;
}

function Thumbnail({ file, label, retakeStep, onRetake, disabled }: ThumbnailProps) {
  const urlRef = useRef<string | null>(null);

  // Create object URL once per file reference
  if (!urlRef.current) {
    urlRef.current = URL.createObjectURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">
        {label}
      </span>

      <div
        className="relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-950 group"
      >
        {/* Thumbnail image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlRef.current}
          alt={`${label} photo preview`}
          className="w-full h-full object-cover"
        />

        {/* ── Retake overlay ──
            - Desktop: visible on hover/focus (group-hover / group-focus-within)
            - Touch devices: always visible via `touch-device` class via media query.
              We achieve "always visible on touch" by using @media (hover:none).
        */}
        <div
          className={[
            "absolute inset-0 bg-black/50 flex items-center justify-center",
            "transition-opacity duration-200",
            // hover: hidden by default, shown on hover on pointer devices
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            // touch: always show (devices with coarse pointer / no hover)
            "[@media(hover:none)]:opacity-100",
          ].join(" ")}
        >
          <button
            onClick={() => onRetake(retakeStep)}
            disabled={disabled}
            aria-label={`Retake ${label} photo`}
            className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm
                       border border-white/20 px-4 py-2 text-sm font-medium text-white
                       hover:bg-white/20 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retake
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <Loader2
      className="w-4 h-4 animate-spin"
      aria-hidden="true"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PhotoPreview({
  frontFile,
  labelFile,
  onRetake,
  onSubmit,
  isSubmitting,
}: PhotoPreviewProps) {
  // ── Revoke object URLs on unmount ──────────────────────────────────────────
  // We track URLs created inside Thumbnail components using a shared map keyed
  // by file reference. On unmount, revoke all.
  const urlsRef = useRef<Map<File, string>>(new Map());

  // Track URLs as they're created so we can revoke them.
  // getOrCreateUrl is called during render for each file.
  function getOrCreateUrl(file: File): string {
    if (!urlsRef.current.has(file)) {
      urlsRef.current.set(file, URL.createObjectURL(file));
    }
    return urlsRef.current.get(file)!;
  }

  useEffect(() => {
    const urlMap = urlsRef.current;
    return () => {
      // Revoke all tracked URLs on unmount
      urlMap.forEach((url) => URL.revokeObjectURL(url));
      urlMap.clear();
    };
  }, []);

  // Also revoke URL for a file that's no longer in use if files change
  useEffect(() => {
    const currentFiles = new Set<File>([frontFile]);
    if (labelFile) currentFiles.add(labelFile);

    urlsRef.current.forEach((url, file) => {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(file);
      }
    });
  }, [frontFile, labelFile]);

  const frontUrl = getOrCreateUrl(frontFile);
  const labelUrl = labelFile ? getOrCreateUrl(labelFile) : null;

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 animate-fade-in">
      {/* ── Heading ── */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-brand-50">
          {labelFile ? "Review your photos" : "Review your photo"}
        </h2>
        <p className="text-sm text-brand-400">
          Make sure everything is clearly visible before submitting.
        </p>
      </div>

      {/* ── Photo thumbnails ── */}
      <div
        className={[
          "grid gap-4",
          labelFile ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto w-full",
        ].join(" ")}
      >
        {/* Front photo */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">
            Front of item
          </span>
          <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-950 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frontUrl}
              alt="Front of item photo preview"
              className="w-full h-full object-cover"
            />
            <div
              className={[
                "absolute inset-0 bg-black/50 flex items-center justify-center",
                "transition-opacity duration-200",
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "[@media(hover:none)]:opacity-100",
              ].join(" ")}
            >
              <button
                onClick={() => onRetake("front")}
                disabled={isSubmitting}
                aria-label="Retake front of item photo"
                className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm
                           border border-white/20 px-4 py-2 text-sm font-medium text-white
                           hover:bg-white/20 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Retake
              </button>
            </div>
          </div>
        </div>

        {/* Label photo (if present) */}
        {labelFile && labelUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Expiry label
            </span>
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-950 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={labelUrl}
                alt="Expiry label photo preview"
                className="w-full h-full object-cover"
              />
              <div
                className={[
                  "absolute inset-0 bg-black/50 flex items-center justify-center",
                  "transition-opacity duration-200",
                  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                  "[@media(hover:none)]:opacity-100",
                ].join(" ")}
              >
                <button
                  onClick={() => onRetake("label")}
                  disabled={isSubmitting}
                  aria-label="Retake expiry label photo"
                  className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm
                             border border-white/20 px-4 py-2 text-sm font-medium text-white
                             hover:bg-white/20 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Retake
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Submit CTA ── */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          aria-label={isSubmitting ? "Submitting for grading…" : "Submit for grading"}
          className="flex items-center justify-center gap-2 w-full rounded-xl
                     bg-brand-500 text-brand-950 px-6 py-4 text-base font-semibold
                     hover:bg-brand-400 active:scale-[0.98] transition-all duration-150
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {isSubmitting ? (
            <>
              <Spinner />
              <span>Grading your item…</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" aria-hidden="true" />
              <span>Submit for grading</span>
            </>
          )}
        </button>

        {isSubmitting && (
          <p className="text-xs text-brand-500 text-center" aria-live="polite">
            This may take up to 30 seconds. Please don&rsquo;t close the page.
          </p>
        )}
      </div>
    </div>
  );
}
