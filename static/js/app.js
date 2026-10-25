/**
 * OmniCast AI - Interactive Frontend Controller
 * Powers all 4 distinct feature tabs:
 * 1. Live Match Feed & Ball-by-Ball Stream
 * 2. Complexity Switcher & Cultural Adaptation
 * 3. Multilingual Broadcast (15 Languages Matrix)
 * 4. Audio Voice Mail / Live Audio Stream
 */

// Global Application State
let currentTab = 'feed-tab';
let matchData = null;
let feedBalls = [];
let activeBallIndex = 0;
let currentSelectedBallText = "Short of a length and angled across off, left alone by the batsman.";
let isAutoStreaming = false;
let autoStreamTimer = null;

// Tab 2 State
let activeComplexityMode = 'rookie';
let activeCulturalTone = 'bhojpuri_dhamaka';
let activeTargetLang = 'Hindi';
let currentAdaptedAudioUrl = '';

// Tab 3 State
let fullMatrixData = [];

// Tab 4 State
let audioElement = null;
let isAudioPlaying = false;
let isRadioLive = false;
let radioTimer = null;
let stadiumAmbianceAudio = null;
let currentRadioLang = 'Hindi';

// Canvas Waveform Context
let waveCanvas = null;
let waveCtx = null;
let waveAnimationId = null;

// ==============================================================
// 1. Initialization
// ==============================================================
document.addEventListener('DOMContentLoaded', async () => {
  audioElement = document.getElementById('real-audio-element');
  waveCanvas = document.getElementById('waveform-canvas');
  if (waveCanvas) {
    waveCtx = waveCanvas.getContext('2d');
    drawIdleWaveform();
  }

  setupAudioListeners();
  await loadMatchFeed();
  await runAdaptation();
  await loadMultilingualMatrix();

  // Setup sample voicemail on load
  initDefaultVoicemail();
});

// ==============================================================
// 2. Tab Navigation System
// ==============================================================
function switchTab(tabId) {
  currentTab = tabId;

  // Update navbar button states
  const tabButtons = {
    'feed-tab': 'btn-tab-feed',
    'complexity-tab': 'btn-tab-complexity',
    'multilingual-tab': 'btn-tab-multilingual',
    'audio-tab': 'btn-tab-audio'
  };

  Object.entries(tabButtons).forEach(([panelId, btnId]) => {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    if (btn) {
      if (panelId === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
    if (panel) {
      if (panelId === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    }
  });

  window.scrollTo({ top: 480, behavior: 'smooth' });
}

// ==============================================================
// 3. Tab 1: Live Match Feed & Ball-by-Ball Stream
// ==============================================================
async function loadMatchFeed() {
  try {
    const response = await fetch('/api/feed');
    const data = await response.json();
    matchData = data.match;
    feedBalls = data.balls;

    // Render scoreboard
    renderScoreboard(matchData);
    renderBallStream(feedBalls);

    if (feedBalls.length > 0) {
      selectBall(feedBalls[0]);
    }
  } catch (err) {
    console.error("Error loading match feed:", err);
  }
}

function renderScoreboard(match) {
  if (!match) return;
  const scoreElem = document.getElementById('ticker-score');
  const crrElem = document.getElementById('ticker-crr');
  if (scoreElem) scoreElem.textContent = match.current_score;
  if (crrElem) crrElem.textContent = match.run_rate;
}

function renderBallStream(balls, filter = 'all') {
  const container = document.getElementById('ball-stream-container');
  if (!container) return;
  container.innerHTML = '';

  const filtered = filter === 'all' 
    ? balls 
    : balls.filter(b => b.event_type.toUpperCase() === filter.toUpperCase());

  // Update count badge
  const countAll = document.getElementById('count-all');
  if (countAll) countAll.textContent = balls.length;

  filtered.forEach((ball, idx) => {
    const item = document.createElement('div');
    item.className = `timeline-ball-item ${ball.raw_text === currentSelectedBallText ? 'active' : ''}`;
    item.id = `ball-card-${ball.id}`;
    item.onclick = () => selectBall(ball);

    item.innerHTML = `
      <div class="ball-item-header">
        <div class="ball-meta-left">
          <span class="over-pill">${ball.over}</span>
          <span class="bowler-striker">${ball.bowler} to ${ball.striker}</span>
        </div>
        <span class="event-badge badge-${ball.event_type}">${ball.event_type} (${ball.runs}r)</span>
      </div>
      <p class="ball-commentary-text">${ball.raw_text}</p>
      <div class="ball-item-footer">
        <span>⚡ ${ball.speed} • ${ball.pitch_zone}</span>
        <div class="ball-actions-strip">
          <button class="btn-mini-action" onclick="event.stopPropagation(); sendToComplexity('${escapeQuotes(ball.raw_text)}')">🎛️ Adapt</button>
          <button class="btn-mini-action" onclick="event.stopPropagation(); sendToMultilingual('${escapeQuotes(ball.raw_text)}')">🌐 15 Langs</button>
          <button class="btn-mini-action" onclick="event.stopPropagation(); playBallAudioInstant('${escapeQuotes(ball.raw_text)}', 'Hindi')">🔊 Listen</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function selectBall(ball) {
  currentSelectedBallText = ball.raw_text;

  // Highlight in list
  document.querySelectorAll('.timeline-ball-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`ball-card-${ball.id}`);
  if (activeEl) activeEl.classList.add('active');

  // Update Pitch Telemetry
  const speedEl = document.getElementById('active-ball-speed');
  const bowlerEl = document.getElementById('metric-bowler');
  const strikerEl = document.getElementById('metric-striker');
  const impactEl = document.getElementById('metric-impact');
  const zoneTextEl = document.getElementById('pitch-zone-text');
  const rawTextEl = document.getElementById('active-ball-raw-text');
  const impactMarker = document.getElementById('pitch-impact-marker');

  if (speedEl) speedEl.textContent = ball.speed;
  if (bowlerEl) bowlerEl.textContent = ball.bowler;
  if (strikerEl) strikerEl.textContent = ball.striker;
  if (impactEl) {
    impactEl.textContent = ball.impact;
    impactEl.className = ball.event_type === 'WICKET' ? 'metric-val text-red' : 'metric-val';
  }
  if (zoneTextEl) zoneTextEl.textContent = ball.pitch_zone;
  if (rawTextEl) rawTextEl.textContent = `"${ball.raw_text}"`;

  // Move marker based on zone
  if (impactMarker) {
    if (ball.pitch_zone.includes('Yorker') || ball.pitch_zone.includes('blockhole')) {
      impactMarker.style.top = '78%';
      impactMarker.style.left = '48%';
    } else if (ball.pitch_zone.includes('Full')) {
      impactMarker.style.top = '62%';
      impactMarker.style.left = '52%';
    } else if (ball.pitch_zone.includes('Good')) {
      impactMarker.style.top = '45%';
      impactMarker.style.left = '60%';
    } else {
      impactMarker.style.top = '30%';
      impactMarker.style.left = '65%';
    }
  }

  // Pre-fill Tab 2 input field
  const inputRaw = document.getElementById('input-raw-commentary');
  if (inputRaw) inputRaw.value = ball.raw_text;
}

function advanceNextBall() {
  if (!feedBalls || feedBalls.length === 0) return;
  activeBallIndex = (activeBallIndex + 1) % feedBalls.length;
  const nextBall = feedBalls[activeBallIndex];
  selectBall(nextBall);
  showToast(`Streaming delivery ${nextBall.over} • ${nextBall.event_type}`);
}

function toggleAutoStream() {
  const btn = document.getElementById('btn-toggle-autostream');
  const text = document.getElementById('autostream-text');
  const icon = document.getElementById('autostream-icon');

  if (!isAutoStreaming) {
    isAutoStreaming = true;
    btn.classList.add('streaming');
    text.textContent = "Streaming Live...";
    icon.textContent = "🟢";
    showToast("Live Ball-by-Ball Simulator active (Auto every 5s)");

    autoStreamTimer = setInterval(() => {
      advanceNextBall();
    }, 5000);
  } else {
    isAutoStreaming = false;
    clearInterval(autoStreamTimer);
    btn.classList.remove('streaming');
    text.textContent = "Simulate Live Stream";
    icon.textContent = "🔴";
    showToast("Live Stream paused");
  }
}

function filterFeed(type, element) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');
  renderBallStream(feedBalls, type);
}

function sendToComplexity(text) {
  currentSelectedBallText = text;
  const inputRaw = document.getElementById('input-raw-commentary');
  if (inputRaw) inputRaw.value = text;
  switchTab('complexity-tab');
  runAdaptation();
}

function sendToMultilingual(text) {
  currentSelectedBallText = text;
  switchTab('multilingual-tab');
  refreshMatrix(text);
}

function sanitizeCricketText(text) {
  if (!text) return "";
  let cleaned = String(text);
  const banned = [
    "अरे दादा रे दादा! ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा!",
    "अरे दादा रे दादा! ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा",
    "ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा!",
    "ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा",
    "अरे दादा रे दादा! ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा!",
    "ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा!",
    "ई त गर्दा उड़ा दिहलन भइया!",
    "ई त गर्दा उड़ा दिहलन भइया",
    "ई त गर्दा उड़ा दिहलन!",
    "ई त गर्दा उड़ा दिहलन",
    "ई त गर्दा उड़ा दिहलिस!",
    "ई त गर्दा उड़ा दिहलिस",
    "ई त गर्दा उड़ा दिहलन भइया!",
    "ई त गर्दा उड़ा दिहलन भइया",
    "ई त गर्दा उड़ा दिहलन!",
    "ई त गर्दा उड़ा दिहलन",
    "ई त गर्दा उड़ा दिहलिस!",
    "ई त गर्दा उड़ा दिहलिस",
    "ई त गर्दा!",
    "ई त गर्दा",
    "स्टेडियम में पूरा भउकाल मच गइल बा!",
    "स्टेडियम में पूरा भउकाल मच गइल बा",
    "भउकाल मच गइल बा!",
    "भउकाल मच गइल बा",
    "भौकाल मच गइल बा!",
    "भौकाल मच गइल बा",
    "गर्दा उड़ा दिहलन भइया!",
    "गर्दा उड़ा दिहलन भइया",
    "गर्दा उड़ा दिहलन!",
    "गर्दा उड़ा दिहलन",
    "गर्दा उड़ा दिहलन भइया!",
    "गर्दा उड़ा दिहलन भइया",
    "गर्दा उड़ा दिहलन!",
    "गर्दा उड़ा दिहलन",
    "गर्दा उड़ा दिहलिस!",
    "गर्दा उड़ा दिहलिस",
    "गर्दा उड़ा दिहलें!",
    "गर्दा उड़ा दिहलें",
    "गर्दा उड़ा!",
    "गर्दा उड़ा",
    "गर्दा उड़ा!",
    "गर्दा उड़ा",
    "गर्दा!",
    "गर्दा",
    "भउकाल!",
    "भउकाल",
    "भौकाल!",
    "भौकाल",
    "अरे दादा रे दादा!",
    "अरे दादा रे दादा",
    "दादा रे दादा!",
    "दादा रे दादा",
    "अरे दादा!",
    "अरे दादा",
    "अरे बाप रे!",
    "अरे बाप रे",
    "बाप रे बाप!",
    "बाप रे बाप",
    "अरे भिड़ू!",
    "अरे भिड़ू",
    "भिड़ू"
  ];
  for (const phrase of banned) {
    cleaned = cleaned.split(phrase).join('');
  }
  return cleaned.replace(/^\s*[:\-!\s]+/, '').replace(/\s+/g, ' ').trim();
}

async function sendToAudioVoiceMail(text) {
  currentSelectedBallText = sanitizeCricketText(text);
  const scriptArea = document.getElementById('vm-input-script');
  const langSelect = document.getElementById('vm-select-language');
  const targetLang = langSelect ? langSelect.value : 'Bengali';

  try {
    const res = await fetch('/api/adapt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: currentSelectedBallText,
        target_lang: targetLang,
        audience_mode: activeComplexityMode || 'rookie',
        cultural_tone: 'standard'
      })
    });
    const data = await res.json();
    if (data.success && data.adapted_text && scriptArea) {
      scriptArea.value = sanitizeCricketText(data.adapted_text);
    } else if (scriptArea) {
      scriptArea.value = currentSelectedBallText;
    }
  } catch (e) {
    if (scriptArea) scriptArea.value = currentSelectedBallText;
  }
  updateVoicemailPreview();
  switchTab('audio-tab');
  showToast(`Loaded ${targetLang} commentary into Voicemail Studio`);
}

// ==============================================================
// 4. Tab 2: Complexity Switcher & Cultural Adaptation
// ==============================================================
function setComplexityMode(mode) {
  activeComplexityMode = mode;
  document.getElementById('btn-mode-rookie').classList.toggle('active', mode === 'rookie');
  document.getElementById('btn-mode-expert').classList.toggle('active', mode === 'expert');

  const badgeMode = document.getElementById('badge-active-mode');
  if (badgeMode) {
    badgeMode.textContent = mode === 'rookie' ? 'ROOKIE MODE' : 'HARDCORE TACTICAL EXPERT';
  }

  // Update explainability metrics
  const fillJargon = document.getElementById('score-fill-jargon');
  const textJargon = document.getElementById('score-text-jargon');
  if (mode === 'rookie') {
    fillJargon.style.width = '20%';
    fillJargon.style.background = '#38bdf8';
    textJargon.textContent = 'Low Jargon (Accessible to 99% of casual fans)';
  } else {
    fillJargon.style.width = '95%';
    fillJargon.style.background = '#f59e0b';
    textJargon.textContent = 'High Tactical Jargon (Biomechanics, Seam Angles, xG)';
  }

  runAdaptation();
}

async function runAdaptation() {
  const inputElem = document.getElementById('input-raw-commentary');
  const rawText = inputElem ? inputElem.value.trim() : currentSelectedBallText;

  const toneSelect = document.getElementById('select-cultural-tone');
  activeCulturalTone = toneSelect ? toneSelect.value : 'bhojpuri_dhamaka';

  const langSelect = document.getElementById('select-target-lang-adaptation');
  activeTargetLang = langSelect ? langSelect.value : 'Hindi';

  // Update prompt explanation box
  const explainPrompt = document.getElementById('explain-prompt-code');
  if (explainPrompt) {
    const promptAudienceDesc = activeComplexityMode === 'rookie' 
      ? `Make it suitable for an absolute beginner who doesn't know cricket rules.` 
      : `With hardcore tactical analysis: corridor angles, seam wobble, release velocity.`;
    explainPrompt.textContent = `"Translate and rewrite this sports commentary into ${activeTargetLang} (${activeCulturalTone}). ${promptAudienceDesc} '${rawText}'"`;
  }

  // Cultural Badge
  const toneBadge = document.getElementById('badge-active-culture');
  if (toneBadge && toneSelect) {
    toneBadge.textContent = toneSelect.options[toneSelect.selectedIndex].text.split('(')[0].trim().toUpperCase();
  }

  const rawDisplay = document.getElementById('display-raw-commentary');
  const adaptedDisplay = document.getElementById('display-adapted-commentary');
  const rawCount = document.getElementById('raw-word-count');
  const langTag = document.getElementById('adapted-lang-tag');
  const latencyTag = document.getElementById('adapted-latency-tag');

  if (rawDisplay) rawDisplay.textContent = `"${rawText}"`;
  if (rawCount) rawCount.textContent = `${rawText.split(/\s+/).length} words`;
  if (adaptedDisplay) adaptedDisplay.innerHTML = `<span style="opacity: 0.6;">Generating neural adaptation...</span>`;

  try {
    const response = await fetch('/api/adapt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: rawText,
        audience_mode: activeComplexityMode,
        target_lang: activeTargetLang,
        cultural_tone: activeCulturalTone
      })
    });

    const res = await response.json();
    if (res.success) {
      if (adaptedDisplay) adaptedDisplay.textContent = res.adapted_text;
      if (langTag) langTag.textContent = `Language: ${res.target_lang}`;
      if (latencyTag) latencyTag.textContent = `AI Latency: ${res.latency_ms}ms`;
    }
  } catch (err) {
    console.error("Adaptation error:", err);
    if (adaptedDisplay) adaptedDisplay.textContent = "Error generating adaptation. Please try again.";
  }
}

async function playCurrentAdaptedAudio() {
  const adaptedDisplay = document.getElementById('display-adapted-commentary');
  const text = adaptedDisplay ? adaptedDisplay.textContent.trim() : '';
  if (!text || text.includes('Generating neural adaptation...')) return;
  await playBallAudioInstant(text, activeTargetLang, activeCulturalTone);
}

function copyAdaptedText() {
  const adaptedDisplay = document.getElementById('display-adapted-commentary');
  if (adaptedDisplay) {
    navigator.clipboard.writeText(adaptedDisplay.textContent);
    showToast("Adapted commentary copied to clipboard!");
  }
}

async function sendAdaptedToVoicemail() {
  const adaptedDisplay = document.getElementById('display-adapted-commentary');
  if (adaptedDisplay) {
    const text = adaptedDisplay.textContent.trim();
    if (!text || text.includes('Generating neural adaptation...')) return;
    const scriptArea = document.getElementById('vm-input-script');
    const langSelect = document.getElementById('vm-select-language');
    if (scriptArea) scriptArea.value = text;
    if (langSelect) langSelect.value = activeTargetLang;
    updateVoicemailPreview();
    switchTab('audio-tab');
    showToast(`Loaded ${activeTargetLang} (${activeCulturalTone}) adaptation into Voicemail Studio`);
    await generateVoicemail();
  }
}

// ==============================================================
// 5. Tab 3: Multilingual Broadcast Matrix (15 Languages)
// ==============================================================
async function loadMultilingualMatrix(customText = null) {
  const text = customText || currentSelectedBallText;
  const tbody = document.getElementById('matrix-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color: #94a3b8;">Processing 15-Language Neural Pipeline (Cell 6)...</td></tr>`;
  }

  try {
    const response = await fetch('/api/multilingual-matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: text,
        audience_mode: activeComplexityMode,
        cultural_tone: activeCulturalTone
      })
    });

    const data = await response.json();
    if (data.success) {
      fullMatrixData = data.matrix;
      renderMatrixTable(fullMatrixData);
    }
  } catch (err) {
    console.error("Matrix error:", err);
  }
}

function renderMatrixTable(matrixRows) {
  const tbody = document.getElementById('matrix-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  matrixRows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="lang-cell-wrap">
          <span class="lang-flag">${row.Flag || '🌐'}</span>
          <div class="lang-names">
            <span class="lang-name-en">${row.Language}</span>
            <span class="lang-name-native">${row["Native Name"]}</span>
          </div>
        </div>
      </td>
      <td><span class="code-pill">${row["gTTS Code"]}</span></td>
      <td><span class="region-tag">${row.Region || 'India'}</span></td>
      <td><p class="table-commentary-text">${row["Adapted Commentary"]}</p></td>
      <td>
        <div class="table-action-btns">
          <button class="btn-table-listen" onclick="playBallAudioInstant('${escapeQuotes(row["Adapted Commentary"])}', '${row.Language}')">
            🔊 Listen
          </button>
          <button class="btn-table-vm" onclick="loadRowIntoVoicemail('${row.Language}', '${escapeQuotes(row["Adapted Commentary"])}')">
            🎙️ VM
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterMatrixRegion(region, element) {
  document.querySelectorAll('.m-chip').forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');

  if (region === 'all') {
    renderMatrixTable(fullMatrixData);
  } else {
    const filtered = fullMatrixData.filter(r => r.Region === region);
    renderMatrixTable(filtered);
  }
}

function searchMatrix() {
  const query = document.getElementById('matrix-search-input').value.toLowerCase().trim();
  if (!query) {
    renderMatrixTable(fullMatrixData);
    return;
  }
  const filtered = fullMatrixData.filter(r => 
    r.Language.toLowerCase().includes(query) ||
    r["Native Name"].toLowerCase().includes(query) ||
    r["Adapted Commentary"].toLowerCase().includes(query)
  );
  renderMatrixTable(filtered);
}

function refreshMatrix(customText = null) {
  loadMultilingualMatrix(customText);
  showToast("15-Language Matrix regenerated!");
}

function copyMatrixAsCSV() {
  if (!fullMatrixData || fullMatrixData.length === 0) return;
  let csv = "Language,gTTS Code,Region,Adapted Commentary\n";
  fullMatrixData.forEach(r => {
    const cleanComm = `"${r["Adapted Commentary"].replace(/"/g, '""')}"`;
    csv += `${r.Language},${r["gTTS Code"]},${r.Region},${cleanComm}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OmniCast_15_Languages_Matrix.csv`;
  a.click();
  showToast("15-Language CSV downloaded!");
}

function loadRowIntoVoicemail(lang, text) {
  const scriptArea = document.getElementById('vm-input-script');
  const langSelect = document.getElementById('vm-select-language');
  const clean = sanitizeCricketText(text);
  if (scriptArea) scriptArea.value = clean;
  if (langSelect) langSelect.value = lang;
  updateVoicemailPreview();
  switchTab('audio-tab');
  showToast(`Loaded ${lang} audio script into Voicemail Studio`);
}

// ==============================================================
// 6. Tab 4: Audio Voice Mail & Live Audio Stream
// ==============================================================
async function initDefaultVoicemail() {
  // Matches cell 7 of Untitled5.ipynb: Bengali default voice mail
  const defaultText = "বোলার বলটি কিছুটা পেছনে ফেলেছিলেন, ফলে বলটি বাউন্স করে ব্যাটার থেকে দূরে গেল এবং ব্যাটার ঝুঁকি না নিয়ে বলটি ছেড়ে দিলেন।";
  try {
    const res = await fetch('/api/generate-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: defaultText,
        language: "Bengali",
        recipient: "All Fans"
      })
    });
    const data = await res.json();
    if (data.success) {
      updateAudioPlayerUI(data);
      const spokenTextEl = document.getElementById('vm-spoken-script-text');
      if (spokenTextEl) spokenTextEl.textContent = `"${data.script}"`;
    }
  } catch (err) {
    console.error("Default voicemail init error:", err);
  }
}

async function onVoicemailLanguageChange() {
  const langSelect = document.getElementById('vm-select-language');
  const scriptArea = document.getElementById('vm-input-script');
  const newLang = langSelect ? langSelect.value : 'Bengali';

  // Translate currently selected ball or input text to newLang
  try {
    const res = await fetch('/api/adapt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: currentSelectedBallText,
        target_lang: newLang,
        audience_mode: activeComplexityMode || 'rookie',
        cultural_tone: activeCulturalTone || 'standard'
      })
    });
    const data = await res.json();
    if (data.success && data.adapted_text && scriptArea) {
      scriptArea.value = sanitizeCricketText(data.adapted_text);
    }
  } catch (e) {
    console.error("Language change adapt error:", e);
  }
  updateVoicemailPreview();
  showToast(`Switched Voicemail Language to ${newLang}`);
}

function updateVoicemailPreview() {
  const scriptArea = document.getElementById('vm-input-script');
  const recipientInput = document.getElementById('vm-input-recipient');
  const previewText = document.getElementById('vm-spoken-script-text');

  if (!previewText) return;
  const rawBody = scriptArea ? scriptArea.value.trim() : '';
  const bodyText = sanitizeCricketText(rawBody);
  const recipient = recipientInput ? recipientInput.value.trim() : '';

  let fullPreview = bodyText;
  if (recipient && recipient !== 'All Fans') {
    fullPreview = `[${recipient}] ` + fullPreview;
  }
  previewText.textContent = `"${fullPreview}"`;
}

async function generateVoicemail() {
  const langSelect = document.getElementById('vm-select-language');
  const recipientInput = document.getElementById('vm-input-recipient');
  const celebrationSelect = document.getElementById('vm-select-celebration');
  const scriptText = document.getElementById('vm-input-script');

  const selectedLang = langSelect ? langSelect.value : 'Bengali';
  const recipient = recipientInput ? recipientInput.value.trim() : 'All Fans';
  const celebration = celebrationSelect ? celebrationSelect.value : '';
  const rawText = scriptText ? scriptText.value.trim() : '';
  const text = sanitizeCricketText(rawText);

  if (!text) {
    showToast("Please enter speech script content");
    return;
  }

  const btn = document.getElementById('btn-generate-vm');
  const btnIcon = document.getElementById('btn-vm-icon');
  const btnText = document.getElementById('btn-vm-text');

  btn.disabled = true;
  btnIcon.textContent = "⏳";
  btnText.textContent = `Synthesizing ${selectedLang} voice with gTTS...`;

  try {
    const response = await fetch('/api/generate-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        language: selectedLang,
        recipient: recipient,
        celebration: celebration,
        audience_mode: activeComplexityMode || 'rookie',
        cultural_tone: activeCulturalTone || 'standard'
      })
    });

    const res = await response.json();
    if (res.success) {
      if (res.body_text && scriptText) {
        scriptText.value = res.body_text;
      }
      updateAudioPlayerUI(res);
      const spokenTextEl = document.getElementById('vm-spoken-script-text');
      if (spokenTextEl) spokenTextEl.textContent = `"${res.script}"`;
      updateVoicemailPreview();
      showToast(`Audio Voicemail in ${selectedLang} generated (${res.file_size_kb} KB)! Playing...`);
      playAudio(res.audio_url);
    } else {
      showToast("Error generating voicemail audio");
    }
  } catch (err) {
    console.error("Voicemail generation error:", err);
    showToast("Server connection error during audio generation");
  } finally {
    btn.disabled = false;
    btnIcon.textContent = "✨";
    btnText.textContent = "Generate Voicemail Audio (.mp3)";
  }
}

function updateAudioPlayerUI(data) {
  const filenameEl = document.getElementById('vm-audio-filename');
  const filesizeEl = document.getElementById('vm-audio-filesize');
  const downloadLink = document.getElementById('vm-download-link');

  if (filenameEl) filenameEl.textContent = data.filename;
  if (filesizeEl) filesizeEl.textContent = `${data.file_size_kb} KB`;
  if (downloadLink) {
    downloadLink.href = data.audio_url;
    downloadLink.download = data.filename;
  }

  if (audioElement) {
    audioElement.src = data.audio_url;
  }
}

function toggleVoicemailPlay() {
  if (!audioElement || !audioElement.src) return;
  if (audioElement.paused) {
    audioElement.play();
  } else {
    audioElement.pause();
  }
}

function playAudio(url) {
  if (!audioElement) return;
  audioElement.src = url;
  audioElement.play().catch(e => console.log("Audio autoplay policy:", e));
}

async function playBallAudioInstant(text, lang = 'Hindi', tone = null) {
  const chosenTone = tone || activeCulturalTone || 'standard';
  showToast(`Generating ${lang} commentary audio (${chosenTone})...`);
  try {
    const res = await fetch('/api/generate-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        language: lang,
        recipient: "All Fans",
        audience_mode: activeComplexityMode || 'rookie',
        cultural_tone: chosenTone
      })
    });
    const data = await res.json();
    if (data.success) {
      updateAudioPlayerUI(data);
      const spokenTextEl = document.getElementById('vm-spoken-script-text');
      if (spokenTextEl) spokenTextEl.textContent = `"${data.script}"`;
      playAudio(data.audio_url);
    }
  } catch (err) {
    console.error("Instant play error:", err);
  }
}

function setupAudioListeners() {
  if (!audioElement) return;

  const playIcon = document.getElementById('vm-play-icon');
  const scrubber = document.getElementById('vm-scrubber');
  const curTime = document.getElementById('vm-current-time');
  const totTime = document.getElementById('vm-total-time');

  audioElement.addEventListener('play', () => {
    isAudioPlaying = true;
    if (playIcon) playIcon.textContent = '⏸';
    startWaveformAnimation();
  });

  audioElement.addEventListener('pause', () => {
    isAudioPlaying = false;
    if (playIcon) playIcon.textContent = '▶';
    stopWaveformAnimation();
  });

  audioElement.addEventListener('ended', () => {
    isAudioPlaying = false;
    if (playIcon) playIcon.textContent = '▶';
    stopWaveformAnimation();
  });

  audioElement.addEventListener('timeupdate', () => {
    if (audioElement.duration) {
      const pct = (audioElement.currentTime / audioElement.duration) * 100;
      if (scrubber) scrubber.value = pct;
      if (curTime) curTime.textContent = formatTime(audioElement.currentTime);
      if (totTime) totTime.textContent = formatTime(audioElement.duration);
    }
  });
}

function scrubAudio(val) {
  if (!audioElement || !audioElement.duration) return;
  audioElement.currentTime = (val / 100) * audioElement.duration;
}

function setAudioVolume(val) {
  if (audioElement) audioElement.volume = parseFloat(val);
}

function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Waveform Canvas Animation
function drawIdleWaveform() {
  if (!waveCtx || !waveCanvas) return;
  const w = waveCanvas.width;
  const h = waveCanvas.height;
  waveCtx.clearRect(0, 0, w, h);

  waveCtx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
  waveCtx.lineWidth = 2;
  waveCtx.beginPath();
  waveCtx.moveTo(0, h / 2);
  for (let x = 0; x < w; x += 10) {
    const y = h / 2 + Math.sin(x * 0.05) * 5;
    waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();
}

function startWaveformAnimation() {
  let step = 0;
  function animate() {
    if (!isAudioPlaying) return;
    if (waveCtx && waveCanvas) {
      const w = waveCanvas.width;
      const h = waveCanvas.height;
      waveCtx.clearRect(0, 0, w, h);

      // Gradient wave
      const grad = waveCtx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.5, '#4ade80');
      grad.addColorStop(1, '#a855f7');

      waveCtx.strokeStyle = grad;
      waveCtx.lineWidth = 3;
      waveCtx.beginPath();
      waveCtx.moveTo(0, h / 2);

      for (let x = 0; x < w; x += 6) {
        const amp = 15 + Math.sin(step * 0.1 + x * 0.03) * 12;
        const y = h / 2 + Math.sin(step * 0.2 + x * 0.06) * amp;
        waveCtx.lineTo(x, y);
      }
      waveCtx.stroke();
      step++;
    }
    waveAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function stopWaveformAnimation() {
  if (waveAnimationId) cancelAnimationFrame(waveAnimationId);
  drawIdleWaveform();
}

// -------------------------------------------------------------
// Live Radio Commentary Stream
// -------------------------------------------------------------
function toggleRadioStream() {
  const btn = document.getElementById('btn-toggle-radio');
  const icon = document.getElementById('radio-icon');
  const text = document.getElementById('radio-text');
  const waveBars = document.getElementById('radio-wave-bars');

  if (!isRadioLive) {
    isRadioLive = true;
    btn.classList.add('broadcasting');
    icon.textContent = "⏹";
    text.textContent = "Stop Broadcast";
    if (waveBars) waveBars.style.opacity = '1';
    showToast("Radio Commentary Stream ON AIR!");
    broadcastNextRadioBall();

    radioTimer = setInterval(() => {
      broadcastNextRadioBall();
    }, 12000);
  } else {
    isRadioLive = false;
    clearInterval(radioTimer);
    btn.classList.remove('broadcasting');
    icon.textContent = "▶";
    text.textContent = "Start Radio Stream";
    if (waveBars) waveBars.style.opacity = '0.4';
    showToast("Radio Stream stopped");
  }
}

async function broadcastNextRadioBall() {
  const ball = (feedBalls && feedBalls.length > 0)
    ? feedBalls[Math.floor(Math.random() * feedBalls.length)]
    : {
        raw_text: currentSelectedBallText || "Short of a length and angled across off, left alone by the batsman.",
        bowler: "Jasprit Bumrah",
        striker: "Virat Kohli",
        speed: "142 km/h",
        event_type: "DOT"
      };
  const nowText = document.getElementById('radio-now-playing-text');
  const nowMeta = document.getElementById('radio-now-playing-meta');

  // Adapt this ball delivery to currentRadioLang so text and voice are 100% in target language
  let spokenText = ball.raw_text;
  try {
    const adaptRes = await fetch('/api/adapt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: ball.raw_text,
        target_lang: currentRadioLang,
        audience_mode: 'rookie',
        cultural_tone: 'standard'
      })
    });
    const adaptData = await adaptRes.json();
    if (adaptData.success && adaptData.adapted_text) {
      spokenText = adaptData.adapted_text;
    }
  } catch (e) {
    console.error("Radio interpretation error:", e);
  }

  if (nowText) nowText.textContent = `"${spokenText}"`;
  if (nowMeta) nowMeta.textContent = `Channel: ${currentRadioLang} 98.4 FM • ${ball.bowler} to ${ball.striker} (${ball.speed}) • ${ball.event_type}`;

  // Synthesize and play audio in the exact target language
  await playBallAudioInstant(spokenText, currentRadioLang);
}

async function setRadioChannel(lang, element) {
  currentRadioLang = lang;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    document.querySelectorAll('.preset-btn').forEach(b => {
      if (b.textContent.includes(lang)) b.classList.add('active');
    });
  }
  showToast(`Switched Radio Station to ${lang} 98.4 FM`);
  await broadcastNextRadioBall();
}

function toggleStadiumAmbiance(enabled) {
  if (enabled) {
    showToast("Stadium Crowd Ambiance enabled (Crowd roar fx active)");
  } else {
    showToast("Stadium Crowd Ambiance muted");
  }
}

function triggerQuickLiveRadio() {
  if (!isRadioLive) {
    toggleRadioStream();
  }
}

// ==============================================================
// 7. Custom Ball Add Modal
// ==============================================================
function openAddBallModal() {
  const modal = document.getElementById('add-ball-modal');
  if (modal) modal.classList.add('open');
}

function closeAddBallModal() {
  const modal = document.getElementById('add-ball-modal');
  if (modal) modal.classList.remove('open');
}

async function submitCustomBall() {
  const sport = document.getElementById('new-ball-sport').value;
  const eventType = document.getElementById('new-ball-event').value;
  const runs = document.getElementById('new-ball-runs').value;
  const text = document.getElementById('new-ball-text').value.trim();

  if (!text) {
    showToast("Please enter commentary text");
    return;
  }

  try {
    const res = await fetch('/api/add-ball', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: sport,
        event_type: eventType,
        runs: runs,
        commentary: text
      })
    });
    const data = await res.json();
    if (data.success) {
      closeAddBallModal();
      document.getElementById('new-ball-text').value = '';
      showToast("Custom delivery added to match feed!");
      await loadMatchFeed();
      selectBall(data.ball);
    }
  } catch (err) {
    console.error("Add ball error:", err);
  }
}

// ==============================================================
// 8. Utility Helpers
// ==============================================================
function showToast(msg) {
  const toast = document.getElementById('toast-notify');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
