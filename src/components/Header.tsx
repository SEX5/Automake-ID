import React from 'react';
import { Send, Printer, Bot, Sliders, BookOpen, Download } from 'lucide-react';

export type ActiveTab = 'bot_simulator' | 'web_studio' | 'bot_setup' | 'size_guide';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onQuickDownload?: () => void;
  isGenerating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onQuickDownload,
  isGenerating = false,
}) => {
  return (
    <header className="min-h-16 h-auto py-3 md:py-0 md:h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Zone 1: Single Wordmark Brand */}
      <div className="flex items-center gap-2 md:gap-3 justify-between w-full md:w-auto">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-white font-sans whitespace-nowrap">
            <span className="hidden xs:inline">IDPrint Bot & Studio</span>
            <span className="xs:hidden">IDPrint</span>
          </span>
        </div>
        {/* Quick export visible on mobile too */}
        <div className="md:hidden">
          {onQuickDownload && (
            <button
              onClick={onQuickDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-lg shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-3 h-3" />
              <span>{isGenerating ? '...' : 'Quick DOCX'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation Links (Fully responsive horizontally scrollable on mobile) */}
      <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('bot_simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'bot_simulator'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Bot Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('web_studio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'web_studio'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Print Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('bot_setup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'bot_setup'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Bot Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('size_guide')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'size_guide'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Size Standards</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action (Desktop view) */}
      <div className="hidden md:flex items-center gap-2">
        {onQuickDownload && (
          <button
            onClick={onQuickDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-lg shadow-sm shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Exporting...' : 'Export DOCX'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
