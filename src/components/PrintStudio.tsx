import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  Sliders,
  Scissors,
  Layers,
  ZoomIn,
  Move,
  FileText,
  Check,
  RotateCw,
  RefreshCw,
  Image as ImageIcon,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  X,
  FileDown,
  ScanFace,
} from 'lucide-react';
import { ID_SIZE_PRESETS, PAPER_DIMENSIONS } from '../constants/presets';
import { ATTIRE_PRESETS } from '../constants/attirePresets';
import { SAMPLE_PHOTOS } from '../constants/sampleImages';
import { PrintSettings, PaperSize, ComboItem } from '../types';
import { generateIdPrintDocx } from '../services/docxGenerator';
import { generateIdPrintPdf } from '../services/pdfGenerator';
import { autoCropToBiometricId } from '../services/faceDetection';
import { renderProcessedPhoto, triggerFileDownload, fileToBase64 } from '../utils/imageHelpers';

interface PrintStudioProps {
  onNotify?: (msg: string) => void;
  initialPresetId?: string;
}

const DEFAULT_COMBO_ITEMS: ComboItem[] = [
  { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 4 },
  { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)', count: 8 },
];

const AVAILABLE_SIZES_TO_ADD = [
  { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)' },
  { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)' },
  { id: 'passport_schengen', widthMm: 35, heightMm: 45, label: '35 × 45 mm (Passport/Schengen)' },
  { id: 'visa_asia', widthMm: 45, heightMm: 45, label: '45 × 45 mm (Japan/Korea Visa)' },
  { id: 'wallet_photo', widthMm: 50, heightMm: 70, label: '50 × 70 mm (Wallet / 2" x 2.75")' },
  { id: 'cr80_badge', widthMm: 85.6, heightMm: 54, label: '85.6 × 54 mm (CR80 ID Badge)' },
];

export const PrintStudio: React.FC<PrintStudioProps> = ({ onNotify, initialPresetId }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(SAMPLE_PHOTOS[0].src);
  const [processedPhoto, setProcessedPhoto] = useState<string>(SAMPLE_PHOTOS[0].src);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [faceStatus, setFaceStatus] = useState<string | null>(null);
  const [presetFilter, setPresetFilter] = useState<'all' | 'single' | 'combo'>('all');
  const [isAddingCustomSize, setIsAddingCustomSize] = useState(false);
  const [customAddWidth, setCustomAddWidth] = useState(35);
  const [customAddHeight, setCustomAddHeight] = useState(45);
  const [customAddLabel, setCustomAddLabel] = useState('Custom Size');
  const [isGeneratingAiAttire, setIsGeneratingAiAttire] = useState(false);
  const [aiAttireType, setAiAttireType] = useState('men_suit');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialPreset =
    ID_SIZE_PRESETS.find((p) => p.id === initialPresetId) || ID_SIZE_PRESETS[0];
  const initialIsCombo =
    initialPreset.id === 'custom_combo' ||
    initialPreset.category === 'combo' ||
    !!initialPreset.comboItems;

  const [settings, setSettings] = useState<PrintSettings>({
    sizeId: initialPreset.id,
    customWidthMm: 50,
    customHeightMm: 50,
    quantity: 6,
    paperSize: 'a4',
    showCutLines: true,
    cutLineStyle: 'dashed',
    cutLineColor: '#94A3B8',
    spacingMm: 4,
    marginMm: 12,
    includeLabels: false,
    backgroundColor: '#FFFFFF',
    photoZoom: 1,
    photoOffsetX: 0,
    photoOffsetY: 0,
    attireId: 'none',
    attireScale: 1.0,
    attireOffsetY: 12,
    customComboItems: initialIsCombo ? DEFAULT_COMBO_ITEMS : undefined,
  });

  const currentPreset =
    ID_SIZE_PRESETS.find((p) => p.id === settings.sizeId) || ID_SIZE_PRESETS[0];
  const currentPaper = PAPER_DIMENSIONS[settings.paperSize];

  const isComboMode =
    settings.sizeId === 'custom_combo' ||
    currentPreset.category === 'combo' ||
    !!currentPreset.comboItems;

  const activeComboItems: ComboItem[] = isComboMode
    ? (settings.customComboItems && settings.customComboItems.length > 0
        ? settings.customComboItems
        : currentPreset.comboItems || DEFAULT_COMBO_ITEMS)
    : [];

  const widthMm =
    settings.sizeId === 'custom' && settings.customWidthMm
      ? settings.customWidthMm
      : currentPreset.widthMm;
  const heightMm =
    settings.sizeId === 'custom' && settings.customHeightMm
      ? settings.customHeightMm
      : currentPreset.heightMm;

  // Process and crop photo whenever zoom, background, size or attire changes
  useEffect(() => {
    let isCancelled = false;
    async function updateRenderedPhoto() {
      try {
        const rendered = await renderProcessedPhoto({
          sourceImage: selectedPhoto,
          targetWidthMm: widthMm,
          targetHeightMm: heightMm,
          zoom: settings.photoZoom,
          offsetX: settings.photoOffsetX,
          offsetY: settings.photoOffsetY,
          backgroundColor: settings.backgroundColor,
          attireId: settings.attireId || 'none',
          attireScale: settings.attireScale || 1.0,
          attireOffsetY: settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12,
          dpi: 300,
        });
        if (!isCancelled) {
          setProcessedPhoto(rendered);
        }
      } catch (err) {
        console.error('Photo rendering error:', err);
      }
    }
    updateRenderedPhoto();
    return () => {
      isCancelled = true;
    };
  }, [
    selectedPhoto,
    widthMm,
    heightMm,
    settings.photoZoom,
    settings.photoOffsetX,
    settings.photoOffsetY,
    settings.backgroundColor,
    settings.attireId,
    settings.attireScale,
    settings.attireOffsetY,
  ]);

  const handleGenerateAiAttire = async (attireChoice?: string) => {
    const choice = attireChoice || aiAttireType;
    setIsGeneratingAiAttire(true);
    if (onNotify) onNotify('✨ Generating AI tailored business attire with Gemini...');
    try {
      const res = await fetch('/api/ai/attire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedPhoto,
          attireType: choice,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setSelectedPhoto(data.imageUrl);
        setSettings((s) => ({ ...s, attireId: 'none' })); // Reset vector overlay since AI baked in formal clothing
        if (onNotify) onNotify('✨ AI Formal Attire applied to portrait!');
      } else {
        if (onNotify) onNotify(data.error || 'AI Attire generation failed. You can use vector attire overlays below.');
      }
    } catch (err: any) {
      console.error('AI Attire error:', err);
      if (onNotify) onNotify('AI Attire service error: ' + (err.message || 'unknown'));
    } finally {
      setIsGeneratingAiAttire(false);
    }
  };

  const handleAutoDetectFace = async (photoSrc?: string, targetW?: number, targetH?: number) => {
    const photo = photoSrc || selectedPhoto;
    const w = targetW || widthMm;
    const h = targetH || heightMm;
    setIsDetectingFace(true);
    setFaceStatus(null);
    try {
      const result = await autoCropToBiometricId(photo, w, h);
      setSettings((prev) => ({
        ...prev,
        photoZoom: result.zoom,
        photoOffsetX: result.offsetX,
        photoOffsetY: result.offsetY,
      }));
      if (result.detectedFace) {
        setFaceStatus('Face detected & biometrically framed');
        if (onNotify) onNotify('Face detected: Automatically centered & framed to ID standards');
      } else {
        setFaceStatus('Smart-cropped to focal area');
        if (onNotify) onNotify('Smart-cropped to focal area');
      }
    } catch (err: any) {
      console.error('Face detection error:', err);
      if (onNotify) onNotify('Auto-crop notice: Used optimal center framing');
    } finally {
      setIsDetectingFace(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setSelectedPhoto(base64);
      await handleAutoDetectFace(base64);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = ID_SIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.category === 'combo' || preset.comboItems) {
      setSettings((prev) => ({
        ...prev,
        sizeId: presetId,
        customComboItems: preset.comboItems
          ? preset.comboItems.map((c) => ({ ...c }))
          : prev.customComboItems && prev.customComboItems.length > 0
          ? prev.customComboItems
          : DEFAULT_COMBO_ITEMS,
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        sizeId: presetId,
        customComboItems: undefined,
      }));
    }
  };

  // Combo quantity modifiers
  const handleUpdateComboCount = (idOrIndex: string | number, newCount: number) => {
    const count = Math.max(0, Math.min(60, newCount));
    setSettings((prev) => {
      const list = [...(prev.customComboItems || DEFAULT_COMBO_ITEMS)];
      if (typeof idOrIndex === 'string') {
        const idx = list.findIndex((item) => (item.id || item.label) === idOrIndex);
        if (idx !== -1) {
          list[idx] = { ...list[idx], count };
        } else {
          // If not in list, find from available sizes
          const template = AVAILABLE_SIZES_TO_ADD.find((s) => s.id === idOrIndex);
          if (template) {
            list.push({ ...template, count });
          }
        }
      } else if (typeof idOrIndex === 'number' && list[idOrIndex]) {
        list[idOrIndex] = { ...list[idOrIndex], count };
      }
      return {
        ...prev,
        sizeId: 'custom_combo', // switch to custom_combo to reflect customized state
        customComboItems: list,
      };
    });
  };

  const handleAddAvailableSize = (sizeDef: { id: string; widthMm: number; heightMm: number; label: string }, initialCount = 4) => {
    setSettings((prev) => {
      const list = [...(prev.customComboItems || DEFAULT_COMBO_ITEMS)];
      const existingIdx = list.findIndex((item) => item.id === sizeDef.id || (item.widthMm === sizeDef.widthMm && item.heightMm === sizeDef.heightMm));
      if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], count: list[existingIdx].count + initialCount };
      } else {
        list.push({
          id: sizeDef.id,
          widthMm: sizeDef.widthMm,
          heightMm: sizeDef.heightMm,
          label: sizeDef.label,
          count: initialCount,
        });
      }
      return {
        ...prev,
        sizeId: 'custom_combo',
        customComboItems: list,
      };
    });
    if (onNotify) onNotify(`Added ${sizeDef.label} to custom mix`);
  };

  const handleRemoveComboItem = (index: number) => {
    setSettings((prev) => {
      const list = [...(prev.customComboItems || DEFAULT_COMBO_ITEMS)];
      list.splice(index, 1);
      return {
        ...prev,
        sizeId: 'custom_combo',
        customComboItems: list,
      };
    });
  };

  const handleApplyQuickBundle = (type: 'classic_4_8' | 'job_2_6' | 'visa_pack' | 'trio_pack' | 'power_6_12' | 'clear') => {
    let newItems: ComboItem[] = [];
    if (type === 'classic_4_8') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 4 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)', count: 8 },
      ];
      if (onNotify) onNotify('Loaded 4x 2x2" + 8x 1x1" bundle');
    } else if (type === 'job_2_6') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 2 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)', count: 6 },
      ];
      if (onNotify) onNotify('Loaded 2x 2x2" + 6x 1x1" Job Seeker bundle');
    } else if (type === 'visa_pack') {
      newItems = [
        { id: 'passport_schengen', widthMm: 35, heightMm: 45, label: '35 × 45 mm (Passport/Schengen)', count: 4 },
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 4 },
      ];
      if (onNotify) onNotify('Loaded 4x 35x45mm + 4x 2x2" Visa Pack');
    } else if (type === 'trio_pack') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 2 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)', count: 4 },
        { id: 'passport_schengen', widthMm: 35, heightMm: 45, label: '35 × 45 mm (Passport/Schengen)', count: 2 },
      ];
      if (onNotify) onNotify('Loaded All-in-One Trio Pack (2x2 + 1x1 + 35x45)');
    } else if (type === 'power_6_12') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2" (50.8 × 50.8 mm)', count: 6 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1" (25.4 × 25.4 mm)', count: 12 },
      ];
      if (onNotify) onNotify('Loaded Full Page Pack (6x 2x2" + 12x 1x1")');
    } else if (type === 'clear') {
      newItems = (settings.customComboItems || DEFAULT_COMBO_ITEMS).map((item) => ({ ...item, count: 0 }));
      if (onNotify) onNotify('Cleared all photo quantities');
    }

    setSettings((prev) => ({
      ...prev,
      sizeId: 'custom_combo',
      customComboItems: newItems,
    }));
  };

  const handleAddCustomDimensionItem = () => {
    if (customAddWidth <= 0 || customAddHeight <= 0) return;
    const label = `${customAddLabel || 'Custom'} (${customAddWidth} × ${customAddHeight} mm)`;
    setSettings((prev) => ({
      ...prev,
      sizeId: 'custom_combo',
      customComboItems: [
        ...(prev.customComboItems || DEFAULT_COMBO_ITEMS),
        {
          id: `custom_${Date.now()}`,
          widthMm: customAddWidth,
          heightMm: customAddHeight,
          label,
          count: 4,
        },
      ],
    }));
    setIsAddingCustomSize(false);
    if (onNotify) onNotify(`Added ${label} (4 pcs)`);
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const exportSettings: PrintSettings = {
        ...settings,
        customComboItems: isComboMode ? activeComboItems : undefined,
      };

      // Collect all unique physical dimensions needed for this export
      const uniqueSizes: { widthMm: number; heightMm: number }[] = [];
      if (isComboMode) {
        activeComboItems
          .filter((c) => c.count > 0)
          .forEach((c) => {
            if (!uniqueSizes.some((u) => u.widthMm === c.widthMm && u.heightMm === c.heightMm)) {
              uniqueSizes.push({ widthMm: c.widthMm, heightMm: c.heightMm });
            }
          });
      } else {
        uniqueSizes.push({ widthMm, heightMm });
      }

      // Pre-render crisp 300 DPI images tailored to each exact aspect ratio (prevents stretching)
      const imageBytesMap: Record<string, string> = {};
      for (const sz of uniqueSizes) {
        const renderedDataUrl = await renderProcessedPhoto({
          sourceImage: selectedPhoto,
          targetWidthMm: sz.widthMm,
          targetHeightMm: sz.heightMm,
          zoom: settings.photoZoom,
          offsetX: settings.photoOffsetX,
          offsetY: settings.photoOffsetY,
          backgroundColor: settings.backgroundColor,
          attireId: settings.attireId || 'none',
          attireScale: settings.attireScale || 1.0,
          attireOffsetY: settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12,
          dpi: 300,
        });
        const exactKey = `${sz.widthMm}x${sz.heightMm}`;
        const roundedKey = `${Math.round(sz.widthMm * 10) / 10}x${Math.round(sz.heightMm * 10) / 10}`;
        imageBytesMap[exactKey] = renderedDataUrl;
        imageBytesMap[roundedKey] = renderedDataUrl;
      }

      const docxBytes = await generateIdPrintDocx({
        settings: exportSettings,
        imageBytes: processedPhoto,
        imageBytesMap,
      });

      let fileName = '';
      if (isComboMode) {
        const countsSummary = activeComboItems
          .filter((c) => c.count > 0)
          .map((c) => `${c.count}x${c.id || Math.round(c.widthMm)}`)
          .join('_');
        fileName = `ID_Print_Mix_${countsSummary || 'Custom'}_${settings.paperSize.toUpperCase()}.docx`;
      } else {
        fileName = `ID_Print_${settings.sizeId}_${settings.quantity}pcs_${settings.paperSize.toUpperCase()}.docx`;
      }

      triggerFileDownload(docxBytes, fileName);
      if (onNotify) onNotify(`Downloaded ${fileName}`);
    } catch (err: any) {
      console.error('DOCX export error:', err);
      if (onNotify) onNotify('Export failed: ' + (err.message || 'unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const exportSettings: PrintSettings = {
        ...settings,
        customComboItems: isComboMode ? activeComboItems : undefined,
      };

      const uniqueSizes: { widthMm: number; heightMm: number }[] = [];
      if (isComboMode) {
        activeComboItems
          .filter((c) => c.count > 0)
          .forEach((c) => {
            if (!uniqueSizes.some((u) => u.widthMm === c.widthMm && u.heightMm === c.heightMm)) {
              uniqueSizes.push({ widthMm: c.widthMm, heightMm: c.heightMm });
            }
          });
      } else {
        uniqueSizes.push({ widthMm, heightMm });
      }

      const imageBytesMap: Record<string, string> = {};
      for (const sz of uniqueSizes) {
        const renderedDataUrl = await renderProcessedPhoto({
          sourceImage: selectedPhoto,
          targetWidthMm: sz.widthMm,
          targetHeightMm: sz.heightMm,
          zoom: settings.photoZoom,
          offsetX: settings.photoOffsetX,
          offsetY: settings.photoOffsetY,
          backgroundColor: settings.backgroundColor,
          attireId: settings.attireId || 'none',
          attireScale: settings.attireScale || 1.0,
          attireOffsetY: settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12,
          dpi: 300,
        });
        const exactKey = `${sz.widthMm}x${sz.heightMm}`;
        const roundedKey = `${Math.round(sz.widthMm * 10) / 10}x${Math.round(sz.heightMm * 10) / 10}`;
        imageBytesMap[exactKey] = renderedDataUrl;
        imageBytesMap[roundedKey] = renderedDataUrl;
      }

      const pdfBytes = await generateIdPrintPdf({
        settings: exportSettings,
        imageBytes: processedPhoto,
        imageBytesMap,
      });

      let fileName = '';
      if (isComboMode) {
        const countsSummary = activeComboItems
          .filter((c) => c.count > 0)
          .map((c) => `${c.count}x${c.id || Math.round(c.widthMm)}`)
          .join('_');
        fileName = `ID_Print_Mix_${countsSummary || 'Custom'}_${settings.paperSize.toUpperCase()}.pdf`;
      } else {
        fileName = `ID_Print_${settings.sizeId}_${settings.quantity}pcs_${settings.paperSize.toUpperCase()}.pdf`;
      }

      triggerFileDownload(pdfBytes, fileName);
      if (onNotify) onNotify(`Downloaded ${fileName} — Ready to print at 100% scale`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      if (onNotify) onNotify('PDF export failed: ' + (err.message || 'unknown error'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleBrowserPrint = async () => {
    setIsPrintModalOpen(true);
    try {
      if (onNotify) onNotify('Opening Browser Print preview...');

      // Find or create hidden print iframe for isolated clean printing
      let printFrame = document.getElementById('idprint-hidden-print-frame') as HTMLIFrameElement;
      if (printFrame && printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      printFrame = document.createElement('iframe');
      printFrame.id = 'idprint-hidden-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDoc) {
        return;
      }

      // Pre-render size-specific images for each unique physical dimension to prevent stretching
      const uniqueSizes: { widthMm: number; heightMm: number }[] = [];
      if (isComboMode) {
        activeComboItems
          .filter((c) => c.count > 0)
          .forEach((c) => {
            if (!uniqueSizes.some((u) => u.widthMm === c.widthMm && u.heightMm === c.heightMm)) {
              uniqueSizes.push({ widthMm: c.widthMm, heightMm: c.heightMm });
            }
          });
      } else {
        uniqueSizes.push({ widthMm, heightMm });
      }

      const sizeImageMap: Record<string, string> = {};
      for (const sz of uniqueSizes) {
        const key = `${sz.widthMm}x${sz.heightMm}`;
        try {
          const rendered = await renderProcessedPhoto({
            sourceImage: selectedPhoto,
            targetWidthMm: sz.widthMm,
            targetHeightMm: sz.heightMm,
            zoom: settings.photoZoom,
            offsetX: settings.photoOffsetX,
            offsetY: settings.photoOffsetY,
            backgroundColor: settings.backgroundColor,
            attireId: settings.attireId || 'none',
            attireScale: settings.attireScale || 1.0,
            attireOffsetY: settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12,
            dpi: 300,
          });
          sizeImageMap[key] = rendered;
        } catch {
          sizeImageMap[key] = processedPhoto;
        }
      }

      const paperSizeName = settings.paperSize === 'letter' ? 'letter' : 'a4';
      const cutLineBorder = settings.showCutLines
        ? `1px ${settings.cutLineStyle === 'dashed' ? 'dashed' : 'solid'} #94A3B8`
        : 'none';

      let itemsHtml = '';
      if (isComboMode) {
        const activeGroups = activeComboItems.filter((c) => c.count > 0);
        itemsHtml = activeGroups
          .map((group) => {
            const itemCols = Math.max(
              1,
              Math.floor((usableWidthMm + settings.spacingMm) / (group.widthMm + settings.spacingMm))
            );
            const imgSrc = sizeImageMap[`${group.widthMm}x${group.heightMm}`] || processedPhoto;
            const photos = Array.from({ length: group.count })
              .map(
                () => `
                <div style="width: ${group.widthMm}mm; height: ${group.heightMm}mm; box-sizing: border-box; border: ${cutLineBorder}; position: relative; overflow: hidden; background: #ffffff;">
                  <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                </div>
              `
              )
              .join('');

            return `
              <div style="margin-bottom: ${settings.spacingMm * 1.5}mm;">
                <div style="display: grid; grid-template-columns: repeat(${itemCols}, ${group.widthMm}mm); gap: ${settings.spacingMm}mm; justify-content: start;">
                  ${photos}
                </div>
              </div>
            `;
          })
          .join('');
      } else {
        const imgSrc = sizeImageMap[`${widthMm}x${heightMm}`] || processedPhoto;
        const photos = Array.from({ length: settings.quantity })
          .map(
            () => `
            <div style="width: ${widthMm}mm; height: ${heightMm}mm; box-sizing: border-box; border: ${cutLineBorder}; position: relative; overflow: hidden; background: #ffffff;">
              <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
            </div>
          `
          )
          .join('');

        itemsHtml = `
          <div style="display: grid; grid-template-columns: repeat(${singleCols}, ${widthMm}mm); gap: ${settings.spacingMm}mm; justify-content: start;">
            ${photos}
          </div>
        `;
      }

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>ID Print Sheet - ${currentPaper.name}</title>
            <style>
              @page {
                size: ${paperSizeName} portrait;
                margin: 0;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                width: ${currentPaper.widthMm}mm;
                min-height: ${currentPaper.heightMm}mm;
              }
              .sheet {
                width: ${currentPaper.widthMm}mm;
                min-height: ${currentPaper.heightMm}mm;
                padding: ${settings.marginMm}mm;
                box-sizing: border-box;
                background: #ffffff;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              ${itemsHtml}
            </div>
          </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();

      const executePrint = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print():', err);
          window.print();
        }
      };

      const imgs = frameDoc.getElementsByTagName('img');
      if (imgs.length === 0) {
        setTimeout(executePrint, 100);
      } else {
        let loaded = 0;
        const total = imgs.length;
        const onDone = () => {
          loaded++;
          if (loaded >= total) {
            setTimeout(executePrint, 150);
          }
        };
        for (let i = 0; i < total; i++) {
          if (imgs[i].complete) {
            onDone();
          } else {
            imgs[i].onload = onDone;
            imgs[i].onerror = onDone;
          }
        }
        setTimeout(() => {
          if (loaded < total) executePrint();
        }, 800);
      }
    } catch (err: any) {
      console.error('Browser print error:', err);
      window.print();
    }
  };

  // Sheet dimensions & printable area
  const usableWidthMm = currentPaper.widthMm - settings.marginMm * 2;
  const usableHeightMm = currentPaper.heightMm - settings.marginMm * 2;
  const singleCols = Math.max(1, Math.floor((usableWidthMm + settings.spacingMm) / (widthMm + settings.spacingMm)));

  // Proportional physical scale for sheet preview matching real paper aspect ratio
  const PREVIEW_SHEET_WIDTH_PX = 620;
  const previewScale = PREVIEW_SHEET_WIDTH_PX / currentPaper.widthMm;
  const previewSheetHeightPx = Math.round(currentPaper.heightMm * previewScale);
  const previewMarginPx = Math.round(settings.marginMm * previewScale);
  const previewSpacingPx = Math.round(settings.spacingMm * previewScale);
  const singleItemWidthPx = Math.round(widthMm * previewScale);
  const singleItemHeightPx = Math.round(heightMm * previewScale);

  // Calculate combo layout capacity and sheet utilization
  let calculatedSheetHeightMm = 0;
  let totalComboPhotos = 0;

  if (isComboMode) {
    activeComboItems.forEach((item, idx) => {
      if (item.count > 0) {
        totalComboPhotos += item.count;
        const itemCols = Math.max(1, Math.floor((usableWidthMm + settings.spacingMm) / (item.widthMm + settings.spacingMm)));
        const itemRows = Math.ceil(item.count / itemCols);
        const itemBlockHeight = itemRows * item.heightMm + (itemRows - 1) * settings.spacingMm;
        calculatedSheetHeightMm += itemBlockHeight;
        if (idx > 0) {
          calculatedSheetHeightMm += settings.spacingMm * 1.5; // gap between blocks
        }
      }
    });
  }

  const capacityRatio = isComboMode
    ? Math.min(1.5, calculatedSheetHeightMm / usableHeightMm)
    : Math.min(1.5, ((Math.ceil(settings.quantity / singleCols) * heightMm) / usableHeightMm));
  const capacityPercent = Math.round(capacityRatio * 100);

  const totalItems = isComboMode ? totalComboPhotos : settings.quantity;

  const filteredPresets = ID_SIZE_PRESETS.filter((p) => {
    if (presetFilter === 'single') return p.category !== 'combo';
    if (presetFilter === 'combo') return p.category === 'combo';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Print Layout Studio</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Custom Multi-Size Support
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure exact physical dimensions, customize how many 2x2, 1x1, or passport photos to print on a sheet, and export to Microsoft Word (.docx).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBrowserPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Open Print Dialog or View Print Options"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || totalItems === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Download true 1:1 scale Print-Ready PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExporting || totalItems === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Download Microsoft Word .docx file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating DOCX...' : 'Download .docx'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Photo Source Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Photo Selection & Backdrop
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              {SAMPLE_PHOTOS.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo.src)}
                  className={`cursor-pointer rounded-lg p-2 border transition-all text-left ${
                    selectedPhoto === photo.src
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="aspect-square rounded overflow-hidden mb-1.5 bg-slate-800">
                    <img
                      src={photo.src}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate">{photo.name}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer mb-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Upload Custom Photo</span>
            </button>

            {/* Auto Face Detection & Biometric Cropping */}
            <button
              type="button"
              onClick={() => handleAutoDetectFace()}
              disabled={isDetectingFace}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Automatically detect face and crop to biometric ID proportions"
            >
              <ScanFace className={`w-4 h-4 text-blue-400 ${isDetectingFace ? 'animate-spin' : ''}`} />
              <span>{isDetectingFace ? 'Detecting Face & Cropping...' : 'Auto-Fit Face (Biometric Crop)'}</span>
            </button>

            {faceStatus && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{faceStatus}</span>
              </div>
            )}

            {/* Background Color Tint */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Background Tint / Canvas
              </label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Pure White', color: '#FFFFFF' },
                  { name: 'Soft Off-White', color: '#F8FAFC' },
                  { name: 'Light Visa Blue', color: '#E0F2FE' },
                  { name: 'Light Red', color: '#FEE2E2' },
                  { name: 'Soft Gray', color: '#E2E8F0' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    onClick={() => setSettings((s) => ({ ...s, backgroundColor: bg.color }))}
                    title={bg.name}
                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      settings.backgroundColor === bg.color
                        ? 'border-blue-500 ring-2 ring-blue-500/30 scale-110'
                        : 'border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: bg.color }}
                  >
                    {settings.backgroundColor === bg.color && (
                      <Check className="w-3.5 h-3.5 text-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom and Framing Sliders */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5" /> Photo Zoom
                </span>
                <span className="font-mono text-slate-300">
                  {Math.round(settings.photoZoom * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={settings.photoZoom}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, photoZoom: parseFloat(e.target.value) }))
                }
                className="w-full accent-blue-500 cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" /> Vertical Position
                </span>
                <span className="font-mono text-slate-300">
                  {settings.photoOffsetY > 0 ? `+${settings.photoOffsetY}` : settings.photoOffsetY}%
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="1"
                value={settings.photoOffsetY}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, photoOffsetY: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Proper Attire & Clothing Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👔 Formal Attire & Clothing</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attach official business wear for passport, visa, and license requirements
                </p>
              </div>
            </div>

            {/* AI Smart Attire Generator Section */}
            <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-slate-950 border border-blue-500/25 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Smart Attire Switcher</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini Vision
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Intelligently redresses casual clothes into tailored business attire while preserving your face, hair, and expression.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: 'men_suit', label: "👔 Men's Suit & Tie" },
                  { id: 'white_polo', label: '👔 Crisp White Polo' },
                  { id: 'women_blazer', label: "👗 Women's Blazer" },
                  { id: 'barong', label: '👔 Formal Barong' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAiAttireType(item.id);
                      handleGenerateAiAttire(item.id);
                    }}
                    disabled={isGeneratingAiAttire}
                    className="py-1.5 px-2 rounded-lg bg-slate-900/90 hover:bg-purple-900/30 border border-slate-700/80 hover:border-purple-500/50 text-[11px] text-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {isGeneratingAiAttire && (
                <div className="flex items-center justify-center gap-2 text-xs text-purple-300 py-1 font-medium animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Redressing photo with Gemini AI...</span>
                </div>
              )}
            </div>

            {/* Vector Attire Presets Grid */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Instant Attire Overlays (True Vector Scaling)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ATTIRE_PRESETS.map((attire) => {
                  const isSelected = (settings.attireId || 'none') === attire.id;
                  return (
                    <button
                      key={attire.id}
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          attireId: attire.id,
                          attireScale: attire.defaultScale,
                          attireOffsetY: attire.defaultOffsetY,
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/15 shadow-sm'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-white truncate block">
                          {attire.name}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
                        {attire.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tuning Sliders for Attire Fit */}
            {settings.attireId && settings.attireId !== 'none' && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Collar & Shoulder Alignment
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = ATTIRE_PRESETS.find((a) => a.id === settings.attireId);
                      setSettings((s) => ({
                        ...s,
                        attireScale: cur?.defaultScale || 1.0,
                        attireOffsetY: cur?.defaultOffsetY || 12,
                      }));
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Reset Fit
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Attire Width (Scale)</span>
                    <span className="font-mono text-slate-300">
                      {Math.round((settings.attireScale || 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.02"
                    value={settings.attireScale || 1.0}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, attireScale: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Collar Height (Vertical Position)</span>
                    <span className="font-mono text-slate-300">
                      {settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="1"
                    value={settings.attireOffsetY !== undefined ? settings.attireOffsetY : 12}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        attireOffsetY: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preset Size Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ID Size Preset
              </h3>

              {/* Filter Tabs */}
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setPresetFilter('all')}
                  className={`px-2 py-0.5 rounded ${
                    presetFilter === 'all'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPresetFilter('combo')}
                  className={`px-2 py-0.5 rounded ${
                    presetFilter === 'combo'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Multi-Mix
                </button>
                <button
                  onClick={() => setPresetFilter('single')}
                  className={`px-2 py-0.5 rounded ${
                    presetFilter === 'single'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Single
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = settings.sizeId === preset.id;
                const isCombo = preset.category === 'combo';

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/20'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{preset.name}</span>
                        {isCombo && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-medium">
                            Custom Mix
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {isCombo ? 'Multi' : `${preset.widthMm} × ${preset.heightMm} mm`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {preset.popularFor}
                    </p>
                  </button>
                );
              })}
            </div>

            {settings.sizeId === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={settings.customWidthMm || 50}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        customWidthMm: parseFloat(e.target.value) || 50,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Height (mm)</label>
                  <input
                    type="number"
                    value={settings.customHeightMm || 50}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        customHeightMm: parseFloat(e.target.value) || 50,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CUSTOM MULTI-SIZE BUILDER (when custom_combo or any combo is selected) */}
          {isComboMode ? (
            <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 space-y-4 shadow-lg shadow-purple-950/20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Custom Photo Quantities
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-purple-400">
                  {totalComboPhotos} total pcs
                </span>
              </div>

              {/* Quick Template Bundles */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-2">
                  Quick Bundles
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleApplyQuickBundle('classic_4_8')}
                    className="p-1.5 text-left rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 block">4x 2x2 + 8x 1x1</span>
                    <span className="text-[10px] text-slate-500">PH Gov & Clearances</span>
                  </button>
                  <button
                    onClick={() => handleApplyQuickBundle('job_2_6')}
                    className="p-1.5 text-left rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 block">2x 2x2 + 6x 1x1</span>
                    <span className="text-[10px] text-slate-500">Job Application Pack</span>
                  </button>
                  <button
                    onClick={() => handleApplyQuickBundle('visa_pack')}
                    className="p-1.5 text-left rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 block">4x 35x45 + 4x 2x2</span>
                    <span className="text-[10px] text-slate-500">US & Schengen Visa</span>
                  </button>
                  <button
                    onClick={() => handleApplyQuickBundle('trio_pack')}
                    className="p-1.5 text-left rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200 block">2x2 + 1x1 + 35x45</span>
                    <span className="text-[10px] text-slate-500">Trio All-in-One Pack</span>
                  </button>
                </div>
              </div>

              {/* Individual Size Counters */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-medium text-slate-400 block">
                  Set Copies for Each Size
                </label>

                {activeComboItems.map((item, index) => {
                  const is2x2 = item.widthMm === 50.8 && item.heightMm === 50.8;
                  const is1x1 = item.widthMm === 25.4 && item.heightMm === 25.4;

                  return (
                    <div
                      key={item.id || index}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {item.label}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {item.widthMm} × {item.heightMm} mm
                          </div>
                        </div>

                        {/* Counter Stepper */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateComboCount(item.id || index, item.count - 1)}
                            disabled={item.count <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 border border-slate-700 transition-colors cursor-pointer"
                            title="Decrease copies"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={item.count}
                            onChange={(e) =>
                              handleUpdateComboCount(
                                item.id || index,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-12 text-center bg-slate-900 border border-slate-700 rounded py-1 text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateComboCount(item.id || index, item.count + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                            title="Increase copies"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {activeComboItems.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveComboItem(index)}
                              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ml-1"
                              title="Remove size from mix"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Count Shortcuts */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500">Quick:</span>
                        {(is2x2
                          ? [0, 2, 4, 6, 8]
                          : is1x1
                          ? [0, 4, 8, 12, 16]
                          : [0, 2, 4, 6]
                        ).map((qty) => (
                          <button
                            key={qty}
                            onClick={() => handleUpdateComboCount(item.id || index, qty)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                              item.count === qty
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {qty}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Sizes / Custom Dimension */}
              <div className="pt-2 border-t border-slate-800">
                {!isAddingCustomSize ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_SIZES_TO_ADD.filter(
                        (avail) => !activeComboItems.some((cur) => cur.id === avail.id)
                      ).map((avail) => (
                        <button
                          key={avail.id}
                          onClick={() => handleAddAvailableSize(avail, 4)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-purple-400" />
                          <span>+ {avail.id === 'passport_schengen' ? 'Passport 35x45' : avail.id === 'visa_asia' ? 'Visa 45x45' : avail.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsAddingCustomSize(true)}
                      className="w-full text-center py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors cursor-pointer font-medium"
                    >
                      + Add Custom Millimeter Dimension
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950 border border-purple-500/40 rounded-lg space-y-2">
                    <div className="text-xs font-semibold text-purple-300">Add Custom ID Size</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Width (mm)</label>
                        <input
                          type="number"
                          value={customAddWidth}
                          onChange={(e) => setCustomAddWidth(parseFloat(e.target.value) || 10)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Height (mm)</label>
                        <input
                          type="number"
                          value={customAddHeight}
                          onChange={(e) => setCustomAddHeight(parseFloat(e.target.value) || 10)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Label (Optional)</label>
                      <input
                        type="text"
                        value={customAddLabel}
                        onChange={(e) => setCustomAddLabel(e.target.value)}
                        placeholder="e.g. Club Badge"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddCustomDimensionItem}
                        className="flex-1 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors cursor-pointer"
                      >
                        Add to Mix
                      </button>
                      <button
                        onClick={() => setIsAddingCustomSize(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 rounded transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sheet Capacity & Fit Bar */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    {capacityPercent <= 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    Sheet Fit ({currentPaper.name})
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      capacityPercent <= 80
                        ? 'text-emerald-400'
                        : capacityPercent <= 100
                        ? 'text-yellow-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {capacityPercent}% Page Height
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      capacityPercent <= 80
                        ? 'bg-emerald-500'
                        : capacityPercent <= 100
                        ? 'bg-yellow-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  />
                </div>

                <p className="text-[10px] text-slate-500">
                  {capacityPercent <= 100
                    ? `All ${totalComboPhotos} photos fit neatly on one standard ${currentPaper.name} page.`
                    : `⚠️ Photos may exceed 1 single page; check preview before printing.`}
                </p>
              </div>
            </div>
          ) : (
            /* Single Quantity Card (when not in combo mode) */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Copies on Sheet
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  Number of Copies on Sheet
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8, 12, 16, 20, 24].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setSettings((s) => ({ ...s, quantity: qty }))}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        settings.quantity === qty
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {qty} pcs
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paper Format & Cut Lines Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Paper & Cut Lines
            </h3>

            {/* Paper Size */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">Paper Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAPER_DIMENSIONS) as PaperSize[]).map((pSize) => (
                  <button
                    key={pSize}
                    onClick={() => setSettings((s) => ({ ...s, paperSize: pSize }))}
                    className={`p-2.5 rounded-lg text-left border transition-colors cursor-pointer ${
                      settings.paperSize === pSize
                        ? 'bg-blue-600/10 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">{PAPER_DIMENSIONS[pSize].name}</div>
                    <div className="text-[10px] text-slate-400">
                      {PAPER_DIMENSIONS[pSize].widthMm} × {PAPER_DIMENSIONS[pSize].heightMm} mm
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cut Lines */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-slate-400" /> Show Cut Guides
                </span>
                <input
                  type="checkbox"
                  checked={settings.showCutLines}
                  onChange={(e) => setSettings((s) => ({ ...s, showCutLines: e.target.checked }))}
                  className="rounded bg-slate-950 border-slate-700 accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {settings.showCutLines && (
                <div className="grid grid-cols-3 gap-2">
                  {(['dashed', 'solid', 'hairline'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setSettings((s) => ({ ...s, cutLineStyle: style }))}
                      className={`py-1 text-xs capitalize rounded border transition-colors cursor-pointer ${
                        settings.cutLineStyle === style
                          ? 'bg-slate-800 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Preview Labels toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">Show Labels in Preview</span>
                <input
                  type="checkbox"
                  checked={settings.includeLabels}
                  onChange={(e) => setSettings((s) => ({ ...s, includeLabels: e.target.checked }))}
                  className="rounded bg-slate-950 border-slate-700 accent-blue-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Spacing & Margins */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Photo Spacing Gap</span>
                <span className="font-mono text-slate-300">{settings.spacingMm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={settings.spacingMm}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, spacingMm: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Panel (A4 / Letter Physical Page Mockup) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-300">
                1:1 Scale Print Preview ({currentPaper.name} — {currentPaper.widthMm} ×{' '}
                {currentPaper.heightMm} mm)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              {isComboMode ? (
                <span>
                  Multi-Mix: {activeComboItems.filter((c) => c.count > 0).map((c) => `${c.count}x ${c.id || c.label.slice(0, 3)}`).join(' + ') || '0 pcs'}
                </span>
              ) : (
                <span>Columns: {singleCols} · Photos: {totalItems}</span>
              )}
            </div>
          </div>

          {/* Printable Sheet Viewport */}
          <div className="w-full overflow-x-auto p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-center">
            {/* Physical Paper Simulation matching Word OpenXML dimensions */}
            <div
              id="printable-sheet"
              className="bg-white text-slate-900 shadow-2xl relative transition-all"
              style={{
                width: `${PREVIEW_SHEET_WIDTH_PX}px`,
                minHeight: `${previewSheetHeightPx}px`,
                padding: `${previewMarginPx}px`,
                boxSizing: 'border-box',
              }}
            >
              {isComboMode ? (
                /* Multi-Size Combo layout */
                <div className="space-y-6">
                  {activeComboItems.filter((combo) => combo.count > 0).length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6">
                      <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                      <h4 className="text-sm font-semibold text-slate-700">No photos in mix yet</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Set how many 2x2 or 1x1 photos you need using the counters on the left panel or click a Quick Bundle.
                      </p>
                    </div>
                  ) : (
                    activeComboItems
                      .filter((combo) => combo.count > 0)
                      .map((combo, cIdx) => {
                        const itemCols = Math.max(
                          1,
                          Math.floor(
                            (usableWidthMm + settings.spacingMm) / (combo.widthMm + settings.spacingMm)
                          )
                        );
                        const cWidthPx = Math.round(combo.widthMm * previewScale);
                        const cHeightPx = Math.round(combo.heightMm * previewScale);

                        return (
                          <div key={cIdx} className="space-y-2">
                            {settings.includeLabels && (
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-200 pb-1">
                                <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  {combo.label}
                                </span>
                                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                  {combo.count} {combo.count === 1 ? 'copy' : 'copies'} ({combo.widthMm} × {combo.heightMm} mm)
                                </span>
                              </div>
                            )}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${itemCols}, ${cWidthPx}px)`,
                                gap: `${previewSpacingPx}px`,
                                justifyContent: 'start',
                              }}
                            >
                              {Array.from({ length: combo.count }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="relative group transition-all"
                                  style={{
                                    width: `${cWidthPx}px`,
                                    height: `${cHeightPx}px`,
                                    border: settings.showCutLines
                                      ? `1px ${settings.cutLineStyle} #94A3B8`
                                      : 'none',
                                  }}
                                >
                                  <img
                                    src={processedPhoto}
                                    alt="ID Item"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  {settings.showCutLines && (
                                    <Scissors className="w-2.5 h-2.5 text-slate-400 absolute -top-1.5 -left-1.5 opacity-60" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              ) : (
                /* Single size grid - strictly locked to Word table columns */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${singleCols}, ${singleItemWidthPx}px)`,
                    gap: `${previewSpacingPx}px`,
                    justifyContent: 'start',
                  }}
                >
                  {Array.from({ length: settings.quantity }).map((_, idx) => (
                    <div
                      key={idx}
                      className="relative transition-all"
                      style={{
                        width: `${singleItemWidthPx}px`,
                        height: `${singleItemHeightPx}px`,
                        border: settings.showCutLines
                          ? `1px ${settings.cutLineStyle} #94A3B8`
                          : 'none',
                      }}
                    >
                      <img
                        src={processedPhoto}
                        alt="ID Item"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {settings.showCutLines && (
                        <Scissors className="w-2.5 h-2.5 text-slate-400 absolute -top-1.5 -left-1.5 opacity-60" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print & Export Options Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Print & Export Sheet</h3>
                  <p className="text-[11px] text-slate-400">
                    {currentPaper.name} ({currentPaper.widthMm} × {currentPaper.heightMm} mm)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2.5">
              {/* PDF Download - Recommended for Printers */}
              <button
                onClick={() => {
                  handleExportPdf();
                }}
                disabled={isExportingPdf}
                className="w-full text-left p-3.5 rounded-xl bg-gradient-to-r from-emerald-600/15 to-emerald-500/5 hover:from-emerald-600/25 hover:to-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-500/20">
                  <FileDown className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Download Print-Ready PDF</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Guaranteed 100% exact millimeter scale on any desktop, mobile, or photo lab printer without browser distortion.
                  </p>
                </div>
              </button>

              {/* Direct Browser Print */}
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.error('Print trigger error:', e);
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">Trigger Native Browser Print (Ctrl+P / ⌘P)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sends isolated sheet directly to your connected printer dialog.
                  </p>
                </div>
              </button>

              {/* Microsoft Word DOCX */}
              <button
                onClick={() => {
                  handleExportDocx();
                }}
                disabled={isExporting}
                className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-600/20">
                  <Download className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">Download Microsoft Word (.docx)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Formatted with locked-dimension OpenXML tables for printing inside Word.
                  </p>
                </div>
              </button>
            </div>

            {/* Print Settings Tip Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 text-[11px]">
              <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Important Printer Calibration Tips:</span>
              </div>
              <ul className="text-slate-300 space-y-1 pl-5 list-disc text-[10.5px]">
                <li>
                  Set <strong>Scale</strong> to <strong>100% (Actual Size)</strong> — Never select <em>Fit to Page</em>.
                </li>
                <li>
                  Set <strong>Paper Size</strong> to <strong>{currentPaper.name}</strong>.
                </li>
                <li>
                  Set <strong>Margins</strong> to <strong>None / Default</strong> (margins are already included).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
