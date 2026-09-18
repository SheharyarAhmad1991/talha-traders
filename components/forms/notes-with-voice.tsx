"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  label = "Notes",
  value,
  onChange,
  rows = 3,
}: NotesWithVoiceProps) {
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
      toast.error("Voice typing is not supported in this browser. Use Chrome or Edge.");
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
          toast.error("Microphone permission denied");
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          toast.error("Voice typing failed. Please try again.");
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      toast.message("اردو سن رہا ہے… بولیں");
    } catch {
      toast.error("Could not start voice typing");
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
        <Label htmlFor={id}>{label}</Label>
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
                ? "Stop listening"
                : "Start Urdu voice typing"
              : "Voice not supported in this browser"
          }
        >
          {listening ? (
            <>
              <MicOff data-icon="inline-start" />
              Stop
            </>
          ) : (
            <>
              <Mic data-icon="inline-start" />
              Voice (اردو)
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
          listening ? "سن رہا ہے… بولیں (Urdu)" : "Notes / نوٹس لکھیں یا Voice دبائیں"
        }
        dir="auto"
        className={listening ? "ring-2 ring-destructive/40" : undefined}
      />

      {listening && (
        <p className="text-xs text-destructive">Listening in Urdu… click Stop when done</p>
      )}
      {!supported && (
        <p className="text-xs text-muted-foreground">
          Voice typing needs Chrome or Edge with microphone access.
        </p>
      )}
    </div>
  );
}
