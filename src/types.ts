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
  attireId?: string; // e.g. 'none', 'mens_suit_tie', 'mens_white_polo', 'womens_navy_blazer', 'barong_formal'
  attireScale?: number; // scale multiplier 0.8 to 1.4
  attireOffsetY?: number; // % offset of canvas height
}

export interface TelegramChatSession {
  chatId: string | number;
  step:
    | 'IDLE'
    | 'SELECT_SIZE'
    | 'SELECT_QTY'
    | 'CUSTOM_COMBO_BUILD'
    | 'SELECT_PAPER'
    | 'SELECT_ATTIRE'
    | 'WAITING_PHOTO'
    | 'GENERATING'
    | 'COMPLETED';
  sizeId: string;
  customWidthMm?: number;
  customHeightMm?: number;
  quantity: number;
  paperSize: PaperSize;
  attireId?: string;
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
