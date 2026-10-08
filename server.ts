import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateIdPrintDocx } from './src/services/docxGenerator';
import { processBotInput, getSession, updateSession } from './src/services/telegramBotEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentBotToken: string = process.env.TELEGRAM_BOT_TOKEN || '';
let botInfo: { id?: number; username?: string; first_name?: string } | null = null;
let webhookStatus: { url?: string; is_set?: boolean; last_error?: string } = {
  is_set: false,
};
const botLogs: { timestamp: string; type: 'info' | 'message' | 'error'; text: string }[] = [];

function addLog(type: 'info' | 'message' | 'error', text: string) {
  botLogs.unshift({
    timestamp: new Date().toLocaleTimeString(),
    type,
    text,
  });
  if (botLogs.length > 50) botLogs.pop();
}

async function verifyBotToken(token: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as any;
    if (data.ok) {
      botInfo = data.result;
      currentBotToken = token;
      addLog('info', `Connected bot: @${data.result.username} (${data.result.first_name})`);
      return { success: true, bot: data.result };
    } else {
      return { success: false, error: data.description || 'Invalid token' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function setupWebhook(token: string, appUrl: string) {
  try {
    const cleanUrl = appUrl.replace(/\/$/, '');
    const webhookUrl = `${cleanUrl}/api/telegram/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = (await res.json()) as any;
    if (data.ok) {
      webhookStatus = { url: webhookUrl, is_set: true };
      addLog('info', `Webhook set to: ${webhookUrl}`);
      return { success: true, webhookUrl };
    } else {
      webhookStatus = { url: webhookUrl, is_set: false, last_error: data.description };
      addLog('error', `Webhook failed: ${data.description}`);
      return { success: false, error: data.description };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Background Long Polling Fallback for environments where Webhooks are unreachable
let isPollingActive = false;
let pollingAbortController: AbortController | null = null;

async function startLongPolling(token: string) {
  if (isPollingActive) {
    stopLongPolling();
  }

  isPollingActive = true;
  pollingAbortController = new AbortController();
  const signal = pollingAbortController.signal;

  addLog('info', `Long Polling started: Real-time fallback active`);
  console.log(`Telegram Bot Long Polling started for token: ...${token.slice(-6)}`);

  // Delete webhook so Telegram allows getUpdates
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    webhookStatus = {
      url: 'Long Polling (Real-Time Fallback Active)',
      is_set: true,
      last_error: 'Webhooks are unreachable behind AI Studio proxy. Real-time Long Polling active.'
    };
  } catch (err: any) {
    console.error('Failed to delete webhook for polling:', err);
  }

  (async () => {
    let offset = 0;
    while (isPollingActive && !signal.aborted) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15`,
          { signal }
        );
        const data = (await response.json()) as any;
        if (data.ok && data.result) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            await handleTelegramUpdate(update);
          }
        } else if (data.description === 'Unauthorized') {
          addLog('error', 'Bot unauthorized. Long polling stopped.');
          break;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        console.error('Long polling fetch error:', err);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    console.log('Telegram Bot Long Polling stopped.');
  })();
}

function stopLongPolling() {
  isPollingActive = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
}

// Helper to send message to Telegram API
async function sendTelegramMessage(chatId: string | number, text: string, inlineKeyboard?: { text: string; callbackData: string }[][]) {
  if (!currentBotToken) return;
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard.map((row) =>
          row.map((btn) => ({
            text: btn.text,
            callback_data: btn.callbackData,
          }))
        ),
      };
    }

    await fetch(`https://api.telegram.org/bot${currentBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    addLog('error', `Failed to send Telegram message: ${err.message}`);
  }
}

// Helper to send document to Telegram API
async function sendTelegramDocx(chatId: string | number, docxBytes: Uint8Array, fileName: string, caption?: string) {
  if (!currentBotToken) return;
  try {
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('caption', caption || 'Your ready-to-print DOCX');
    formData.append('parse_mode', 'Markdown');
    const blob = new Blob([docxBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('document', blob, fileName);

    await fetch(`https://api.telegram.org/bot${currentBotToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    addLog('info', `Sent DOCX document (${fileName}) to Telegram chat ${chatId}`);
  } catch (err: any) {
    addLog('error', `Failed to send Telegram document: ${err.message}`);
  }
}

// Process single incoming Telegram update
async function handleTelegramUpdate(update: any) {
  if (!update) return;

  try {
    // Case 1: Callback Query (inline button pressed)
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message.chat.id;
      const data = query.data;

      addLog('message', `Callback from @${query.from.username || query.from.first_name}: ${data}`);

      // Acknowledge callback query
      if (currentBotToken) {
        fetch(`https://api.telegram.org/bot${currentBotToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: query.id }),
        }).catch(() => {});
      }

      const result = await processBotInput(chatId, undefined, data);
      await sendTelegramMessage(chatId, result.replyText, result.inlineKeyboard);
      return;
    }

    // Case 2: Regular Message
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const fromName = message.from?.username || message.from?.first_name || 'User';

      // Check if photo was sent
      if (message.photo && message.photo.length > 0) {
        addLog('message', `Received photo from ${fromName} in chat ${chatId}`);

        // Inform user that processing has started
        await sendTelegramMessage(chatId, '⏳ *Processing your photo and building ready-to-print DOCX...*');

        // Download largest photo
        const largestPhoto = message.photo[message.photo.length - 1];
        const fileRes = await fetch(
          `https://api.telegram.org/bot${currentBotToken}/getFile?file_id=${largestPhoto.file_id}`
        );
        const fileData = (await fileRes.json()) as any;

        if (fileData.ok && fileData.result?.file_path) {
          const imgRes = await fetch(
            `https://api.telegram.org/file/bot${currentBotToken}/${fileData.result.file_path}`
          );
          const arrayBuffer = await imgRes.arrayBuffer();
          const imageBytes = new Uint8Array(arrayBuffer);

          const result = await processBotInput(chatId, undefined, undefined, {
            uint8Array: imageBytes,
          });

          if (result.attachment?.uint8Array) {
            await sendTelegramDocx(
              chatId,
              result.attachment.uint8Array,
              result.attachment.fileName,
              result.replyText
            );
          } else {
            await sendTelegramMessage(chatId, result.replyText, result.inlineKeyboard);
          }
        }
        return;
      }

      // Regular text message
      if (message.text) {
        addLog('message', `Message from ${fromName}: ${message.text}`);
        const result = await processBotInput(chatId, message.text);
        await sendTelegramMessage(chatId, result.replyText, result.inlineKeyboard);
        return;
      }
    }
  } catch (err: any) {
    addLog('error', `Webhook processing error: ${err.message}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security Hardening Middlewares
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    // Prevent Clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Basic Cross-Site Scripting (XSS) Filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize bot if token is in env
  if (currentBotToken) {
    verifyBotToken(currentBotToken).then((res) => {
      if (res.success) {
        const isPreview = !process.env.APP_URL || 
                          process.env.APP_URL.includes('localhost') || 
                          process.env.APP_URL.includes('ais-dev') || 
                          process.env.APP_URL.includes('ais-pre');
        if (isPreview) {
          startLongPolling(currentBotToken);
        } else if (process.env.APP_URL) {
          setupWebhook(currentBotToken, process.env.APP_URL);
        }
      }
    });
  }

  // --- API Routes ---

  // 1. Get Telegram Bot Status
  app.get('/api/telegram/status', (req, res) => {
    res.json({
      hasToken: Boolean(currentBotToken),
      botInfo,
      webhookStatus,
      appUrl: process.env.APP_URL || '',
      logs: botLogs,
    });
  });

  // 2. Configure Telegram Bot Token
  app.post('/api/telegram/configure', async (req, res) => {
    const { token, appUrl } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const verifyRes = await verifyBotToken(token);
    if (!verifyRes.success) {
      return res.status(400).json(verifyRes);
    }

    const isPreview = !appUrl || 
                      appUrl.includes('localhost') || 
                      appUrl.includes('ais-dev') || 
                      appUrl.includes('ais-pre');

    if (isPreview) {
      startLongPolling(token);
    } else {
      await setupWebhook(token, appUrl);
    }

    res.json({
      success: true,
      bot: botInfo,
      webhook: webhookStatus,
    });
  });

  // 3. Telegram Webhook Endpoint (Called by Telegram Servers)
  app.post('/api/telegram/webhook', async (req, res) => {
    // Immediate 200 OK acknowledgment to prevent Telegram retries
    res.sendStatus(200);

    const update = req.body;
    if (!update) return;

    await handleTelegramUpdate(update);
  });

  // 4. Generate DOCX Directly (Used by Web Studio & Simulator)
  app.post('/api/generate-docx', async (req, res) => {
    try {
      const { settings, imageBase64, skipCells } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      const docxBytes = await generateIdPrintDocx({
        settings,
        imageBytes: imageBase64,
        skipCells,
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ID_Print_${settings.sizeId || 'photo'}_${settings.quantity || 6}pcs.docx"`
      );
      res.send(Buffer.from(docxBytes));
    } catch (err: any) {
      console.error('Error generating DOCX:', err);
      res.status(500).json({ error: err.message || 'Failed to generate DOCX' });
    }
  });

  // 5. Test/Simulate Bot Input (Browser simulator endpoint)
  app.post('/api/telegram/simulate', async (req, res) => {
    try {
      const { chatId = 'sim_user', text, callbackData, imageBase64 } = req.body;
      const result = await processBotInput(
        chatId,
        text,
        callbackData,
        imageBase64 ? { base64: imageBase64 } : undefined
      );

      // Convert uint8Array to base64 for transmission to frontend if attachment exists
      let attachmentPayload = undefined;
      if (result.attachment?.uint8Array) {
        attachmentPayload = {
          type: result.attachment.type,
          fileName: result.attachment.fileName,
          fileSize: result.attachment.fileSize,
          base64: Buffer.from(result.attachment.uint8Array).toString('base64'),
        };
      }

      res.json({
        replyText: result.replyText,
        inlineKeyboard: result.inlineKeyboard,
        attachment: attachmentPayload,
        session: result.updatedSession,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Vite or Production Static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`IDPrint Bot Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
