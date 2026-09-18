"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageUploadProps = {
  id?: string;
  label?: string;
  value: File | null;
  onChange: (file: File | null) => void;
};

export function ImageUpload({
  id = "image",
  label = "Image Upload",
  value,
  onChange,
}: ImageUploadProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  function applyFile(file: File | null) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    onChange(file);
  }

  function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    applyFile(file);
    e.target.value = "";
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setStartingCamera(false);
  }

  async function startStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera is not supported in this browser");
      setCameraOpen(false);
      return;
    }
    setStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error("Could not open camera. Please allow camera permission.");
      closeCamera();
    } finally {
      setStartingCamera(false);
    }
  }

  useEffect(() => {
    if (!cameraOpen) return;
    // Wait a tick so the <video> exists inside the dialog
    const timer = window.setTimeout(() => {
      void startStream();
    }, 50);
    return () => {
      window.clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Camera is not ready yet");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        applyFile(file);
        closeCamera();
        toast.success("Photo captured");
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <input
        ref={galleryRef}
        id={`${id}-gallery`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onGalleryChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => galleryRef.current?.click()}
        >
          <ImageIcon data-icon="inline-start" />
          Gallery
        </Button>
        <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}>
          <Camera data-icon="inline-start" />
          Camera
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => applyFile(null)}>
            <X data-icon="inline-start" />
            Remove
          </Button>
        )}
      </div>

      {value && (
        <p className="truncate text-xs text-muted-foreground">{value.name}</p>
      )}

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Selected upload preview"
          className="mt-1 max-h-40 rounded-lg border object-contain"
        />
      )}

      <Dialog
        open={cameraOpen}
        onOpenChange={(open) => {
          if (!open) closeCamera();
          else setCameraOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border bg-black">
            {startingCamera && (
              <p className="p-4 text-center text-sm text-white">
                Starting camera…
              </p>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-80 w-full object-contain"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCamera}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={startingCamera}
            >
              <Camera data-icon="inline-start" />
              Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
