import { jsPDF } from 'jspdf';
import { PAPER_DIMENSIONS, ID_SIZE_PRESETS } from '../constants/presets';
import { PrintSettings, PaperSize } from '../types';

export interface PdfGenerateOptions {
  settings: PrintSettings;
  imageBytes?: Uint8Array | string;
  imageBytesMap?: Record<string, Uint8Array | string>;
  /** Cell keys ("<blockIndex>:<cellIndex>") to leave blank — e.g. already-cut cells on a reused paper. */
  skipCells?: string[];
  /** Specific cell keys that contain the active photo to print. */
  activeCells?: string[];
}

function resolveDataUri(input: Uint8Array | string): string {
  if (typeof input === 'string') {
    if (input.startsWith('data:')) return input;
    return `data:image/jpeg;base64,${input}`;
  }
  // Convert Uint8Array to base64
  let binary = '';
  const len = input.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(input[i]);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

export async function generateIdPrintPdf(options: PdfGenerateOptions): Promise<Uint8Array> {
  const { settings } = options;
  const paper = PAPER_DIMENSIONS[settings.paperSize as PaperSize] || PAPER_DIMENSIONS.a4;
  const isA4 = settings.paperSize === 'a4';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
    compress: true,
  });

  const defaultImgUri = options.imageBytes ? resolveDataUri(options.imageBytes) : '';
  const uriMap: Record<string, string> = {};
  if (options.imageBytesMap) {
    for (const [k, v] of Object.entries(options.imageBytesMap)) {
      uriMap[k] = resolveDataUri(v);
    }
  }

  const getImageForSize = (wMm: number, hMm: number): string => {
    const exact = `${wMm}x${hMm}`;
    const rounded = `${Math.round(wMm * 10) / 10}x${Math.round(hMm * 10) / 10}`;
    return uriMap[exact] || uriMap[rounded] || defaultImgUri;
  };

  const preset = ID_SIZE_PRESETS.find((p) => p.id === settings.sizeId) || ID_SIZE_PRESETS[0];
  const isComboMode =
    settings.sizeId === 'custom_combo' ||
    preset.category === 'combo' ||
    (settings.customComboItems && settings.customComboItems.length > 0 && settings.sizeId !== '2x2' && settings.sizeId !== '1x1');

  const marginMm = settings.marginMm;
  const spacingMm = settings.spacingMm;
  const usableWidthMm = paper.widthMm - marginMm * 2;

  const skipSet = new Set(options.skipCells ?? []);

  let currentY = marginMm;

  const activeSet =
    options.activeCells && options.activeCells.length > 0
      ? new Set(options.activeCells)
      : null;

  const drawPhotoGrid = (
    wMm: number,
    hMm: number,
    count: number,
    blockIdx: number
  ) => {
    if (count <= 0) return;

    const cols = Math.max(1, Math.floor((usableWidthMm + spacingMm) / (wMm + spacingMm)));
    const imgUri = getImageForSize(wMm, hMm);
    const imgFormat = imgUri.startsWith('data:image/png')
      ? 'PNG'
      : imgUri.startsWith('data:image/webp')
      ? 'WEBP'
      : 'JPEG';

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = marginMm + col * (wMm + spacingMm);
      const y = currentY + row * (hMm + spacingMm);

      const cellKey = `${blockIdx}:${i}`;
      // Cut cell or slot not selected for active photo printing — leave blank
      if (skipSet.has(cellKey)) continue;
      if (activeSet && !activeSet.has(cellKey)) continue;

      if (imgUri) {
        doc.addImage(imgUri, imgFormat, x, y, wMm, hMm, undefined, 'FAST');
      }

      // Draw cut lines if enabled
      if (settings.showCutLines) {
        doc.setDrawColor(148, 163, 184); // #94A3B8
        if (settings.cutLineStyle === 'dashed') {
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.setLineWidth(0.2);
        } else if (settings.cutLineStyle === 'hairline') {
          doc.setLineDashPattern([], 0);
          doc.setLineWidth(0.1);
        } else {
          doc.setLineDashPattern([], 0);
          doc.setLineWidth(0.3);
        }
        doc.rect(x, y, wMm, hMm, 'S');
      }
    }

    const totalRows = Math.ceil(count / cols);
    currentY += totalRows * hMm + (totalRows - 1) * spacingMm;
  };

  if (isComboMode && settings.customComboItems && settings.customComboItems.length > 0) {
    let blockIdx = 0;
    for (const item of settings.customComboItems) {
      if (item.count <= 0) continue;
      let blockCount = item.count;
      if (options.activeCells && options.activeCells.length > 0) {
        for (const k of options.activeCells) {
          const [b, c] = k.split(':').map(Number);
          if (b === blockIdx && !isNaN(c)) {
            blockCount = Math.max(blockCount, c + 1);
          }
        }
      }
      if (options.skipCells && options.skipCells.length > 0) {
        for (const k of options.skipCells) {
          const [b, c] = k.split(':').map(Number);
          if (b === blockIdx && !isNaN(c)) {
            blockCount = Math.max(blockCount, c + 1);
          }
        }
      }
      drawPhotoGrid(item.widthMm, item.heightMm, blockCount, blockIdx);
      blockIdx++;
      currentY += spacingMm * 1.5;
    }
  } else {
    const singleWidthMm = settings.sizeId === 'custom' && settings.customWidthMm ? settings.customWidthMm : preset.widthMm;
    const singleHeightMm = settings.sizeId === 'custom' && settings.customHeightMm ? settings.customHeightMm : preset.heightMm;
    let singleCount = settings.quantity;
    if (options.activeCells && options.activeCells.length > 0) {
      for (const k of options.activeCells) {
        const [b, c] = k.split(':').map(Number);
        if (b === 0 && !isNaN(c)) {
          singleCount = Math.max(singleCount, c + 1);
        }
      }
    }
    if (options.skipCells && options.skipCells.length > 0) {
      for (const k of options.skipCells) {
        const [b, c] = k.split(':').map(Number);
        if (b === 0 && !isNaN(c)) {
          singleCount = Math.max(singleCount, c + 1);
        }
      }
    }
    drawPhotoGrid(singleWidthMm, singleHeightMm, singleCount, 0);
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
