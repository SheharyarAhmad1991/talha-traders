"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n/language-context";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike> & {
    readonly length: number;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type NotesWithVoiceProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function NotesWithVoice({
  id = "notes",
  label,
  value,
  onChange,
  rows = 3,
}: NotesWithVoiceProps) {
  const { t } = useLanguage();
  const displayLabel = label ?? t("notes");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef(value);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    if (!listening) {
      baseTextRef.current = value;
    }
  }, [value, listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.error(t("voiceNeedChrome"));
      return;
    }

    try {
      recognitionRef.current?.abort();
      const recognition = new SpeechRecognition();
      recognition.lang = "ur-PK";
      recognition.continuous = true;
      recognition.interimResults = true;

      baseTextRef.current = value;
      let finalChunk = "";

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || "";
          if (result.isFinal) {
            finalChunk += `${transcript} `;
          } else {
            interim += transcript;
          }
        }

        const prefix = baseTextRef.current.trim();
        const spoken = `${finalChunk}${interim}`.trim();
        onChange(prefix ? `${prefix} ${spoken}` : spoken);
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed") {
          toast.error(t("failedToSave"));
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          toast.error(t("failedToSave"));
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      toast.message(t("listeningHint"));
    } catch {
      toast.error(t("failedToSave"));
      setListening(false);
    }
  }

  function toggleListening() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{displayLabel}</Label>
        <Button
          type="button"
          size="sm"
          variant={listening ? "destructive" : "outline"}
          onClick={toggleListening}
          disabled={!supported}
          aria-pressed={listening}
          title={
            supported
              ? listening
                ? t("stop")
                : t("voiceUrdu")
              : t("voiceNeedChrome")
          }
        >
          {listening ? (
            <>
              <MicOff data-icon="inline-start" />
              {t("stop")}
            </>
          ) : (
            <>
              <Mic data-icon="inline-start" />
              {t("voiceUrdu")}
            </>
          )}
        </Button>
      </div>

      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          listening ? t("listeningPlaceholder") : t("notesPlaceholder")
        }
        dir="auto"
        className={listening ? "ring-2 ring-destructive/40" : undefined}
      />

      {listening && (
        <p className="text-xs text-destructive">{t("listeningHint")}</p>
      )}
      {!supported && (
        <p className="text-xs text-muted-foreground">{t("voiceNeedChrome")}</p>
      )}
    </div>
  );
}
