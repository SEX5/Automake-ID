import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  TextRun,
  convertMillimetersToTwip,
  PageOrientation,
  TableLayoutType,
  HeightRule,
} from 'docx';
import { PAPER_DIMENSIONS, ID_SIZE_PRESETS } from '../constants/presets';
import { PrintSettings } from '../types';

/**
 * Convert a base64 string, URL, ArrayBuffer or Uint8Array into Uint8Array safely
 */
export async function resolveImageBytes(input: string | Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof input === 'string') {
    // If it's a URL or relative asset path (e.g. /src/assets/... or http:// or blob:)
    if (
      input.startsWith('http://') ||
      input.startsWith('https://') ||
      input.startsWith('/') ||
      input.startsWith('./') ||
      input.startsWith('../') ||
      input.startsWith('blob:')
    ) {
      if (typeof fetch !== 'undefined') {
        const res = await fetch(input);
        const arr = await res.arrayBuffer();
        return new Uint8Array(arr);
      }
    }

    // It's a base64 data string (with or without 'data:...;base64,' prefix)
    const commaIndex = input.indexOf(',');
    let base64Data = (commaIndex !== -1 ? input.slice(commaIndex + 1) : input).replace(/[\s\r
]/g, '');

    // Cross-environment base64 decode (Node.js)
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64Data, 'base64'));
    }

    // Browser environment
    try {
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      // Robust browser fallback via fetch
      const res = await fetch(`data:application/octet-stream;base64,${base64Data}`);
      const arr = await res.arrayBuffer();
      return new Uint8Array(arr);
    }
  }
  throw new Error('Unsupported image data type');
}

/**
 * 1 mm = 3.779527559 pixels at standard 96 DPI
 */
export function mmToPixels(mm: number): number {
  return Math.round(mm * 3.779527559);
}

export interface DocxGenerateOptions {
  settings: PrintSettings;
  imageBytes?: Uint8Array | string;
  imageBytesMap?: Record<string, Uint8Array | string>;
  /** Cell keys ("<blockIndex>:<cellIndex>") to leave blank — e.g. already-cut cells on a reused paper. */
  skipCells?: string[];
  imageResolver?: (widthMm: number, heightMm: number) => Promise<Uint8Array | string> | Uint8Array | string;
  badgeDetails?: {
    name?: string;
    idNumber?: string;
    role?: string;
    organization?: string;
  };
}

/**
 * Ensure image matches target aspect ratio without distortion
 */
export async function cropToTargetAspectRatio(
  sourceBytes: Uint8Array,
  targetWidthMm: number,
  targetHeightMm: number
): Promise<Uint8Array> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return sourceBytes;
  }
  return new Promise((resolve) => {
    const blob = new Blob([sourceBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const targetAspect = targetWidthMm / targetHeightMm;
      const imgAspect = img.naturalWidth / img.naturalHeight;

      // If aspect ratio is already within 1.5%, no cropping needed
      if (Math.abs(imgAspect - targetAspect) < 0.015) {
        return resolve(sourceBytes);
      }

      // Crop center to exact targetAspect
      let sx = 0;
      let sy = 0;
      let sWidth = img.naturalWidth;
      let sHeight = img.naturalHeight;

      if (imgAspect > targetAspect) {
        // Image is wider than target: crop left and right
        sWidth = img.naturalHeight * targetAspect;
        sx = (img.naturalWidth - sWidth) / 2;
      } else {
        // Image is taller than target: crop top and bottom
        sHeight = img.naturalWidth / targetAspect;
        sy = (img.naturalHeight - sHeight) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sWidth);
      canvas.height = Math.round(sHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(sourceBytes);

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => {
        if (!b) return resolve(sourceBytes);
        b.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(sourceBytes);
    };
    img.src = url;
  });
}

/**
 * Generates an OpenXML (.docx) Document buffer with strictly locked physical millimeter sizing
 */
export async function generateIdPrintDocx(options: DocxGenerateOptions): Promise<Uint8Array> {
  const { settings } = options;

  const defaultRawBytes = options.imageBytes ? await resolveImageBytes(options.imageBytes) : null;
  const resolvedImagesMap: Record<string, Uint8Array> = {};

  if (options.imageBytesMap) {
    for (const [key, val] of Object.entries(options.imageBytesMap)) {
      resolvedImagesMap[key] = await resolveImageBytes(val);
    }
  }

  const getImageBytesForSize = async (wMm: number, hMm: number): Promise<Uint8Array> => {
    const exactKey = `${wMm}x${hMm}`;
    const roundedKey = `${Math.round(wMm * 10) / 10}x${Math.round(hMm * 10) / 10}`;

    let baseBytes: Uint8Array | null = null;
    if (resolvedImagesMap[exactKey]) {
      baseBytes = resolvedImagesMap[exactKey];
    } else if (resolvedImagesMap[roundedKey]) {
      baseBytes = resolvedImagesMap[roundedKey];
    } else if (options.imageResolver) {
      const res = await options.imageResolver(wMm, hMm);
      baseBytes = await resolveImageBytes(res);
    } else if (defaultRawBytes) {
      baseBytes = defaultRawBytes;
    }

    if (!baseBytes) {
      throw new Error(`No image data provided for size ${wMm}x${hMm}mm`);
    }

    return await cropToTargetAspectRatio(baseBytes, wMm, hMm);
  };

  const preset = ID_SIZE_PRESETS.find((p) => p.id === settings.sizeId) || ID_SIZE_PRESETS[0];
  const paper = PAPER_DIMENSIONS[settings.paperSize] || PAPER_DIMENSIONS.a4;

  const widthMm = settings.sizeId === 'custom' && settings.customWidthMm ? settings.customWidthMm : preset.widthMm;
  const heightMm = settings.sizeId === 'custom' && settings.customHeightMm ? settings.customHeightMm : preset.heightMm;

  // Margin in twips (10mm ~ 567 twips, 12.7mm = 720 twips)
  const marginMm = settings.marginMm || 10;
  const marginTwips = convertMillimetersToTwip(marginMm);
  const usableWidthMm = paper.widthMm - marginMm * 2;
  const usableHeightMm = paper.heightMm - marginMm * 2;

  // Spacing between photos in mm
  const spacingMm = settings.spacingMm || 4;
  const spacingTwips = convertMillimetersToTwip(spacingMm);

  const skipSet = new Set(options.skipCells ?? []);

  // Border style for cut guides
  const cutBorderStyle =
    settings.cutLineStyle === 'solid'
      ? BorderStyle.SINGLE
      : settings.cutLineStyle === 'hairline'
      ? BorderStyle.DOTTED
      : BorderStyle.DASHED;

  const cutBorderColor = settings.cutLineColor ? settings.cutLineColor.replace('#', '') : '94A3B8';

  const cellBorder = settings.showCutLines
    ? {
        top: { style: cutBorderStyle, size: 2, color: cutBorderColor },
        bottom: { style: cutBorderStyle, size: 2, color: cutBorderColor },
        left: { style: cutBorderStyle, size: 2, color: cutBorderColor },
        right: { style: cutBorderStyle, size: 2, color: cutBorderColor },
      }
    : {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      };

  const emptyBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // Helper to build a photo cell with locked dimensions and no padding
  const createPhotoCell = (cellWidthMm: number, cellHeightMm: number, imageBytesForCell: Uint8Array) => {
    const imgWidthPx = mmToPixels(cellWidthMm);
    const imgHeightPx = mmToPixels(cellHeightMm);
    const cellWidthTwips = convertMillimetersToTwip(cellWidthMm);

    const cellChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            data: imageBytesForCell,
            transformation: {
              width: imgWidthPx,
              height: imgHeightPx,
            },
            type: 'jpg',
          }),
        ],
      }),
    ];

    return new TableCell({
      width: { size: cellWidthTwips, type: WidthType.DXA },
      borders: cellBorder,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: cellChildren,
    });
  };

  /**
   * Helper to build a grid table with strictly locked physical dimensions:
   * 1. Uses TableLayoutType.FIXED so Word never stretches columns to page width.
   * 2. Specifies explicit columnWidths array for all photo and spacer columns.
   * 3. Uses exact total table width in DXA twips.
   * 4. Uses HeightRule.EXACT on every TableRow.
   * 5. Preserves symmetrical grid layout on spacer rows so Word never recalculates/distorts columns.
   */
  const createFixedPhotoGridTable = (
    itemWidthMm: number,
    itemHeightMm: number,
    totalCount: number,
    imageBytesForTable: Uint8Array,
    blockIdx: number
  ): Table => {
    const itemColWidthTwips = convertMillimetersToTwip(itemWidthMm);
    const itemColHeightTwips = convertMillimetersToTwip(itemHeightMm);

    // Number of columns that can physically fit within usable width
    const maxCols = Math.max(1, Math.floor((usableWidthMm + spacingMm) / (itemWidthMm + spacingMm)));
    const activeCols = Math.min(maxCols, totalCount);
    const rowsCount = Math.ceil(totalCount / activeCols);

    // Build the exact column widths array for the table grid (alternating photo and spacer columns)
    const columnWidths: number[] = [];
    for (let c = 0; c < activeCols; c++) {
      if (c > 0 && spacingTwips > 0) {
        columnWidths.push(spacingTwips);
      }
      columnWidths.push(itemColWidthTwips);
    }
    const totalTableWidthTwips = columnWidths.reduce((a, b) => a + b, 0);

    const tableRows: TableRow[] = [];
    let itemIndex = 0;

    for (let r = 0; r < rowsCount; r++) {
      // Add a gap spacer row between photo rows with an IDENTICAL column grid to preserve table geometry
      if (r > 0 && spacingTwips > 0) {
        const spacerRowCells = columnWidths.map(
          (w) =>
            new TableCell({
              width: { size: w, type: WidthType.DXA },
              borders: emptyBorder,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
            })
        );
        tableRows.push(
          new TableRow({
            height: { value: spacingTwips, rule: HeightRule.EXACT },
            cantSplit: true,
            children: spacerRowCells,
          })
        );
      }

      // Add the photo row
      const photoRowCells: TableCell[] = [];
      for (let c = 0; c < activeCols; c++) {
        if (c > 0 && spacingTwips > 0) {
          photoRowCells.push(
            new TableCell({
              width: { size: spacingTwips, type: WidthType.DXA },
              borders: emptyBorder,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
            })
          );
        }
        if (itemIndex < totalCount) {
          if (skipSet.has(`${blockIdx}:${itemIndex}`)) {
            // Cut cell on a reused paper — blank filler, no photo, no border
            photoRowCells.push(
              new TableCell({
                width: { size: itemColWidthTwips, type: WidthType.DXA },
                borders: emptyBorder,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
              })
            );
          } else {
            photoRowCells.push(createPhotoCell(itemWidthMm, itemHeightMm, imageBytesForTable));
          }
          itemIndex++;
        } else {
          // Empty filler cell to keep grid columns strictly aligned
          photoRowCells.push(
            new TableCell({
              width: { size: itemColWidthTwips, type: WidthType.DXA },
              borders: emptyBorder,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
            })
          );
        }
      }

      tableRows.push(
        new TableRow({
          height: { value: itemColHeightTwips, rule: HeightRule.EXACT },
          cantSplit: true,
          children: photoRowCells,
        })
      );
    }

    return new Table({
      layout: TableLayoutType.FIXED,
      alignment: AlignmentType.LEFT,
      width: { size: totalTableWidthTwips, type: WidthType.DXA },
      columnWidths,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      borders: emptyBorder,
      rows: tableRows,
    });
  };

  const docChildren: (Paragraph | Table)[] = [];

  const isCombo =
    settings.sizeId === 'custom_combo' ||
    preset.category === 'combo' ||
    Boolean(preset.comboItems && preset.comboItems.length > 0);

  const comboItems = isCombo
    ? settings.customComboItems && settings.customComboItems.length > 0
      ? settings.customComboItems.filter((item) => item.count > 0)
      : preset.comboItems && preset.comboItems.length > 0
      ? preset.comboItems.filter((item) => item.count > 0)
      : null
    : null;

  if (comboItems && comboItems.length > 0) {
    // Multi-size combo pack: each size gets its own strictly locked fixed table
    let blockIdx = 0;
    for (let i = 0; i < comboItems.length; i++) {
      const item = comboItems[i];
      if (item.count <= 0) continue;

      const itemBytes = await getImageBytesForSize(item.widthMm, item.heightMm);
      const gridTable = createFixedPhotoGridTable(item.widthMm, item.heightMm, item.count, itemBytes, blockIdx);
      blockIdx++;
      docChildren.push(gridTable);

      // Spacer between different photo size tables
      if (i < comboItems.length - 1) {
        docChildren.push(
          new Paragraph({
            spacing: { before: spacingTwips, after: spacingTwips },
            children: [],
          })
        );
      }
    }
  } else {
    // Standard single size grid table
    const itemBytes = await getImageBytesForSize(widthMm, heightMm);
    const gridTable = createFixedPhotoGridTable(widthMm, heightMm, settings.quantity, itemBytes, 0);
    docChildren.push(gridTable);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(paper.widthMm),
              height: convertMillimetersToTwip(paper.heightMm),
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwips,
              bottom: marginTwips,
              left: marginTwips,
              right: marginTwips,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  if (typeof window !== 'undefined' && typeof Packer.toBlob === 'function') {
    const blob = await Packer.toBlob(doc);
    const arrayBuf = await blob.arrayBuffer();
    return new Uint8Array(arrayBuf);
  } else {
    const buf = await Packer.toBuffer(doc);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
}
