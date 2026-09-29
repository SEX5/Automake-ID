import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { TelegramSimulator } from './components/TelegramSimulator';
import { PrintStudio } from './components/PrintStudio';
import { BotSetupPanel } from './components/BotSetupPanel';
import { SizeStandardsGuide } from './components/SizeStandardsGuide';
import { generateIdPrintDocx } from './services/docxGenerator';
import { SAMPLE_PHOTOS } from './constants/sampleImages';
import { triggerFileDownload, urlToBase64 } from './utils/imageHelpers';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bot_simulator');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQuickExporting, setIsQuickExporting] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom_combo');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickExport = async () => {
    setIsQuickExporting(true);
    try {
      const photoData = await urlToBase64(SAMPLE_PHOTOS[0].src);
      const docxBytes = await generateIdPrintDocx({
        settings: {
          sizeId: '2x2',
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
        },
        imageBytes: photoData,
      });

      triggerFileDownload(docxBytes, 'ID_Print_2x2_6pcs_A4.docx');
      showToast('Downloaded quick sample DOCX (2" x 2", 6 pcs, A4)');
    } catch (err: any) {
      console.error(err);
      showToast('Export failed: ' + (err.message || 'unknown error'));
    } finally {
      setIsQuickExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickDownload={handleQuickExport}
        isGenerating={isQuickExporting}
      />

      {/* Main Viewport Content */}
      <main className="flex-1">
        {activeTab === 'bot_simulator' && (
          <TelegramSimulator
            onOpenStudio={() => setActiveTab('web_studio')}
            onOpenSetup={() => setActiveTab('bot_setup')}
          />
        )}

        {activeTab === 'web_studio' && (
          <PrintStudio
            onNotify={(msg) => showToast(msg)}
            initialPresetId={selectedPresetId}
          />
        )}

        {activeTab === 'bot_setup' && <BotSetupPanel />}

        {activeTab === 'size_guide' && (
          <SizeStandardsGuide
            onSelectPreset={(presetId) => {
              setSelectedPresetId(presetId);
              setActiveTab('web_studio');
              showToast(`Loaded ${presetId === 'custom_combo' ? 'Custom Mix' : presetId} in Print Studio`);
            }}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 md:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span>IDPrint Bot & Studio</span>
            <span>·</span>
            <span>Ready-to-print Microsoft Word (.docx) engine</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('bot_simulator')}
              className="hover:text-white transition-colors"
            >
              Bot Simulator
            </button>
            <button
              onClick={() => setActiveTab('web_studio')}
              className="hover:text-white transition-colors"
            >
              Print Studio
            </button>
            <button
              onClick={() => setActiveTab('bot_setup')}
              className="hover:text-white transition-colors"
            >
              Telegram Webhook
            </button>
            <button
              onClick={() => setActiveTab('size_guide')}
              className="hover:text-white transition-colors"
            >
              Size Standards
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
