import type { jsPDF } from "jspdf";

const PDF_FONT_NAME = "NotoSansArabic";
const PDF_FONT_FILE = "NotoSansArabic-Regular.ttf";
const PDF_FONT_URL = "/fonts/NotoSansArabic-Regular.ttf";

let cachedFontBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Download a UTF-8 CSV that Excel opens with correct Urdu characters. */
export function downloadUtf8Csv(filename: string, csvBody: string) {
  const blob = new Blob(["\uFEFF" + csvBody], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escape a CSV cell (quotes + commas / newlines). */
export function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

async function loadUrduFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  const res = await fetch(PDF_FONT_URL, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error("Failed to load Urdu PDF font");
  }
  const buffer = await res.arrayBuffer();
  cachedFontBase64 = arrayBufferToBase64(buffer);
  return cachedFontBase64;
}

/** Register Noto Sans Arabic on a jsPDF doc (supports Urdu / Arabic glyphs). */
export async function applyUrduPdfFont(doc: jsPDF): Promise<string> {
  const base64 = await loadUrduFontBase64();
  doc.addFileToVFS(PDF_FONT_FILE, base64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");
  return PDF_FONT_NAME;
}

export { PDF_FONT_NAME };
