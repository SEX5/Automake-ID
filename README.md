# 📸 IDPrint Bot & Studio

> Automated Telegram Bot and interactive Web Studio to generate true 1:1 scale, ready-to-print Microsoft Word (`.docx`) and PDF sheets for ID photos, passports, visas, and badges.

![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)
![Telegram Bot API](https://img.shields.io/badge/Telegram_Bot_API-v7.0+-26A5E4?style=flat-square&logo=telegram)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🌟 Overview

When printing ID or passport photos from standard photo viewers or browsers, print drivers often apply **"Fit to Printable Area"** or non-uniform scaling, shrinking photos by 4% to 9%. This leads to strict consulate rejections (e.g. photos measuring 48mm instead of the mandatory 50mm).

**IDPrint Bot & Studio** solves this by generating **OpenXML Microsoft Word (`.docx`) files with locked Twip coordinates** (1/1440 of an inch) and **millimeter-accurate PDFs**. Documents open cleanly in Microsoft Word (2007–365), Google Docs, LibreOffice, and WPS Office with guaranteed `1:1` real-world physical dimensions and built-in cut guides.

---

## ✨ Features

- 🤖 **Two-in-One Architecture**:
  - **Telegram Bot Integration**: Process photos on-the-go directly from mobile Telegram apps (iOS, Android, Desktop) with interactive step-by-step inline buttons and instant `.docx` delivery.
  - **Interactive Web Studio**: Full WYSIWYG sheet layout preview, photo repositioning/zooming, background color adjustments, and immediate file downloads.
- 📐 **Guaranteed 1:1 Physical Scale**:
  - OpenXML table cells with locked widths and heights.
  - Vector PDF generator matching exact sheet millimeters.
- 📸 **Supported Paper Formats**:
  - **Standard Paper**: A4 (`210 × 297 mm`), US Letter (`8.5" × 11"`).
  - **Photo Paper Sizes**: 3R (`3.5" × 5"`), 4R (`4" × 6"`), 5R (`5" × 7"`), 8R (`8" × 10"`).
- 🧩 **Multi-Size Combo Sheets**:
  - Mix multiple sizes (e.g., `4x` 2"×2" + `8x` 1"×1" + `2x` 35×45mm Schengen) on a single sheet with dynamic layout calculation and sheet height capacity indicators.
- ✂️ **Customizable Cut Lines & Guides**:
  - Select between **Dashed**, **Solid**, or **Hairline** cutting tracks.
  - Adjustable photo spacing gaps (`0` to `12mm`) and page margins.
- 👤 **Smart Biometric Framing**:
  - Smart biometric face-centering for standard visa and passport ratios.
  - Custom background backdrops: Plain White, Off-white, Royal Blue, Crimson Red, and Studio Grey.
- 🌍 **International Size Standards Guide**:
  - Built-in compliance specifications for US (2"×2"), Schengen / UK (35×45mm), Japan / Korea (45×45mm), Philippines (2"×2" & 1"×1"), India (50.8×50.8mm), CR80 ID Badges (85.6×54mm), and Custom Dimensions.
- 🛡️ **Security Hardened**:
  - `X-Frame-Options: SAMEORIGIN` (anti-clickjacking).
  - `X-Content-Type-Options: nosniff` (MIME-sniffing protection).
  - Masked `x-powered-by` server fingerprints and strict referrer policies.
- 📱 **Fully Responsive**:
  - Seamlessly adapts across mobile devices, tablets, and desktop displays.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **Backend / Server**: Node.js, Express, TSX
- **Document Engines**:
  - `docx`: Native OpenXML document creation
  - `jspdf`: Vector-accurate PDF generation
  - `smartcrop`: Intelligent biometric framing
- **Build Tool**: Vite

---

## 🚀 Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- `npm`, `pnpm`, or `bun`

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/idprint-bot-studio.git
cd idprint-bot-studio
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Optional: Live Telegram Bot token from @BotFather
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"

# Optional: Public URL for Webhook mode (defaults to long polling in development)
APP_URL="https://your-domain.com"

# Server Port (default: 3000)
PORT=3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Setting Up a Live Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to create your bot and obtain your **API Token**.
3. You can connect your bot in two ways:
   - **Method A (Web UI)**: Navigate to the **Bot Setup** tab in the running app, paste your Bot Token, and click **Connect Telegram Bot**.
   - **Method B (.env file)**: Set `TELEGRAM_BOT_TOKEN="your_token_here"` in your `.env` file and start the server.
4. Open your bot in Telegram, tap `/start`, upload any portrait photo, and receive your ready-to-print `.docx` file in seconds!

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts full-stack development server on port 3000 (`tsx server.ts`) |
| `npm run build` | Builds client assets for production into `dist/` |
| `npm run start` | Runs the production server (`node server.ts`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans build artifacts (`dist`, `server.js`) |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/telegram/status` | Returns active Telegram bot connection and webhook status |
| `POST` | `/api/telegram/configure` | Dynamically configures Bot Token and registers Webhook/Long Polling |
| `POST` | `/api/telegram/webhook` | Receives incoming Telegram update events from Telegram servers |
| `POST` | `/api/telegram/simulate` | Simulates bot chat interactions within the Web UI simulator |
| `POST` | `/api/generate-docx` | Generates a binary `.docx` file from payload settings and photo data |

---

## 📁 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── BotSetupPanel.tsx      # Live Telegram Token & Webhook setup
│   │   ├── Header.tsx             # Responsive navigation header
│   │   ├── PrintStudio.tsx        # WYSIWYG Print layout & document designer
│   │   ├── SizeStandardsGuide.tsx # Government ID size specifications guide
│   │   └── TelegramSimulator.tsx  # In-browser Telegram chat simulator
│   ├── constants/
│   │   ├── presets.ts             # ID photo & paper size dimensions (mm & twips)
│   │   └── sampleImages.ts        # Default demo portrait models
│   ├── services/
│   │   ├── docxGenerator.ts       # OpenXML Word (.docx) creation engine
│   │   ├── faceDetection.ts       # Smart biometric cropping & alignment
│   │   ├── pdfGenerator.ts        # 1:1 scale vector PDF generator
│   │   └── telegramBotEngine.ts   # Bot state machine, session flow & keyboards
│   ├── utils/
│   │   └── imageHelpers.ts        # Base64, Canvas manipulation & download utils
│   ├── App.tsx                    # Main application container
│   ├── main.tsx                   # React DOM root entry
│   └── types.ts                   # TypeScript interfaces and types
├── server.ts                      # Full-stack Express server + Telegram Bot runner
├── package.json                   # Project scripts and dependencies
├── vite.config.ts                 # Vite bundler configuration
└── README.md                      # Project documentation
```

---

## 🚢 Deployment

### 🟣 Deploy on Render (Recommended)

Render offers free hosting with automated SSL/HTTPS, making it ideal for Telegram Webhooks and Web Studio hosting.

#### Option A: Quick Blueprint Setup
1. Push this repository to your GitHub account.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect `render.yaml`.
5. Under Environment Variables, supply your `TELEGRAM_BOT_TOKEN` and your Render service URL for `APP_URL` (e.g., `https://idprint-studio.onrender.com`).
6. Click **Apply**.

#### Option B: Manual Web Service Setup
1. On Render, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `idprint-studio`
   - **Language / Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Add **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (or leave default, Render sets `PORT` automatically)
   - `TELEGRAM_BOT_TOKEN` = `your_bot_token_from_botfather`
   - `APP_URL` = `https://<your-render-app-name>.onrender.com`
5. Click **Create Web Service**.
6. Once deployed, open your Render URL in your browser or message your Telegram Bot directly!

---

### 🐳 Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

```bash
docker build -t idprint-studio .
docker run -p 3000:3000 -e TELEGRAM_BOT_TOKEN="your_token" idprint-studio
```

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for personal or commercial projects.
