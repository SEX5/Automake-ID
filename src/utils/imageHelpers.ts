/**
 * Utility to process, crop, and format images for ID photo sizing
 */

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface RenderPhotoOptions {
  sourceImage: string; // URL or base64
  targetWidthMm: number;
  targetHeightMm: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  backgroundColor?: string;
  dpi?: number;
}

/**
 * Render a photo onto an HTML canvas with exact target aspect ratio,
 * optional background fill, zoom and offset, returning base64 JPEG or PNG
 */
export async function renderProcessedPhoto(options: RenderPhotoOptions): Promise<string> {
  const {
    sourceImage,
    targetWidthMm,
    targetHeightMm,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    backgroundColor = '#FFFFFF',
    dpi = 300,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate pixel dimensions at specified DPI (default 300 DPI for ultra-crisp print quality)
      const pxPerMm = dpi / 25.4;
      const canvasWidth = Math.round(targetWidthMm * pxPerMm);
      const canvasHeight = Math.round(targetHeightMm * pxPerMm);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Failed to get 2D canvas context'));
      }

      // Background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Compute aspect ratios
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = canvasWidth / canvasHeight;

      let drawWidth = canvasWidth;
      let drawHeight = canvasHeight;

      if (imgAspect > targetAspect) {
        // Image is wider than target: fit to height
        drawHeight = canvasHeight * zoom;
        drawWidth = drawHeight * imgAspect;
      } else {
        // Image is taller than target: fit to width
        drawWidth = canvasWidth * zoom;
        drawHeight = drawWidth / imgAspect;
      }

      const drawX = (canvasWidth - drawWidth) / 2 + offsetX * (canvasWidth / 100);
      const drawY = (canvasHeight - drawHeight) / 2 + offsetY * (canvasHeight / 100);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };

    img.onerror = () => reject(new Error('Failed to load image for processing'));
    img.src = sourceImage;
  });
}

/**
 * Triggers a download of a Uint8Array or Blob or URL as a file in the browser
 */
export function triggerFileDownload(data: Uint8Array | Blob | string, fileName: string, mimeType?: string) {
  if (typeof data === 'string') {
    if (data.startsWith('data:') || data.startsWith('blob:') || data.startsWith('http://') || data.startsWith('https://')) {
      const a = document.createElement('a');
      a.href = data;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } else {
      // Raw base64 string
      const fullDataUri = `data:${mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};base64,${data}`;
      const a = document.createElement('a');
      a.href = fullDataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof Uint8Array) {
    blob = new Blob([data.buffer as ArrayBuffer], {
      type: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } else {
    throw new Error('Unsupported download format');
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
