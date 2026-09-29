import smartcrop from 'smartcrop';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface AutoCropResult {
  dataUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  detectedFace: FaceBoundingBox | null;
  cropBox: { x: number; y: number; width: number; height: number };
}

/**
 * Loads an image from a URL or Base64 string into an HTMLImageElement
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
    img.src = src;
  });
}

/**
 * Detects face in an image using:
 * 1. Native Shape Detection API (window.FaceDetector) if available
 * 2. Computer Vision Skin-Tone + Saliency Analysis on HTML Canvas
 */
export async function detectFace(img: HTMLImageElement): Promise<FaceBoundingBox | null> {
  // Strategy 1: Browser Native Shape Detection API
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const FaceDetectorCtor = (window as unknown as { FaceDetector: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (el: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
      const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          confidence: 0.95,
        };
      }
    } catch {
      // Fall through to computer vision detector
    }
  }

  // Strategy 2: Computer Vision Skin-Tone & Saliency Analysis on Canvas
  try {
    const canvas = document.createElement('canvas');
    // Scale down image for fast analysis
    const sampleWidth = Math.min(320, img.naturalWidth || img.width);
    const scale = sampleWidth / (img.naturalWidth || img.width);
    const sampleHeight = Math.round((img.naturalHeight || img.height) * scale);

    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    let minX = sampleWidth;
    let maxX = 0;
    let minY = sampleHeight;
    let maxY = 0;
    let skinPixelCount = 0;

    // YCbCr skin tone detector
    for (let y = 0; y < sampleHeight; y++) {
      for (let x = 0; x < sampleWidth; x++) {
        const idx = (y * sampleWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Standard RGB to YCbCr conversion
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Human skin tone cluster in YCbCr space
        const isSkin = Y > 40 && Cb >= 77 && Cb <= 135 && Cr >= 133 && Cr <= 185;

        // Prioritize upper 65% of the frame (typical portrait head location)
        const isPortraitRegion = y < sampleHeight * 0.75;

        if (isSkin && isPortraitRegion) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinPixelCount > (sampleWidth * sampleHeight) * 0.02 && maxX > minX && maxY > minY) {
      // Re-scale back to original image coordinates
      const origX = minX / scale;
      const origY = minY / scale;
      const origWidth = (maxX - minX) / scale;
      const origHeight = (maxY - minY) / scale;

      return {
        x: origX,
        y: origY,
        width: origWidth,
        height: origHeight,
        confidence: 0.75,
      };
    }
  } catch {
    // If canvas fails, return null
  }

  return null;
}

/**
 * Automatically crops an image to the target aspect ratio,
 * using face detection and smartcrop content-aware image processing
 * to position the face according to international biometric ID standards.
 */
export async function autoCropToBiometricId(
  sourceUrl: string,
  targetWidthMm: number,
  targetHeightMm: number
): Promise<AutoCropResult> {
  const img = await loadImageElement(sourceUrl);
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  const targetAspect = targetWidthMm / targetHeightMm;

  // 1. Detect face
  const face = await detectFace(img);

  let cropX = 0;
  let cropY = 0;
  let cropW = imgWidth;
  let cropH = imgHeight;

  if (face) {
    // Biometric ID Framing Standards:
    // - Face height occupies ~42% - 48% of the cropped frame (leaves space for neck and shoulders)
    // - Eye level is at ~38% - 42% from top of crop
    // - Face is horizontally centered
    const desiredFaceFraction = 0.45;
    cropH = Math.min(imgHeight, face.height / desiredFaceFraction);
    cropW = cropH * targetAspect;

    // If crop width exceeds image width, clamp and recalculate
    if (cropW > imgWidth) {
      cropW = imgWidth;
      cropH = cropW / targetAspect;
    }

    // Center horizontally on face center
    const faceCenterX = face.x + face.width / 2;
    cropX = faceCenterX - cropW / 2;

    // Position vertically so crown/hair has elegant headroom
    const faceCenterY = face.y + face.height / 2;
    cropY = faceCenterY - cropH * 0.40;

    // Clamp within image bounds
    if (cropX < 0) cropX = 0;
    if (cropX + cropW > imgWidth) cropX = imgWidth - cropW;
    if (cropY < 0) cropY = 0;
    if (cropY + cropH > imgHeight) cropY = imgHeight - cropH;
  } else {
    // Fallback: Smartcrop content-aware saliency cropping
    try {
      const cropResult = await smartcrop.crop(img, {
        width: Math.round(targetWidthMm * 10),
        height: Math.round(targetHeightMm * 10),
        minScale: 0.8,
      });
      if (cropResult && cropResult.topCrop) {
        cropX = cropResult.topCrop.x;
        cropY = cropResult.topCrop.y;
        cropW = cropResult.topCrop.width;
        cropH = cropResult.topCrop.height;
      }
    } catch {
      // Standard center crop
      if (imgWidth / imgHeight > targetAspect) {
        cropW = imgHeight * targetAspect;
        cropX = (imgWidth - cropW) / 2;
      } else {
        cropH = imgWidth / targetAspect;
        cropY = (imgHeight - cropH) / 2;
      }
    }
  }

  // Render cropped canvas
  const canvas = document.createElement('canvas');
  const dpr = 2; // high-res preview
  canvas.width = Math.round(cropW * dpr);
  canvas.height = Math.round(cropH * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  }

  // Calculate equivalent zoom and offsets for PrintStudio manual controls
  const imgAspect = imgWidth / imgHeight;
  let baseFitScale = 1;
  if (imgAspect > targetAspect) {
    baseFitScale = imgHeight;
  } else {
    baseFitScale = imgWidth / targetAspect;
  }
  const zoom = Math.max(1, Math.min(1.6, Number((baseFitScale / cropH).toFixed(2))));

  // Normalized offsets (-50 to 50 scale)
  const centerX = imgWidth / 2;
  const centerY = imgHeight / 2;
  const cropCenterX = cropX + cropW / 2;
  const cropCenterY = cropY + cropH / 2;
  const offsetX = Math.round(((centerX - cropCenterX) / imgWidth) * 100);
  const offsetY = Math.round(((centerY - cropCenterY) / imgHeight) * 100);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    zoom,
    offsetX: Math.max(-50, Math.min(50, offsetX)),
    offsetY: Math.max(-50, Math.min(50, offsetY)),
    detectedFace: face,
    cropBox: { x: cropX, y: cropY, width: cropW, height: cropH },
  };
}
