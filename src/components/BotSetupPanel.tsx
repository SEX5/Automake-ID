import React, { useState, useEffect } from 'react';
import {
  Send,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

export const BotSetupPanel: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [appUrlInput, setAppUrlInput] = useState('');
  const [storageChatInput, setStorageChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusData, setStatusData] = useState<{
    hasToken: boolean;
    botInfo: any;
    webhookStatus: any;
    appUrl: string;
    storageChatId?: string;
    logs: { timestamp: string; type: string; text: string }[];
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
        if (data.appUrl && !appUrlInput) {
          setAppUrlInput(data.appUrl);
        }
        if (data.storageChatId && !storageChatInput) {
          setStorageChatInput(data.storageChatId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/telegram/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim(),
          appUrl: appUrlInput.trim() || window.location.origin,
          storageChatId: storageChatInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Successfully connected to Telegram Bot @${data.bot?.username}! Webhook registered.`,
        });
        setTokenInput('');
        fetchStatus();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: data.error || 'Failed to verify bot token with Telegram',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Network error connecting to backend',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Telegram Bot & Webhook Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect your actual Telegram Bot token to enable real instant ID generation directly in
          Telegram apps on iOS, Android, and Desktop.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Bot Status */}
        <div className="lg:col-span-7 space-y-6">
          {/* Current Bot Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live Bot Connection Status
              </h3>
              <button
                onClick={fetchStatus}
                title="Refresh Status"
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {statusData?.botInfo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {statusData.botInfo.first_name}
                      </span>
                      <span className="text-xs text-emerald-400 font-mono">
                        @{statusData.botInfo.username}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Bot is online and responding to incoming Telegram messages
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Webhook Active:</span>
                    <span className="font-semibold text-white font-mono">
                      {statusData.webhookStatus?.is_set ? 'Enabled' : 'Pending'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 truncate">
                    <span className="text-slate-400 block mb-0.5">Webhook Target:</span>
                    <span className="font-mono text-slate-300 truncate text-[11px] block">
                      {statusData.webhookStatus?.url || `${window.location.origin}/api/telegram/webhook`}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">No active bot token configured</p>
                  <p className="text-slate-400">
                    You can test with the built-in Simulator or enter a Telegram token below to link
                    a live bot.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Token Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Connect Your Bot Token
            </h3>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-lg mb-4 text-xs flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConfigure} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>Telegram Bot API Token</span>
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Get from @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TeleDrive Storage Channel or Chat ID (Optional)</span>
                  </label>
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Find your Chat ID</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={storageChatInput}
                  onChange={(e) => setStorageChatInput(e.target.value)}
                  placeholder="e.g. @my_photos_channel or -100xxxxxxxxxx or your user ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  All photos uploaded & generated DOCX files will automatically be backed up here.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>App URL for Webhook Callback (HTTPS)</span>
                </label>
                <input
                  type="text"
                  value={appUrlInput}
                  onChange={(e) => setAppUrlInput(e.target.value)}
                  placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !tokenInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Verifying with Telegram...' : 'Save & Connect Telegram'}</span>
              </button>
            </form>
          </div>

          {/* Activity Logs Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Live Event Stream</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Auto-refreshes</span>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 border border-slate-800/80">
              {statusData?.logs && statusData.logs.length > 0 ? (
                statusData.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span
                      className={
                        log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'message'
                          ? 'text-blue-400'
                          : 'text-emerald-400'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-center py-4">No events logged yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Step-by-Step BotFather Guide */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              How to Get a Bot Token (60 Seconds)
            </h3>

            <ol className="space-y-4 text-xs text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white">Open Telegram & Search BotFather</p>
                  <p className="text-slate-400 mt-0.5">
                    Search for{' '}
                    <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded">
                      @BotFather
                    </code>{' '}
                    (the verified official bot with a blue tick mark) or click below:
                  </p>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-1 font-medium"
                  >
                    <span>Open @BotFather in Telegram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white">Send /newbot Command</p>
                  <p className="text-slate-400 mt-0.5">
                    Type and send{' '}
                    <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded">
                      /newbot
                    </code>
                    . BotFather will prompt you for:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-2 space-y-1 font-mono text-[11px]">
                    <div className="text-slate-400">1. Friendly Name (e.g. My ID Printer)</div>
                    <div className="text-slate-400">2. Username ending in "bot" (e.g. MyIDPrint_bot)</div>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white">Copy the API Token</p>
                  <p className="text-slate-400 mt-0.5">
                    BotFather will return a token formatted like{' '}
                    <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">
                      123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
                    </code>
                    . Paste it in the input on the left!
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <p className="font-semibold text-white">Done! Test your Bot</p>
                  <p className="text-slate-400 mt-0.5">
                    Open your new bot in Telegram, tap <strong>Start</strong>, pick sizes, and send
                    photos to receive instant Word `.docx` documents.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Webhook Endpoint Reference Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Webhook Endpoint Reference
            </h4>
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
              <span className="truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/webhook` : '/api/telegram/webhook'}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/api/telegram/webhook`,
                    'webhook'
                  )
                }
                className="text-slate-400 hover:text-white p-1 ml-2 shrink-0 transition-colors"
              >
                {copiedKey === 'webhook' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Telegram automatically sends updates to this URL over HTTPS with zero latency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
