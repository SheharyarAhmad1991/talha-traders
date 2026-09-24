export async function fileToBase64(file: File | null | undefined) {
  if (!file || file.size === 0) return undefined;
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be smaller than 2MB");
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

/** Encode 1+ images for storage. One image = string; many = JSON array string. */
export async function filesToImageData(files: File[]) {
  if (!files.length) return undefined;
  const encoded: string[] = [];
  for (const file of files) {
    const data = await fileToBase64(file);
    if (data) encoded.push(data);
  }
  if (!encoded.length) return undefined;
  if (encoded.length === 1) return encoded[0];
  return JSON.stringify(encoded);
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
