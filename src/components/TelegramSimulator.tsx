import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  FileText,
  RotateCcw,
  CheckCircle2,
  Download,
  Info,
  ExternalLink,
  UploadCloud,
  Sparkles,
} from 'lucide-react';
import { TelegramMessageItem } from '../types';
import { processBotInput } from '../services/telegramBotEngine';
import { SAMPLE_PHOTOS } from '../constants/sampleImages';
import { fileToBase64, urlToBase64, triggerFileDownload } from '../utils/imageHelpers';

interface TelegramSimulatorProps {
  onOpenStudio?: () => void;
  onOpenSetup?: () => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  onOpenStudio,
  onOpenSetup,
}) => {
  const [messages, setMessages] = useState<TelegramMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(SAMPLE_PHOTOS[0].src);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize bot with /start message on mount
  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const initChat = async () => {
    setIsProcessing(true);
    const result = await processBotInput('sim_user', '/start');
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'bot',
        text: result.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        inlineKeyboard: result.inlineKeyboard,
      },
    ]);
    setIsProcessing(false);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isProcessing) return;

    const userMsgId = `user_${Date.now()}`;
    const newMessages: TelegramMessageItem[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setInputText('');
    setIsProcessing(true);

    try {
      const result = await processBotInput('sim_user', textToSend);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: result.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inlineKeyboard: result.inlineKeyboard,
          attachment: result.attachment
            ? {
                type: result.attachment.type,
                fileName: result.attachment.fileName,
                fileSize: result.attachment.fileSize,
                downloadUrl: result.attachment.base64
                  ? `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.attachment.base64}`
                  : undefined,
              }
            : undefined,
        },
      ]);
    } catch (err: any) {
      console.error('Bot processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInlineButtonClick = async (callbackData: string, label: string) => {
    if (isProcessing) return;

    // Add user selection bubble
    const userMsgId = `user_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: label,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsProcessing(true);
    try {
      const result = await processBotInput('sim_user', undefined, callbackData);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: result.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inlineKeyboard: result.inlineKeyboard,
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendPhoto = async (photoSrc: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    // Show user uploaded image bubble
    setMessages((prev) => [
      ...prev,
      {
        id: `user_img_${Date.now()}`,
        sender: 'user',
        text: '📷 [Attached Photo for ID Print]',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachment: {
          type: 'image',
          downloadUrl: photoSrc,
        },
      },
    ]);

    try {
      let base64 = photoSrc;
      if (!photoSrc.startsWith('data:')) {
        base64 = await urlToBase64(photoSrc);
      }

      const result = await processBotInput('sim_user', undefined, undefined, {
        base64,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_docx_${Date.now()}`,
          sender: 'bot',
          text: result.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inlineKeyboard: result.inlineKeyboard,
          attachment: result.attachment
            ? {
                type: result.attachment.type,
                fileName: result.attachment.fileName,
                fileSize: result.attachment.fileSize,
                downloadUrl: result.attachment.base64
                  ? `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.attachment.base64}`
                  : undefined,
              }
            : undefined,
        },
      ]);
    } catch (err: any) {
      console.error('Error generating docx:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setSelectedPhoto(base64);
      await handleSendPhoto(base64);
    } catch (err) {
      console.error('File reading failed:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Telegram Interactive Phone Mockup */}
      <div className="lg:col-span-8 flex flex-col h-[780px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Telegram Chat Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
                ID
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">IDPrint Bot</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 font-mono px-1.5 py-0.2 rounded">
                  bot
                </span>
              </div>
              <p className="text-xs text-slate-400">Automatic ID & DOCX Print Generator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={initChat}
              title="Restart Conversation (/start)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {/* Top Info Banner */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Interactive Telegram Bot Simulator: </span>
              Experience the exact user flow your customers or team will experience in Telegram.
              Choose ID sizes, quantities, and send photos to get instant ready-to-print DOCX files.
            </div>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                {/* Image attachment if user sent photo */}
                {msg.attachment?.type === 'image' && msg.attachment.downloadUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[180px]">
                    <img
                      src={msg.attachment.downloadUrl}
                      alt="Uploaded preview"
                      className="w-full h-auto object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Message Text with Simple Markdown Linebreaks */}
                <div className="whitespace-pre-line leading-relaxed">
                  {msg.text.split('\n').map((line, idx) => {
                    const isBold = line.startsWith('**') && line.endsWith('**');
                    return (
                      <span key={idx} className="block">
                        {line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/_(.*?)_/g, '$1')}
                      </span>
                    );
                  })}
                </div>

                {/* DOCX Document Card */}
                {msg.attachment?.type === 'docx' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-blue-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {msg.attachment.fileName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {msg.attachment.fileSize || 'Ready to print'} · Microsoft Word (.docx)
                        </p>
                      </div>
                    </div>

                    {msg.attachment.downloadUrl && (
                      <button
                        onClick={() =>
                          triggerFileDownload(
                            msg.attachment!.downloadUrl!,
                            msg.attachment!.fileName || 'ID_Print.docx'
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all whitespace-nowrap active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Telegram Inline Keyboard Buttons */}
              {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                <div className="mt-2 space-y-1.5 max-w-[85%]">
                  {msg.inlineKeyboard.map((row, rIdx) => (
                    <div key={rIdx} className="flex flex-wrap gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          disabled={isProcessing}
                          onClick={() => handleInlineButtonClick(btn.callbackData, btn.text)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-700/80 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          {btn.text}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-2 py-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>IDPrint Bot is typing and generating layout...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Telegram Chat Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload Photo File"
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type /start, /sizes, or /guide..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column: Interactive Quick Actions & Photo Switcher */}
      <div className="lg:col-span-4 space-y-5">
        {/* Quick Send Photo Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">
            Test Photo & Instant Send
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Select a high-resolution studio sample photo or upload your own to test DOCX generation.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {SAMPLE_PHOTOS.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo.src)}
                className={`cursor-pointer rounded-lg overflow-hidden border p-2 text-left transition-all ${
                  selectedPhoto === photo.src
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="aspect-square rounded-md overflow-hidden mb-2 bg-slate-800">
                  <img
                    src={photo.src}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-xs font-medium text-slate-200 truncate">{photo.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{photo.role}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => selectedPhoto && handleSendPhoto(selectedPhoto)}
              disabled={!selectedPhoto || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Send Selected Photo to Bot</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all border border-slate-700/60"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Upload Custom Photo</span>
            </button>
          </div>
        </div>

        {/* Quick Command Cheatsheet */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Telegram Bot Quick Commands
          </h4>
          <div className="space-y-2 text-xs">
            <button
              onClick={() => handleSendMessage('/start')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <span className="font-mono text-blue-400">/start</span>
              <span className="text-slate-400 text-[11px]">Start ID builder wizard</span>
            </button>
            <button
              onClick={() => handleSendMessage('4 2x2 and 8 1x1')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-purple-500/30 hover:border-purple-500/60 text-left transition-colors"
            >
              <span className="font-mono text-purple-300">4 2x2 and 8 1x1</span>
              <span className="text-purple-400 text-[11px]">Custom 2x2 & 1x1 mix</span>
            </button>
            <button
              onClick={() => handleSendMessage('/sizes')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <span className="font-mono text-blue-400">/sizes</span>
              <span className="text-slate-400 text-[11px]">List all supported mm sizes</span>
            </button>
            <button
              onClick={() => handleSendMessage('/guide')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <span className="font-mono text-blue-400">/guide</span>
              <span className="text-slate-400 text-[11px]">Printing & cutting guide</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Why DOCX for Printing?
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Strict Physical Dimensions:</strong> Word tables lock
                cell widths and image transforms to exact EMUs (English Metric Units).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Copy Shop Friendly:</strong> Every computer at photo
                studios and printing hubs can open .docx and hit 100% print immediately.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Built-in Cut Lines:</strong> Crisp dashed borders
                serve as scissors guide tracks.
              </span>
            </li>
          </ul>

          {onOpenSetup && (
            <div className="pt-2">
              <button
                onClick={onOpenSetup}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <span>Connect Real Telegram Bot</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
