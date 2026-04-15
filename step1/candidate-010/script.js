const symbols = [
  "PROMPT",
  "SLIDE DECK",
  "TOKEN BURN",
  "SYNERGY",
  "PIVOT",
  "HALLUCINATION",
  "AGENT",
  "VAPORWARE",
  "GPU RENT"
];

const startTokens = 120;
const spinCost = 15;
const storageKey = "token-furnace-state";

const reelNodes = [
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
  document.getElementById("reel-3")
];
const tokenCount = document.getElementById("token-count");
const statusLine = document.getElementById("status-line");
const spinButton = document.getElementById("spin-button");
const shareButton = document.getElementById("share-button");
const eventLog = document.getElementById("event-log");
const logTemplate = document.getElementById("log-item-template");

const appState = loadState();
let isSpinning = false;

renderTokens();
renderLog();
toggleButtons();
saveState();

spinButton.addEventListener("click", runSpin);
shareButton.addEventListener("click", shareScore);

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return {
      tokens: startTokens,
      history: ["Boot sequence complete. Casino sarcasm online."]
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      tokens: Number.isFinite(parsed.tokens) ? parsed.tokens : startTokens,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 6) : []
    };
  } catch {
    return {
      tokens: startTokens,
      history: ["State recovery failed. Blaming the AI pipeline."]
    };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(appState));
}

function renderTokens() {
  tokenCount.textContent = String(appState.tokens);
}

function renderLog() {
  eventLog.innerHTML = "";

  appState.history.slice(0, 6).forEach((entry) => {
    const node = logTemplate.content.firstElementChild.cloneNode(true);
    node.textContent = entry;
    eventLog.appendChild(node);
  });
}

function toggleButtons() {
  spinButton.disabled = appState.tokens < spinCost || isSpinning;
  shareButton.disabled = isSpinning;
}

function setStatus(message, tone = "") {
  statusLine.textContent = message;
  statusLine.className = `status-line ${tone}`.trim();
}

function addLog(message) {
  appState.history.unshift(message);
  appState.history = appState.history.slice(0, 6);
  renderLog();
  saveState();
}

async function runSpin() {
  if (isSpinning) {
    return;
  }

  if (appState.tokens < spinCost) {
    setStatus("Out of tokens. Even the AI hype cycle has limits.", "loss");
    return;
  }

  isSpinning = true;
  appState.tokens -= spinCost;
  renderTokens();
  toggleButtons();
  setStatus("Spinning up an expensive demo nobody asked for...");
  pulseMachine();

  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }

    const results = await animateReels();
    const payout = scoreSpin(results);

    appState.tokens += payout.tokensWon;
    renderTokens();
    saveState();

    if (payout.tokensWon > 0) {
      setStatus(payout.message, "win");
    } else {
      setStatus(payout.message, "loss");
    }

    addLog(payout.logMessage);
    playTone(payout.tokensWon > 0 ? "win" : "loss");
  } finally {
    isSpinning = false;
    toggleButtons();
  }
}

function animateReels() {
  return Promise.all(
    reelNodes.map((node, index) => {
      return new Promise((resolve) => {
        let ticks = 0;
        const maxTicks = 10 + index * 6;

        const timer = window.setInterval(() => {
          node.textContent = randomSymbol();
          ticks += 1;

          if (ticks >= maxTicks) {
            window.clearInterval(timer);
            const finalSymbol = randomSymbol();
            node.textContent = finalSymbol;
            resolve(finalSymbol);
          }
        }, 85);
      });
    })
  );
}

function scoreSpin(results) {
  const counts = results.reduce((map, symbol) => {
    map[symbol] = (map[symbol] || 0) + 1;
    return map;
  }, {});

  const values = Object.values(counts).sort((a, b) => b - a);
  const topCount = values[0];
  const spotlight = Object.keys(counts).find((key) => counts[key] === topCount);

  if (topCount === 3) {
    return {
      tokensWon: 60,
      message: `Jackpot: triple ${spotlight}. The machine generated confidence out of thin air.`,
      logMessage: `Triple ${spotlight}. The casino issued 60 apology tokens.`
    };
  }

  if (topCount === 2) {
    return {
      tokensWon: 25,
      message: `Two ${spotlight}s. Enough for a seed round and one alarming keynote.`,
      logMessage: `Matched ${spotlight} twice and clawed back 25 tokens.`
    };
  }

  return {
    tokensWon: 0,
    message: "No match. Your tokens have been successfully converted into vague platform value.",
    logMessage: `No match. Another 15 tokens entered the innovation furnace.`
  };
}

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function pulseMachine() {
  document.querySelector(".machine").classList.remove("flash");
  window.requestAnimationFrame(() => {
    document.querySelector(".machine").classList.add("flash");
  });
}

async function shareScore() {
  const message = `I have ${appState.tokens} tokens left in Token Furnace, a slot machine where AI mostly turns money into buzzwords.`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Token Furnace",
        text: message
      });
      setStatus("Brag transmitted. The internet is now slightly worse.");
      return;
    } catch {
      setStatus("Share canceled. Pride preserved.");
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(message);
    setStatus("Score copied to clipboard. Ready for your most cursed group chat.");
  } catch {
    setStatus("Couldn't share automatically, but the machine still believes in you.");
  }
}

function playTone(kind) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = kind === "win" ? 660 : 180;
  gainNode.gain.value = 0.0001;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  oscillator.start(now);
  oscillator.stop(now + 0.25);
}
