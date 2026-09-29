import React from 'react';
import { BookOpen, Check, ArrowRight, Shield, Globe } from 'lucide-react';
import { ID_SIZE_PRESETS } from '../constants/presets';

interface SizeStandardsGuideProps {
  onSelectPreset: (presetId: string) => void;
}

interface StandardDoc {
  country: string;
  flag: string;
  docType: string;
  presetId: string;
  dimensionsMm: string;
  dimensionsIn: string;
  headRatio: string;
  background: string;
  notes: string;
}

const GLOBAL_STANDARDS: StandardDoc[] = [
  {
    country: 'United States',
    flag: '🇺🇸',
    docType: 'Passport & US Visa (DS-160)',
    presetId: '2x2',
    dimensionsMm: '50.8 × 50.8 mm',
    dimensionsIn: '2.0 × 2.0 in',
    headRatio: '50% to 69% (1" to 1 3/8" from bottom of chin to top of head)',
    background: 'Plain white or off-white',
    notes: 'No eyeglasses allowed since 2016. Neutral facial expression with both eyes open.',
  },
  {
    country: 'European Union (Schengen)',
    flag: '🇪🇺',
    docType: 'Schengen Visa & EU Passports',
    presetId: 'passport_schengen',
    dimensionsMm: '35.0 × 45.0 mm',
    dimensionsIn: '1.38 × 1.77 in',
    headRatio: '70% to 80% (32 to 36 mm head height)',
    background: 'Light grey or plain white',
    notes: 'ICAO Doc 9303 compliant. Subject must face forward with natural skin tones.',
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    docType: 'HM Passport & UK Visa',
    presetId: 'passport_schengen',
    dimensionsMm: '35.0 × 45.0 mm',
    dimensionsIn: '1.38 × 1.77 in',
    headRatio: '29 to 34 mm from crown to chin',
    background: 'Plain cream or light grey (not pure white)',
    notes: 'No shadows behind head or on face. No hats unless for religious reasons.',
  },
  {
    country: 'Philippines',
    flag: '🇵🇭',
    docType: 'Passport, NBI, PRC, Postal ID',
    presetId: '2x2',
    dimensionsMm: '50.8 × 50.8 mm (also 25.4×25.4 mm)',
    dimensionsIn: '2.0 × 2.0 in (also 1.0 × 1.0 in)',
    headRatio: '70% to 80% of frame',
    background: 'Royal blue (PRC/Civil Service) or Plain White (DFA Passport)',
    notes: 'Collared shirt required for most government agencies. Ears must be visible.',
  },
  {
    country: 'Japan',
    flag: '🇯🇵',
    docType: 'Tourist / Work Visa & Passport',
    presetId: 'visa_asia',
    dimensionsMm: '45.0 × 45.0 mm',
    dimensionsIn: '1.77 × 1.77 in',
    headRatio: '70% (32 to 36 mm head size)',
    background: 'Plain white',
    notes: 'Taken within the last 6 months. Strict square format.',
  },
  {
    country: 'South Korea',
    flag: '🇰🇷',
    docType: 'Korean Visa',
    presetId: 'passport_schengen',
    dimensionsMm: '35.0 × 45.0 mm',
    dimensionsIn: '1.38 × 1.77 in',
    headRatio: '70% to 80%',
    background: 'Clean white',
    notes: 'Front-facing, no colored contact lenses.',
  },
  {
    country: 'India',
    flag: '🇮🇳',
    docType: 'OCI, Indian Passport & Visa',
    presetId: '2x2',
    dimensionsMm: '50.8 × 50.8 mm',
    dimensionsIn: '2.0 × 2.0 in',
    headRatio: '70% to 80% (35 to 40 mm)',
    background: 'Plain white or light off-white',
    notes: 'Full frontal view with both ears visible and neutral expression.',
  },
  {
    country: 'Corporate / School',
    flag: '💳',
    docType: 'CR80 ID Badge (Lanyard pass)',
    presetId: 'cr80_badge',
    dimensionsMm: '85.6 × 54.0 mm',
    dimensionsIn: '3.375 × 2.125 in',
    headRatio: 'Flexible (ID Badge with photo & credentials)',
    background: 'Custom / Branded',
    notes: 'ISO/IEC 7810 standard dimensions (standard credit card & employee lanyard badge size).',
  },
];

export const SizeStandardsGuide: React.FC<SizeStandardsGuideProps> = ({ onSelectPreset }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Official ID & Visa Photo Sizing Standards
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Government-mandated physical dimensions, head proportions, background colors, and print
          specifications.
        </p>
      </div>

      {/* Guide Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Multi-Size Combo Feature Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-purple-950/40 via-slate-900 to-blue-950/40 border border-purple-500/30 rounded-xl p-5 hover:border-purple-500/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h3 className="text-sm font-bold text-white">Multi-Size Combo Pack (Custom 2"x2" + 1"x1" on One Sheet)</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                Popular Service Pack
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Standard photo studio bundle frequently requested for simultaneous PRC / NBI clearances (requiring 2x2 with collared shirt) alongside job resumes, school applications, and medical exams (requiring 1x1). Print exact quantities on a single A4 or Letter page with true physical scale.
            </p>
          </div>
          <button
            onClick={() => onSelectPreset('custom_combo')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            <span>Open Custom Mix Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {GLOBAL_STANDARDS.map((std, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label={std.country}>
                    {std.flag}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{std.country}</h3>
                    <p className="text-xs text-blue-400 font-medium">{std.docType}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-semibold text-white block">
                    {std.dimensionsMm}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({std.dimensionsIn})</span>
                </div>
              </div>

              <div className="space-y-2 mt-4 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 w-24 shrink-0 font-medium">Head Ratio:</span>
                  <span className="text-slate-200">{std.headRatio}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 w-24 shrink-0 font-medium">Background:</span>
                  <span className="text-slate-200">{std.background}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 w-24 shrink-0 font-medium">Key Notes:</span>
                  <span className="text-slate-400">{std.notes}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">Preset: {std.presetId}</span>
              <button
                onClick={() => onSelectPreset(std.presetId)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Use this Size in Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Printing Tips Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Why Our DOCX Files Always Print with 100% Correct Scale</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          When people print photos from web browsers or image viewers, software often defaults to
          "Fit to Printable Area", which shrinks images by 4% to 9% to fit printer margins. This
          causes passport photos to be rejected by consulates for being 48mm instead of 50mm.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">1. OpenXML Twips Locking</span>
            <span className="text-slate-400">
              Each cell and photo in our generated DOCX is locked in twips (1/1440 of an inch),
              preventing Word from resizing elements.
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">2. Embedded Cut Tracks</span>
            <span className="text-slate-400">
              Subtle dashed borders provide a guide line for scissors or rotary trimmers without
              obscuring the portrait.
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-white block mb-1">3. Universal Compatibility</span>
            <span className="text-slate-400">
              Compatible with Microsoft Word 2007–365, LibreOffice Writer, WPS Office, and Google
              Docs across Windows, Mac, and Linux.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
