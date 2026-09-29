import { ID_SIZE_PRESETS, PAPER_DIMENSIONS } from '../constants/presets';
import { TelegramChatSession, TelegramMessageItem, PrintSettings, ComboItem, PaperSize } from '../types';
import { generateIdPrintDocx } from './docxGenerator';

// In-memory sessions store
const sessionsMap = new Map<string, TelegramChatSession>();

export function getSession(chatId: string | number): TelegramChatSession {
  const key = String(chatId);
  if (!sessionsMap.has(key)) {
    sessionsMap.set(key, {
      chatId: key,
      step: 'IDLE',
      sizeId: 'custom_combo',
      quantity: 12,
      paperSize: 'a4',
      lastActive: Date.now(),
      customComboItems: [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 4 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 8 },
      ],
    });
  }
  const session = sessionsMap.get(key)!;
  session.lastActive = Date.now();
  return session;
}

export function updateSession(chatId: string | number, updates: Partial<TelegramChatSession>): TelegramChatSession {
  const session = getSession(chatId);
  Object.assign(session, updates, { lastActive: Date.now() });
  return session;
}

export interface BotProcessResult {
  replyText: string;
  inlineKeyboard?: { text: string; callbackData: string }[][];
  attachment?: {
    type: 'docx' | 'image';
    fileName: string;
    fileSize?: string;
    uint8Array?: Uint8Array;
    base64?: string;
  };
  updatedSession: TelegramChatSession;
}

function renderComboBuilderResult(session: TelegramChatSession): BotProcessResult {
  const items = session.customComboItems || [
    { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 4 },
    { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 8 },
  ];
  const count2x2 = items.find((i) => i.id === '2x2')?.count ?? 0;
  const count1x1 = items.find((i) => i.id === '1x1')?.count ?? 0;
  const total = items.reduce((acc, c) => acc + c.count, 0);

  return {
    replyText:
      `🎛️ **Custom Mix & Match Builder (2x2 & 1x1)**\n\n` +
      `Configure how many **2" x 2"** and **1" x 1"** photos to print on a single sheet:\n\n` +
      `• **2" x 2" (50.8 × 50.8 mm):** ${count2x2} pcs\n` +
      `• **1" x 1" (25.4 × 25.4 mm):** ${count1x1} pcs\n` +
      `📦 **Total on Sheet:** **${total} photos**\n\n` +
      `Tap a quick bundle, adjust with buttons, or type e.g. _"4 2x2 and 8 1x1"_:`,
    inlineKeyboard: [
      [
        { text: '🌟 4x 2"x2" + 8x 1"x1"', callbackData: 'combo_preset:4_8' },
        { text: '💼 2x 2"x2" + 6x 1"x1"', callbackData: 'combo_preset:2_6' },
      ],
      [
        { text: '📄 6x 2"x2" + 4x 1"x1"', callbackData: 'combo_preset:6_4' },
        { text: '🚀 6x 2"x2" + 12x 1"x1"', callbackData: 'combo_preset:6_12' },
      ],
      [
        { text: '➕ 2"x2" (+2)', callbackData: 'combo_adj:2x2:2' },
        { text: '➖ 2"x2" (-2)', callbackData: 'combo_adj:2x2:-2' },
      ],
      [
        { text: '➕ 1"x1" (+4)', callbackData: 'combo_adj:1x1:4' },
        { text: '➖ 1"x1" (-4)', callbackData: 'combo_adj:1x1:-4' },
      ],
      [
        { text: `✅ Confirm Mix (${total} pcs) & Choose Paper ➡️`, callbackData: 'combo_confirm' },
      ],
      [
        { text: '« Change Size Preset', callbackData: 'action:start_make' },
      ],
    ],
    updatedSession: session,
  };
}

export async function processBotInput(
  chatId: string | number,
  inputText?: string,
  callbackData?: string,
  imageInput?: { base64?: string; uint8Array?: Uint8Array; fileName?: string }
): Promise<BotProcessResult> {
  const session = getSession(chatId);
  const text = (inputText || '').trim();
  const lowerText = text.toLowerCase();

  // Reset/Start commands
  if (lowerText === '/start' || lowerText === '/help' || callbackData === 'action:start_menu') {
    updateSession(chatId, { step: 'IDLE' });
    return {
      replyText:
        '👋 **Welcome to IDPrint Bot!**\n\n' +
        'I automatically format your photos into a **ready-to-print Microsoft Word (.docx)** file with **exact millimeter dimensions** for easy printing at home or any copy shop.\n\n' +
        '✂️ Includes dashed cut guides\n' +
        '📐 100% True-to-size physical print scale\n' +
        '🎛️ **Supports custom 2x2 & 1x1 mix packs** on a single sheet\n' +
        '📄 Supports A4 and US Letter paper formats\n\n' +
        'What would you like to do?',
      inlineKeyboard: [
        [
          { text: '📸 Create ID Print Sheet', callbackData: 'action:start_make' },
        ],
        [
          { text: '✨ Custom Mix (2x2 + 1x1)', callbackData: 'set_size:custom_combo' },
        ],
        [
          { text: '📐 View Supported Sizes', callbackData: 'action:show_sizes' },
          { text: '🖨️ Printing Instructions', callbackData: 'action:show_guide' },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Action: Show Supported Sizes
  if (callbackData === 'action:show_sizes' || lowerText === '/sizes') {
    const list = ID_SIZE_PRESETS.map(
      (p) => `• **${p.name}**\n  _${p.popularFor}_`
    ).join('\n\n');

    return {
      replyText: `📋 **Supported ID & Badge Sizes:**\n\n${list}\n\nReady to print your photos? Click below:`,
      inlineKeyboard: [
        [{ text: '📸 Create ID Print Sheet', callbackData: 'action:start_make' }],
        [{ text: '✨ Custom 2x2 + 1x1 Mix Pack', callbackData: 'set_size:custom_combo' }],
        [{ text: '« Back to Menu', callbackData: 'action:start_menu' }],
      ],
      updatedSession: session,
    };
  }

  // Action: Show Guide
  if (callbackData === 'action:show_guide' || lowerText === '/guide') {
    return {
      replyText:
        '🖨️ **How to Print Your ID Sheet for Exact Dimensions:**\n\n' +
        '1. **Download & Open** the `.docx` file in Microsoft Word, LibreOffice Writer, or Google Docs.\n' +
        '2. Press **Ctrl + P** (Windows) or **Cmd + P** (Mac) to open the print dialog.\n' +
        '3. ⚠️ **CRITICAL SETTING:** Look for "Page Scaling" or "Scale". Set it to **100%** or **Actual Size**.\n' +
        '   _(Do NOT check "Fit to Printable Area" or "Shrink oversized pages" as that will distort the exact millimeter dimensions!)_\n' +
        '4. Print on photo paper or heavy matte paper.\n' +
        '5. Follow the light dashed lines with scissors or a paper cutter.',
      inlineKeyboard: [
        [{ text: '📸 Create ID Print Sheet', callbackData: 'action:start_make' }],
        [{ text: '« Back to Menu', callbackData: 'action:start_menu' }],
      ],
      updatedSession: session,
    };
  }

  // Step 1: Select Size
  if (callbackData === 'action:start_make' || callbackData === 'action:change_size') {
    updateSession(chatId, { step: 'SELECT_SIZE' });
    return {
      replyText:
        '📐 **Step 1 of 3: Choose your ID Size or Mix:**\n\n' +
        'Select the physical dimensions or choose Custom Mix to specify how many 2x2 and 1x1 you need:',
      inlineKeyboard: [
        [
          { text: '✨ Custom Mix (Choose 2x2 & 1x1)', callbackData: 'set_size:custom_combo' },
        ],
        [
          { text: '2" x 2" (Passport/US Visa)', callbackData: 'set_size:2x2' },
          { text: '1" x 1" (Standard 1x1)', callbackData: 'set_size:1x1' },
        ],
        [
          { text: '35 x 45 mm (Schengen/UK)', callbackData: 'set_size:passport_schengen' },
          { text: '45 x 45 mm (Japan/Korea)', callbackData: 'set_size:visa_asia' },
        ],
        [
          { text: '85.6 x 54 mm (CR80 Badge)', callbackData: 'set_size:cr80_badge' },
          { text: '50 x 70 mm (Wallet Size)', callbackData: 'set_size:wallet_photo' },
        ],
        [
          { text: '🌟 Combo (4x 2"x2" + 8x 1"x1")', callbackData: 'set_size:combo_all_in_one' },
        ],
        [
          { text: '🌟 Visa Pack (4x 35x45 + 4x 2"x2")', callbackData: 'set_size:combo_visa_mix' },
        ],
        [
          { text: '« Back to Menu', callbackData: 'action:start_menu' },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Handle Custom Combo Builder Trigger
  if (callbackData === 'set_size:custom_combo') {
    const defaultCombo: ComboItem[] = [
      { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 4 },
      { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 8 },
    ];
    updateSession(chatId, {
      sizeId: 'custom_combo',
      step: 'CUSTOM_COMBO_BUILD',
      customComboItems: session.customComboItems && session.customComboItems.length > 0 ? session.customComboItems : defaultCombo,
      quantity: 12,
    });
    return renderComboBuilderResult(getSession(chatId));
  }

  // Handle Combo Adjustments
  if (callbackData && callbackData.startsWith('combo_adj:')) {
    const parts = callbackData.split(':');
    const targetSize = parts[1];
    const delta = parseInt(parts[2], 10) || 0;

    const list: ComboItem[] = [...(session.customComboItems || [
      { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 4 },
      { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 8 },
    ])];

    const idx = list.findIndex((i) => i.id === targetSize);
    if (idx !== -1) {
      list[idx] = { ...list[idx], count: Math.max(0, Math.min(48, list[idx].count + delta)) };
    }
    const totalCount = list.reduce((acc, c) => acc + c.count, 0);

    updateSession(chatId, {
      sizeId: 'custom_combo',
      step: 'CUSTOM_COMBO_BUILD',
      customComboItems: list,
      quantity: totalCount,
    });

    return renderComboBuilderResult(getSession(chatId));
  }

  // Handle Combo Presets
  if (callbackData && callbackData.startsWith('combo_preset:')) {
    const presetKey = callbackData.replace('combo_preset:', '');
    let newItems: ComboItem[] = [];

    if (presetKey === '4_8') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 4 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 8 },
      ];
    } else if (presetKey === '2_6') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 2 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 6 },
      ];
    } else if (presetKey === '6_4') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 6 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 4 },
      ];
    } else if (presetKey === '6_12') {
      newItems = [
        { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: 6 },
        { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: 12 },
      ];
    }

    const totalCount = newItems.reduce((acc, c) => acc + c.count, 0);
    updateSession(chatId, {
      sizeId: 'custom_combo',
      step: 'CUSTOM_COMBO_BUILD',
      customComboItems: newItems,
      quantity: totalCount,
    });

    return renderComboBuilderResult(getSession(chatId));
  }

  // Handle Combo Confirmation -> Paper Selection
  if (callbackData === 'combo_confirm') {
    const totalCount = (session.customComboItems || []).reduce((acc, c) => acc + c.count, 0);
    updateSession(chatId, { step: 'SELECT_PAPER', quantity: totalCount });

    return {
      replyText:
        `✅ **Custom Mix Confirmed!**\n\n` +
        (session.customComboItems || [])
          .filter((i) => i.count > 0)
          .map((i) => `• ${i.count} pcs of ${i.label}`)
          .join('\n') +
        `\nTotal: **${totalCount} photos**\n\n` +
        `📄 **Step 2 of 3: Choose your printer paper format:**`,
      inlineKeyboard: [
        [
          { text: '📄 A4 (210x297 mm)', callbackData: 'set_paper:a4' },
          { text: '📄 Letter (8.5x11")', callbackData: 'set_paper:letter' },
        ],
        [
          { text: '📸 4R (4" x 6" / 102x152mm)', callbackData: 'set_paper:4r' },
          { text: '📸 3R (3.5" x 5" / 89x127mm)', callbackData: 'set_paper:3r' },
        ],
        [
          { text: '📸 5R (5" x 7" / 127x178mm)', callbackData: 'set_paper:5r' },
          { text: '📸 8R (8" x 10" / 203x254mm)', callbackData: 'set_paper:8r' },
        ],
        [{ text: '« Adjust Quantities', callbackData: 'set_size:custom_combo' }],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Natural Language custom mix detector: e.g. "4 2x2 and 8 1x1" or "2 2x2 6 1x1"
  const match2x2 =
    lowerText.match(/(\d+)\s*(?:pcs|x|copies)?\s*(?:of)?\s*2\s*(?:x|\*|by)\s*2/i) ||
    lowerText.match(/2\s*(?:x|\*|by)\s*2\s*[:=\-]?\s*(\d+)/i);
  const match1x1 =
    lowerText.match(/(\d+)\s*(?:pcs|x|copies)?\s*(?:of)?\s*1\s*(?:x|\*|by)\s*1/i) ||
    lowerText.match(/1\s*(?:x|\*|by)\s*1\s*[:=\-]?\s*(\d+)/i);

  if (match2x2 || match1x1) {
    const count2 = match2x2 ? parseInt(match2x2[1], 10) : (session.customComboItems?.find((i) => i.id === '2x2')?.count ?? 4);
    const count1 = match1x1 ? parseInt(match1x1[1], 10) : (session.customComboItems?.find((i) => i.id === '1x1')?.count ?? 8);

    const updatedList: ComboItem[] = [
      { id: '2x2', widthMm: 50.8, heightMm: 50.8, label: '2" x 2"', count: Math.max(0, count2) },
      { id: '1x1', widthMm: 25.4, heightMm: 25.4, label: '1" x 1"', count: Math.max(0, count1) },
    ];
    const totalCount = updatedList.reduce((acc, c) => acc + c.count, 0);

    updateSession(chatId, {
      sizeId: 'custom_combo',
      step: 'CUSTOM_COMBO_BUILD',
      customComboItems: updatedList,
      quantity: totalCount,
    });

    return renderComboBuilderResult(getSession(chatId));
  }

  // Handle Standard Size Selection
  if (callbackData && callbackData.startsWith('set_size:')) {
    const sizeId = callbackData.replace('set_size:', '');
    const preset = ID_SIZE_PRESETS.find((p) => p.id === sizeId) || ID_SIZE_PRESETS[0];

    // If it's a fixed combo preset
    if (preset.comboItems && preset.comboItems.length > 0) {
      updateSession(chatId, {
        sizeId,
        customComboItems: preset.comboItems.map((c) => ({ ...c })),
        quantity: preset.comboItems.reduce((acc, cur) => acc + cur.count, 0),
        step: 'SELECT_PAPER',
      });

      return {
        replyText:
          `✅ Selected: **${preset.name}**\n\n` +
          `📦 This combo bundle automatically includes:\n` +
          preset.comboItems.map((item) => `• ${item.count} pcs of ${item.label}`).join('\n') +
          `\n\n📄 **Next: Choose paper size for printing:**`,
        inlineKeyboard: [
          [
            { text: '📄 A4 (Standard)', callbackData: 'set_paper:a4' },
            { text: '📄 Letter (US)', callbackData: 'set_paper:letter' },
          ],
          [
            { text: '📸 4R (4"x6")', callbackData: 'set_paper:4r' },
            { text: '📸 3R (3.5"x5")', callbackData: 'set_paper:3r' },
          ],
          [
            { text: '📸 5R (5"x7")', callbackData: 'set_paper:5r' },
            { text: '📸 8R (8"x10")', callbackData: 'set_paper:8r' },
          ],
          [{ text: '« Change Size', callbackData: 'action:start_make' }],
        ],
        updatedSession: getSession(chatId),
      };
    }

    // Single size - ask for quantity
    updateSession(chatId, { sizeId, step: 'SELECT_QTY', customComboItems: undefined });
    return {
      replyText:
        `✅ Selected size: **${preset.name}**\n` +
        `_(${preset.popularFor})_\n\n` +
        `🔢 **Step 2 of 3: How many copies do you need?**`,
      inlineKeyboard: [
        [
          { text: '2 pcs', callbackData: 'set_qty:2' },
          { text: '4 pcs', callbackData: 'set_qty:4' },
          { text: '6 pcs', callbackData: 'set_qty:6' },
        ],
        [
          { text: '8 pcs', callbackData: 'set_qty:8' },
          { text: '12 pcs', callbackData: 'set_qty:12' },
          { text: '📄 Fill Full Page', callbackData: 'set_qty:full' },
        ],
        [
          { text: '« Change Size', callbackData: 'action:start_make' },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Handle Quantity Selection (Single size)
  if (callbackData && callbackData.startsWith('set_qty:')) {
    const qtyVal = callbackData.replace('set_qty:', '');
    let count = 6;
    if (qtyVal === 'full') {
      count = session.sizeId === '1x1' ? 24 : session.sizeId === 'cr80_badge' ? 8 : 12;
    } else {
      count = parseInt(qtyVal, 10) || 6;
    }

    updateSession(chatId, { quantity: count, step: 'SELECT_PAPER' });

    return {
      replyText:
        `🔢 Quantity set: **${count} pcs**\n\n` +
        `📄 **Step 3 of 3: Choose your printer paper format:**`,
      inlineKeyboard: [
        [
          { text: '📄 A4 (Standard)', callbackData: 'set_paper:a4' },
          { text: '📄 Letter (US)', callbackData: 'set_paper:letter' },
        ],
        [
          { text: '📸 4R (4"x6")', callbackData: 'set_paper:4r' },
          { text: '📸 3R (3.5"x5")', callbackData: 'set_paper:3r' },
        ],
        [
          { text: '📸 5R (5"x7")', callbackData: 'set_paper:5r' },
          { text: '📸 8R (8"x10")', callbackData: 'set_paper:8r' },
        ],
        [
          { text: '« Change Quantity', callbackData: `set_size:${session.sizeId}` },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Handle Paper Selection -> Step 4: Choose Attire
  if (callbackData && callbackData.startsWith('set_paper:')) {
    const paper = callbackData.replace('set_paper:', '') as PaperSize;
    const paperName = (PAPER_DIMENSIONS as Record<string, any>)[paper]?.name || 'A4';

    updateSession(chatId, { paperSize: paper, step: 'SELECT_ATTIRE' });

    return {
      replyText:
        `👔 **Step 4 of 5: Choose Formal Attire (Optional)**\n\n` +
        `Do you need formal business attire (Suit & Tie, Crisp White Polo, Navy Blazer, Barong) for your photo, or keep your original clothing?\n\n` +
        `_Recommended for Passport, PRC, NBI, Civil Service, and Visa applications!_`,
      inlineKeyboard: [
        [
          { text: "👔 Men's Dark Suit & Tie", callbackData: 'set_attire:mens_suit_tie' },
          { text: '👔 Crisp White Polo', callbackData: 'set_attire:mens_white_polo' },
        ],
        [
          { text: "👗 Women's Navy Blazer", callbackData: 'set_attire:womens_navy_blazer' },
          { text: '👔 Formal Barong', callbackData: 'set_attire:barong_formal' },
        ],
        [
          { text: '✨ Keep Original Clothing', callbackData: 'set_attire:none' },
        ],
        [
          { text: '« Change Paper', callbackData: `set_size:${session.sizeId}` },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Handle Attire Selection -> Step 5: Waiting for photo
  if (callbackData && callbackData.startsWith('set_attire:')) {
    const attireId = callbackData.replace('set_attire:', '');
    const paper = PAPER_DIMENSIONS[session.paperSize] || PAPER_DIMENSIONS.a4;
    const preset = ID_SIZE_PRESETS.find((p) => p.id === session.sizeId) || ID_SIZE_PRESETS[0];

    updateSession(chatId, { attireId, step: 'WAITING_PHOTO' });

    let sizeSummary = preset.name;
    if (session.sizeId === 'custom_combo' && session.customComboItems) {
      sizeSummary = session.customComboItems
        .filter((c) => c.count > 0)
        .map((c) => `${c.count}x ${c.label}`)
        .join(' + ');
    }

    const attireLabel =
      attireId === 'mens_suit_tie'
        ? "Men's Dark Suit & Tie 👔"
        : attireId === 'mens_white_polo'
        ? 'Crisp White Polo 👔'
        : attireId === 'womens_navy_blazer'
        ? "Women's Navy Blazer 👗"
        : attireId === 'barong_formal'
        ? 'Formal Barong 👔'
        : 'Original Clothing ✨';

    return {
      replyText:
        `🎯 **Configuration Ready!**\n\n` +
        `• **Layout:** ${sizeSummary}\n` +
        `• **Total Copies:** ${session.quantity} pcs\n` +
        `• **Paper:** ${paper.name}\n` +
        `• **Attire:** ${attireLabel}\n` +
        `• **Cut Guides:** Dashed cutting border enabled\n\n` +
        `📸 **Now please send or upload your photo!**\n\n` +
        `💡 _Tips: A front-facing headshot with clear lighting and a plain white or neutral background works best._`,
      inlineKeyboard: [
        [
          { text: '« Change Settings', callbackData: 'action:start_make' },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Handle Image Upload (User sent a photo)
  if (imageInput && (imageInput.base64 || imageInput.uint8Array)) {
    const preset = ID_SIZE_PRESETS.find((p) => p.id === session.sizeId) || ID_SIZE_PRESETS[0];
    const paper = PAPER_DIMENSIONS[session.paperSize] || PAPER_DIMENSIONS.a4;

    const printSettings: PrintSettings = {
      sizeId: session.sizeId,
      customWidthMm: session.customWidthMm,
      customHeightMm: session.customHeightMm,
      quantity: session.quantity || 6,
      paperSize: session.paperSize || 'a4',
      showCutLines: true,
      cutLineStyle: 'dashed',
      cutLineColor: '#94A3B8',
      spacingMm: 4,
      marginMm: 10,
      includeLabels: true,
      backgroundColor: '#FFFFFF',
      photoZoom: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      attireId: session.attireId || 'none',
      attireScale: 1.0,
      attireOffsetY: 12,
      customComboItems: session.customComboItems,
    };

    const docxBytes = await generateIdPrintDocx({
      settings: printSettings,
      imageBytes: imageInput.base64 || imageInput.uint8Array!,
    });

    let docxFileName = '';
    if (session.sizeId === 'custom_combo' && session.customComboItems) {
      const counts = session.customComboItems
        .filter((c) => c.count > 0)
        .map((c) => `${c.count}x${c.id || Math.round(c.widthMm)}`)
        .join('_');
      docxFileName = `ID_Print_Mix_${counts || 'Custom'}_${session.paperSize.toUpperCase()}.docx`;
    } else {
      const safeSizeName = preset.id.replace(/[^a-zA-Z0-9]/g, '_');
      docxFileName = `ID_Print_${safeSizeName}_${session.quantity}pcs_${session.paperSize.toUpperCase()}.docx`;
    }

    updateSession(chatId, { step: 'COMPLETED' });

    let summaryText = preset.name;
    if (session.sizeId === 'custom_combo' && session.customComboItems) {
      summaryText = session.customComboItems
        .filter((c) => c.count > 0)
        .map((c) => `${c.count}x ${c.label}`)
        .join(' + ');
    }

    return {
      replyText:
        `🎉 **Your Ready-to-Print DOCX is Generated!**\n\n` +
        `📄 **File:** \`${docxFileName}\`\n` +
        `📐 **Print Layout:** ${summaryText}\n` +
        `🔢 **Total Copies:** ${session.quantity} pcs on ${paper.name}\n` +
        `✂️ **Cut Lines:** Included for easy scissors cutting\n\n` +
        `🖨️ **Printing Instructions:**\n` +
        `1. Open this file in Microsoft Word, Google Docs, or LibreOffice.\n` +
        `2. Go to **Print (Ctrl+P / Cmd+P)**.\n` +
        `3. Set Scale to **100% / Actual Size** (Do NOT fit/shrink to printable area).\n` +
        `4. Cut along the dashed guide lines!`,
      attachment: {
        type: 'docx',
        fileName: docxFileName,
        fileSize: `${Math.round(docxBytes.length / 1024)} KB`,
        uint8Array: docxBytes,
      },
      inlineKeyboard: [
        [
          { text: '✨ Custom Mix (2x2 + 1x1)', callbackData: 'set_size:custom_combo' },
          { text: '🔄 Print Another Size', callbackData: 'action:start_make' },
        ],
        [
          { text: '🖨️ Print Instructions', callbackData: 'action:show_guide' },
        ],
      ],
      updatedSession: getSession(chatId),
    };
  }

  // Fallback for unexpected text
  return {
    replyText:
      `I received: "${text}"\n\n` +
      `💡 You can specify custom photo counts like _"4 2x2 and 8 1x1"_ or start the ID Print wizard below:`,
    inlineKeyboard: [
      [{ text: '✨ Custom Mix (Choose 2x2 & 1x1)', callbackData: 'set_size:custom_combo' }],
      [{ text: '📸 Create ID Print Sheet', callbackData: 'action:start_make' }],
      [{ text: '« Main Menu', callbackData: 'action:start_menu' }],
    ],
    updatedSession: session,
  };
}
