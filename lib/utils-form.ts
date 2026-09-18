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

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
