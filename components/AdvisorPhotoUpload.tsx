"use client";

import { useState, useRef, useCallback } from "react";

interface AdvisorPhotoUploadProps {
  currentPhotoUrl?: string;
  advisorSlug: string;
  onPhotoUpdated: (newUrl: string) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE = 400;

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Crop to square from center, then resize
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to resize image"));
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export default function AdvisorPhotoUpload({ currentPhotoUrl, advisorSlug, onPhotoUpdated }: AdvisorPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setSuccess(false);

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 5MB.");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      setUploading(true);
      setProgress(20);

      // Resize image
      const resizedBlob = await resizeImage(file);
      setProgress(50);

      // Upload via API route
      const formData = new FormData();
      formData.append("file", resizedBlob, `photo.webp`);
      formData.append("slug", advisorSlug);

      const res = await fetch("/api/advisor-photo", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Upload failed");
      }

      const { publicUrl } = await res.json();
      setProgress(100);
      setSuccess(true);
      setPreview(publicUrl);
      onPhotoUpdated(publicUrl);

      // Clear success after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      // Revert preview on error
      setPreview(currentPhotoUrl || null);
    } finally {
      setUploading(false);
      setProgress(0);
      // Clean up preview URL
      URL.revokeObjectURL(previewUrl);
    }
  }, [advisorSlug, currentPhotoUrl, onPhotoUpdated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={uploading}
        className={`
          relative w-28 h-28 rounded-full border-2 border-dashed overflow-hidden
          transition-all duration-200 cursor-pointer group
          ${dragOver ? "border-slate-900 bg-slate-100 scale-105" : "border-slate-300 hover:border-slate-400"}
          ${uploading ? "opacity-70 cursor-wait" : ""}
        `}
      >
        {preview ? (
          <img
            src={preview}
            alt="Profile photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <div className="w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 94.25} 94.25`}
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="text-center">
        <p className="text-xs text-slate-500">
          {uploading ? "Uploading..." : "Click or drag to upload"}
        </p>
        <p className="text-[0.55rem] text-slate-400 mt-0.5">JPG, PNG, or WebP. Max 5MB.</p>
      </div>

      {error && (
        <p className="text-xs text-red-600 font-medium text-center">{error}</p>
      )}

      {success && (
        <p className="text-xs text-emerald-600 font-medium text-center">Photo updated!</p>
      )}
    </div>
  );
}
