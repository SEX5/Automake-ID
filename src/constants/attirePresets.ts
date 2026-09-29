export interface AttirePreset {
  id: string;
  name: string;
  category: 'men' | 'women' | 'unisex';
  badge: string;
  description: string;
  defaultScale: number; // default scale multiplier
  defaultOffsetY: number; // default Y offset (% of canvas)
  svgDataUri: string;
}

// Generate high quality crisp SVG attire templates designed to fit naturally over ID photo collars/shoulders
function makeSuitSvg(jacketColor = '#1E293B', lapelColor = '#0F172A', shirtColor = '#F8FAFC', tieColor = '#DC2626', tieStripe = '#991B1B') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${jacketColor}"/>
        <stop offset="100%" stop-color="${lapelColor}"/>
      </linearGradient>
      <linearGradient id="tieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${tieColor}"/>
        <stop offset="100%" stop-color="${tieStripe}"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25"/>
      </filter>
    </defs>
    
    <!-- Outer Shoulders / Torso -->
    <path d="M 10 300 C 40 210, 110 135, 160 120 L 200 145 L 240 120 C 290 135, 360 210, 390 300 Z" fill="url(#jacketGrad)" filter="url(#shadow)"/>
    
    <!-- White Collared Shirt V-Neck Area -->
    <polygon points="160,120 240,120 200,240" fill="${shirtColor}"/>
    <path d="M 155 118 L 195 160 L 175 165 Z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/>
    <path d="M 245 118 L 205 160 L 225 165 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
    
    <!-- Necktie Knot and Body -->
    <polygon points="190,150 210,150 205,170 195,170" fill="url(#tieGrad)" stroke="#7F1D1D" stroke-width="1"/>
    <polygon points="195,170 205,170 214,295 200,300 186,295" fill="url(#tieGrad)" filter="url(#shadow)"/>
    <!-- Tie Stripes -->
    <line x1="192" y1="190" x2="208" y2="202" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.7"/>
    <line x1="190" y1="220" x2="210" y2="232" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.7"/>
    <line x1="188" y1="250" x2="212" y2="262" stroke="#FFFFFF" stroke-width="2.5" stroke-opacity="0.7"/>
    
    <!-- Left Suit Lapel -->
    <path d="M 160 120 L 130 190 L 175 220 L 195 260 L 195 300 L 140 300 C 90 260, 50 280, 10 300 Z" fill="url(#jacketGrad)" stroke="${lapelColor}" stroke-width="2"/>
    <path d="M 160 120 L 140 185 L 180 230 L 198 270" fill="none" stroke="#334155" stroke-width="2.5"/>
    
    <!-- Right Suit Lapel (Overlapping) -->
    <path d="M 240 120 L 270 190 L 225 220 L 205 260 L 205 300 L 260 300 C 310 260, 350 280, 390 300 Z" fill="url(#jacketGrad)" stroke="${lapelColor}" stroke-width="2"/>
    <path d="M 240 120 L 260 185 L 220 230 L 202 270" fill="none" stroke="#334155" stroke-width="2.5"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function makePoloSvg(poloColor = '#FFFFFF', collarColor = '#F1F5F9', buttonPlacket = '#E2E8F0') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <filter id="poloShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.15"/>
      </filter>
    </defs>
    
    <!-- Torso and Shoulders -->
    <path d="M 15 300 C 45 200, 110 135, 160 120 L 200 135 L 240 120 C 290 135, 355 200, 385 300 Z" fill="${poloColor}" stroke="#E2E8F0" stroke-width="2" filter="url(#poloShadow)"/>
    
    <!-- Center Button Placket -->
    <path d="M 188 135 L 212 135 L 212 280 L 188 280 Z" fill="${buttonPlacket}" stroke="#CBD5E1" stroke-width="1.5"/>
    <!-- Buttons -->
    <circle cx="200" cy="160" r="4.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
    <circle cx="200" cy="195" r="4.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
    <circle cx="200" cy="230" r="4.5" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1.5"/>
    
    <!-- Left Collar Wing -->
    <path d="M 150 115 L 200 135 L 182 185 L 132 155 Z" fill="${collarColor}" stroke="#CBD5E1" stroke-width="2" filter="url(#poloShadow)"/>
    <!-- Right Collar Wing -->
    <path d="M 250 115 L 200 135 L 218 185 L 268 155 Z" fill="${collarColor}" stroke="#CBD5E1" stroke-width="2" filter="url(#poloShadow)"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function makeWomensBlazerSvg(blazerColor = '#1E3A8A', blouseColor = '#FFFFFF') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <linearGradient id="blazerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${blazerColor}"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <filter id="blzShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.2"/>
      </filter>
    </defs>
    
    <!-- Torso base -->
    <path d="M 20 300 C 50 205, 115 130, 165 115 L 200 130 L 235 115 C 285 130, 350 205, 380 300 Z" fill="url(#blazerGrad)" filter="url(#blzShadow)"/>
    
    <!-- Inner Silk Blouse -->
    <path d="M 165 115 C 180 145, 185 175, 200 210 C 215 175, 220 145, 235 115 Z" fill="${blouseColor}"/>
    <path d="M 185 140 C 195 160, 205 160, 215 140" fill="none" stroke="#E2E8F0" stroke-width="2"/>
    <path d="M 190 170 C 195 185, 205 185, 210 170" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    
    <!-- Left Curved Tailored Lapel -->
    <path d="M 165 115 C 150 160, 140 200, 195 255 L 195 300 L 120 300 C 70 250, 40 280, 20 300 Z" fill="url(#blazerGrad)" stroke="#172554" stroke-width="2"/>
    <path d="M 165 115 Q 145 175 195 255" fill="none" stroke="#3B82F6" stroke-width="1.5" stroke-opacity="0.4"/>
    
    <!-- Right Curved Tailored Lapel (Overlapping) -->
    <path d="M 235 115 C 250 160, 260 200, 205 255 L 205 300 L 280 300 C 330 250, 360 280, 380 300 Z" fill="url(#blazerGrad)" stroke="#172554" stroke-width="2"/>
    <path d="M 235 115 Q 255 175 205 255" fill="none" stroke="#3B82F6" stroke-width="1.5" stroke-opacity="0.4"/>
    
    <!-- Single Gold Button -->
    <circle cx="200" cy="265" r="5" fill="#EAB308" stroke="#CA8A04" stroke-width="1.5"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function makeBarongSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <filter id="barongShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.15"/>
      </filter>
    </defs>
    
    <!-- Piña Cloth Fabric Body -->
    <path d="M 15 300 C 45 200, 110 135, 160 120 L 200 130 L 240 120 C 290 135, 355 200, 385 300 Z" fill="#FBFBF6" stroke="#E2DEC8" stroke-width="2" filter="url(#barongShadow)"/>
    
    <!-- Center Embroidered Front Pechera Placket -->
    <path d="M 175 125 L 225 125 L 225 285 L 175 285 Z" fill="#F4EFE6" stroke="#D3C7AB" stroke-width="1.5"/>
    
    <!-- Intricate U-Shape Embroidery Stitch Patterns -->
    <path d="M 180 140 L 220 140 M 180 155 L 220 155 M 180 170 L 220 170 M 180 185 L 220 185 M 180 200 L 220 200 M 180 215 L 220 215 M 180 230 L 220 230 M 180 245 L 220 245 M 180 260 L 220 260" stroke="#B8A47A" stroke-width="1.5" stroke-dasharray="2,3"/>
    
    <!-- Mother-of-pearl Buttons -->
    <circle cx="200" cy="150" r="3.5" fill="#FFFFFF" stroke="#A89260" stroke-width="1"/>
    <circle cx="200" cy="180" r="3.5" fill="#FFFFFF" stroke="#A89260" stroke-width="1"/>
    <circle cx="200" cy="210" r="3.5" fill="#FFFFFF" stroke="#A89260" stroke-width="1"/>
    <circle cx="200" cy="240" r="3.5" fill="#FFFFFF" stroke="#A89260" stroke-width="1"/>
    
    <!-- Mandarin / Formal Collar -->
    <path d="M 150 115 L 200 128 L 180 165 L 135 140 Z" fill="#F4EFE6" stroke="#CBB996" stroke-width="2"/>
    <path d="M 250 115 L 200 128 L 220 165 L 265 140 Z" fill="#F4EFE6" stroke="#CBB996" stroke-width="2"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const ATTIRE_PRESETS: AttirePreset[] = [
  {
    id: 'none',
    name: 'Original Attire',
    category: 'unisex',
    badge: 'Original',
    description: 'Keep the original clothing from your uploaded photo.',
    defaultScale: 1.0,
    defaultOffsetY: 0,
    svgDataUri: '',
  },
  {
    id: 'mens_suit_tie',
    name: "Men's Dark Suit & Red Silk Tie",
    category: 'men',
    badge: 'Business / Visa',
    description: 'Charcoal tailored business suit jacket, crisp white collared shirt, and silk tie.',
    defaultScale: 1.05,
    defaultOffsetY: 12,
    svgDataUri: makeSuitSvg('#0F172A', '#020617', '#FFFFFF', '#DC2626', '#991B1B'),
  },
  {
    id: 'mens_suit_navy_tie',
    name: "Men's Black Suit & Blue Tie",
    category: 'men',
    badge: 'Executive',
    description: 'Classic black formal blazer with bright corporate royal blue necktie.',
    defaultScale: 1.05,
    defaultOffsetY: 12,
    svgDataUri: makeSuitSvg('#18181B', '#09090B', '#FFFFFF', '#2563EB', '#1D4ED8'),
  },
  {
    id: 'mens_white_polo',
    name: 'Crisp White Collared Polo',
    category: 'unisex',
    badge: 'PRC / NBI / School',
    description: 'Clean white collared polo shirt standard for ID clearances, exams, and licenses.',
    defaultScale: 1.0,
    defaultOffsetY: 10,
    svgDataUri: makePoloSvg('#FFFFFF', '#F8FAFC', '#E2E8F0'),
  },
  {
    id: 'womens_navy_blazer',
    name: "Women's Navy Corporate Blazer",
    category: 'women',
    badge: 'Corporate / Passport',
    description: 'Tailored navy blue suit jacket with an elegant white silk inner blouse.',
    defaultScale: 1.02,
    defaultOffsetY: 12,
    svgDataUri: makeWomensBlazerSvg('#1E3A8A', '#FFFFFF'),
  },
  {
    id: 'womens_black_blazer',
    name: "Women's Black Formal Blazer",
    category: 'women',
    badge: 'Formal',
    description: 'Modern black structured blazer with white inner top and gold accent button.',
    defaultScale: 1.02,
    defaultOffsetY: 12,
    svgDataUri: makeWomensBlazerSvg('#0F172A', '#F8FAFC'),
  },
  {
    id: 'barong_formal',
    name: 'Formal Embroidered Barong',
    category: 'men',
    badge: 'Philippine Govt / DFA',
    description: 'Traditional formal Barong Tagalog with delicate pechera embroidery stitches.',
    defaultScale: 1.03,
    defaultOffsetY: 10,
    svgDataUri: makeBarongSvg(),
  },
];
