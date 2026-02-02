export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  mimeType?: string;
}

export async function compressImage(
  file: File,
  { maxWidth, maxHeight, quality, mimeType = 'image/jpeg' }: CompressOptions
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob || file);
      },
      mimeType,
      quality
    );
  });
}
