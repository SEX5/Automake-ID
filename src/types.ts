export interface ComboItem {
  id?: string;
  widthMm: number;
  heightMm: number;
  label: string;
  count: number;
}

export interface IdSizePreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  category: 'standard' | 'passport' | 'badge' | 'combo';
  popularFor: string;
  comboItems?: ComboItem[];
}

export type PaperSize = 'a4' | 'letter' | '3r' | '4r' | '5r' | '8r';

export interface PrintSettings {
  sizeId: string;
  customWidthMm?: number;
  customHeightMm?: number;
  quantity: number;
  paperSize: PaperSize;
  showCutLines: boolean;
  cutLineStyle: 'dashed' | 'solid' | 'hairline';
  cutLineColor: string;
  spacingMm: number;
  marginMm: number;
  includeLabels: boolean;
  backgroundColor: string; // e.g. '#FFFFFF', '#3B82F6', '#E2E8F0'
  photoZoom: number;
  photoOffsetX: number;
  photoOffsetY: number;
  customComboItems?: ComboItem[];
}

export interface TelegramChatSession {
  chatId: string | number;
  step:
    | 'IDLE'
    | 'SELECT_SIZE'
    | 'SELECT_QTY'
    | 'CUSTOM_COMBO_BUILD'
    | 'SELECT_PAPER'
    | 'WAITING_PHOTO'
    | 'GENERATING'
    | 'COMPLETED';
  sizeId: string;
  customWidthMm?: number;
  customHeightMm?: number;
  quantity: number;
  paperSize: PaperSize;
  photoUrl?: string;
  photoBase64?: string;
  lastActive: number;
  customComboItems?: ComboItem[];
}

export interface TelegramMessageItem {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  inlineKeyboard?: { text: string; callbackData: string }[][];
  attachment?: {
    type: 'docx' | 'image';
    fileName?: string;
    fileSize?: string;
    downloadUrl?: string;
    base64?: string;
  };
}

/** One contiguous block of same-size photos on a saved paper sheet. */
export interface PaperBlockLayout {
  block_index: number;
  label: string;
  width_mm: number;
  height_mm: number;
  cols: number;
  cell_count: number;
}

/** A physical sheet of photo paper saved for reuse (Supabase `saved_papers`). */
export interface SavedPaper {
  id: string;
  owner_id: string;
  name: string;
  paper_size: string;
  size_id: string;
  custom_width_mm?: number | null;
  custom_height_mm?: number | null;
  is_combo: boolean;
  margin_mm: number;
  spacing_mm: number;
  blocks: PaperBlockLayout[];
  /** Cell keys ("<block>:<cell>") that were cut out and are no longer printable. */
  cut_cells: string[];
  created_at: string;
  updated_at: string;
}
