# OmniCast AI ⚡
> **Next-Generation Multilingual Sports Commentary, Cultural Adaptation & Live Audio Broadcast Engine**

Built for the Axion Hackathon. Inspired by the GoalZone live sports broadcast experience.

---

## 🌟 Key Features & Dedicated Tabs

OmniCast AI provides 4 core tabs:

### 1. ⚡ Live Match Feed & Ball-by-Ball Stream
- **Live Scorecard Ticker**: Active in-play status, real-time score, run rate (CRR), and dynamic win-probability bar.
- **Pitch Radar & Ball Telemetry**: 2D pitch display showing delivery impact zone (Yorker, Full, Good Length, Short, Bouncer), speed (km/h), bowler, striker, and corridor impact risk.
- **Event Timeline Feed**: Categorized events (`WICKET`, `SIX`, `FOUR`, `GOAL`, `SAVE`, `DOT`) with cleaned commentary from commentary datasets.
- **Simulator & Custom Balls**: Auto-stream simulator with 5s cadence, next ball advance, and modal to inject custom match events.

### 2. 🎛️ Complexity Switcher & Cultural Adaptation
- **Dual Audience Complexity**:
  - **Rookie Mode**: Beginner-friendly explanation, zero confusing jargon, clear real-world cricket/soccer analogies.
  - **Hardcore Tactical / Expert Mode**: Deep tactical biomechanics, corridor of uncertainty, seam presentation angles, release velocity, and defensive leave disciplines.
- **7 Cultural Dialects & Regional Slang Presets**:
  - 🏙️ **Mumbai Gully / Tapori** (*Bawa, Kadak line, Swag*)
  - 🥁 **Bhojpuri Desi Dhamaka** (*Garda uda dihe!, Bhaiya*)
  - 🌾 **Punjabi Gabru Josh** (*Chak de phatte!, Dhol energy*)
  - 🐯 **Kolkata Adda & Passion** (*Lyrical, artistic, philosophical*)
  - ⚡ **Chennai Stadium Mass** (*Whistle Podu, Mass hero punchlines*)
  - ☕ **British BBC Classic** (*Vintage dry wit, quintessential craft*)
  - 🏛️ **Standard Broadcast** (*Formal, balanced*)
- **Side-by-Side Comparison Arena**: Original commentary vs Adapted commentary with instant audio synthesis.
- **Explainability Meters**: Cognitive load score, cultural slang intensity, and prompt execution trace.

### 3. 🌐 Multilingual Broadcast (15 Regional Languages)
Full matrix table generating translations and cultural adaptations simultaneously across 15 Indian and Subcontinent languages:
1. **English** (`en`)
2. **Hindi** (`hi`)
3. **Marathi** (`mr`)
4. **Punjabi** (`pa`)
5. **Odia** (`or`)
6. **Gujarati** (`gu`)
7. **Rajasthani** (`hi`)
8. **Tamil** (`ta`)
9. **Telugu** (`te`)
10. **Nepali** (`ne`)
11. **Bengali** (`bn`)
12. **Kannada** (`kn`)
13. **Urdu** (`ur`)
14. **Assamese** (`as`)
15. **Bhojpuri** (`hi`)

- Includes Regional Filter Chips (North, South, East, West, Subcontinent) and instant CSV Export.

### 4. 🎙️ Audio Voice Mail / Live Audio Stream
- **Audio Voice Mail Studio**:
  - Select any of the 15 languages, enter fan/club recipient name, choose celebration outro tag, and generate real `.mp3` audio files via Google `gTTS`.
  - Built-in audio player with play/pause, scrub bar, time readout, volume slider, and one-click MP3 download.
  - Dynamic **HTML5 Canvas Waveform Visualizer** animating in real time with audio output.
- **Live Radio Commentary Stream (OmniCast 98.4 FM)**:
  - Non-stop regional live audio radio broadcast with live "ON AIR" indicator.
  - Ambient stadium crowd sound FX toggle for an immersive arena experience.
  - Quick channel switcher between regional radio stations.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python 3.11, Flask 3.1, Google gTTS
- **NLP & Adaptation Engine**: Qwen-2 0.5B Instruct chat template prompt architecture, multilingual regional lexicon mapping
- **Frontend**: Semantic HTML5, Vanilla CSS3 (Dark Stadium & Emerald Neon Aesthetics, Glassmorphism), Modern Vanilla JavaScript (ES6+)
- **Audio**: Web Audio API, HTML5 Canvas waveform animation, gTTS MP3 generation

---

## 🚀 Deployed Link:
https://omnicast-main-1.vercel.app/

