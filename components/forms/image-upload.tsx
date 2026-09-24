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
import { useLanguage } from "@/lib/i18n/language-context";

const MAX_FILES = 5;

type ImageUploadProps = {
  id?: string;
  label?: string;
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
};

export function ImageUpload({
  id = "image",
  label,
  value,
  onChange,
  maxFiles = MAX_FILES,
}: ImageUploadProps) {
  const { t } = useLanguage();
  const displayLabel = label ?? t("imageUpload");
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  useEffect(() => {
    const urls = value.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [value]);

  function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    const room = maxFiles - value.length;
    if (room <= 0) {
      toast.error(t("maxImagesReached"));
      return;
    }
    const next = [...value, ...incoming.slice(0, room)];
    if (incoming.length > room) {
      toast.message(t("maxImagesReached"));
    }
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function clearAll() {
    onChange([]);
  }

  function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    addFiles(files);
    e.target.value = "";
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
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
      toast.error(t("failedToSave"));
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
      toast.error(t("failedToSave"));
      closeCamera();
    } finally {
      setStartingCamera(false);
    }
  }

  useEffect(() => {
    if (!cameraOpen) return;
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
    if (value.length >= maxFiles) {
      toast.error(t("maxImagesReached"));
      closeCamera();
      return;
    }
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error(t("failedToSave"));
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
          toast.error(t("failedToSave"));
          return;
        }
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        addFiles([file]);
        toast.success(t("capture"));
        // Keep camera open so more photos can be taken
      },
      "image/jpeg",
      0.85
    );
  }

  const canAdd = value.length < maxFiles;

  return (
    <div className="space-y-2">
      <Label>
        {displayLabel}{" "}
        <span className="font-normal text-muted-foreground">
          ({value.length}/{maxFiles})
        </span>
      </Label>

      <input
        ref={galleryRef}
        id={`${id}-gallery`}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onGalleryChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!canAdd}
          onClick={() => galleryRef.current?.click()}
        >
          <ImageIcon data-icon="inline-start" />
          {t("gallery")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canAdd}
          onClick={() => setCameraOpen(true)}
        >
          <Camera data-icon="inline-start" />
          {t("camera")}
        </Button>
        {value.length > 0 && (
          <Button type="button" variant="ghost" onClick={clearAll}>
            <X data-icon="inline-start" />
            {t("remove")}
          </Button>
        )}
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {value.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="relative overflow-hidden rounded-lg border bg-muted/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previews[index]}
                alt={file.name}
                className="h-28 w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
                onClick={() => removeAt(index)}
                aria-label={t("remove")}
              >
                <X className="size-3.5" />
              </button>
              <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
                {file.name}
              </p>
            </div>
          ))}
        </div>
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
            <DialogTitle>
              {t("takePhoto")} ({value.length}/{maxFiles})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border bg-black">
            {startingCamera && (
              <p className="p-4 text-center text-sm text-white">
                {t("startingCamera")}
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
              {t("done")}
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={startingCamera || !canAdd}
            >
              <Camera data-icon="inline-start" />
              {t("capture")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
