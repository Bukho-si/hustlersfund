/**
 * Client-side image compression for proof-of-payment uploads.
 *
 * Phone cameras produce 3–8MB JPEGs. Uploading those raw spikes memory on
 * low-end Android devices (which then surface a system "low memory" warning)
 * and bloats the storage bucket. We downscale to a readable max dimension and
 * re-encode as JPEG before upload.
 *
 * PDFs and anything that fails to decode are returned untouched.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
// Files already smaller than this are left alone.
const SKIP_BELOW_BYTES = 600 * 1024;

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );

    // Release canvas memory immediately.
    canvas.width = 0;
    canvas.height = 0;

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}
