const STORAGE_KEY = "ai-slot-machine-v1";

const SYMBOLS = [
  { icon: "🤖", name: "Hallucination Bot" },
  { icon: "🪙", name: "Token Cache" },
  { icon: "🧠", name: "Overfit Brain" },
  { icon: "📉", name: "Context Crash" },
  { icon: "✨", name: "Prompt Glitter" },
  { icon: "🐛", name: "Inference Bug" }
];

const DEFAULT_STATE = Object.freeze({
  wallet: 300,
  totalSpent: 0,
  totalWon: 0,
  spins: 0,
  bestWallet: 300
});

const roastWin = [
  "You won tokens. The model calls this a reproducible miracle.",
  "Nice hit. Your prompt engineering degree is now valid for 12 seconds.",
  "Profit detected. Finance bot has entered read-only mode."
];

const roastLose = [
  "No payout. Your luck was quantized to zero.",
  "That spin generated confidence, not results.",
  "You paid tokens to benchmark disappointment."
];

const roastBill = [
  "Hidden API bill applied. Someone left auto-retry on.",
  "Surprise usage spike: your bug report called the endpoint 900 times.",
  "Rate limit panic tax collected."
];

const formatNumber = new Intl.NumberFormat("en-US");

const walletEl = document.getElementById("wallet");
const spentEl = document.getElementById("spent");
const wonEl = document.getElementById("won");
const netEl = document.getElementById("net");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const betEl = document.getElementById("bet");
const spinBtn = document.getElementById("spinBtn");
const shareBtn = document.getElementById("shareBtn");
const resetBtn = document.getElementById("resetBtn");
const voiceToggle = document.getElementById("voiceToggle");
const reels = [...document.querySelectorAll(".reel")];

let isSpinning = false;
let state = loadState();

renderStats();
runRevealAnimation();
wireEvents();

function wireEvents() {
  spinBtn.addEventListener("click", spin);
  shareBtn.addEventListener("click", shareScore);
  resetBtn.addEventListener("click", resetGame);
  betEl.addEventListener("change", renderStats);

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") {
      return;
    }

    const tagName = document.activeElement?.tagName;
    if (tagName === "SELECT" || tagName === "INPUT" || tagName === "BUTTON") {
      return;
    }

    event.preventDefault();
    spin();
  });
}

async function spin() {
  if (isSpinning) {
    return;
  }

  const cost = Number(betEl.value);
  if (state.wallet < cost) {
    setStatus(
      "Insufficient tokens. Sell a startup deck or lower the spin cost.",
      "lose"
    );
    vibrate([50, 30, 50]);
    return;
  }

  isSpinning = true;
  toggleControls(true);

  state.wallet -= cost;
  state.totalSpent += cost;
  state.spins += 1;
  renderStats();

  const result = [drawSymbol(), drawSymbol(), drawSymbol()];
  await Promise.all(
    reels.map((reel, i) => animateReel(reel, result[i].icon, 120 + i * 170))
  );

  let payout = scoreSpin(result, cost);
  let extraBill = 0;

  if (result.some((entry) => entry.icon === "🐛") && Math.random() < 0.35) {
    extraBill = Math.ceil(cost * 0.5);
    state.wallet = Math.max(0, state.wallet - extraBill);
    state.totalSpent += extraBill;
  }

  state.wallet += payout;
  state.totalWon += payout;
  state.bestWallet = Math.max(state.bestWallet, state.wallet);
  persistState();
  renderStats();

  if (extraBill > 0) {
    setStatus(
      `${pick(roastBill)} Extra charge: ${formatTokens(extraBill)} tokens.`,
      "lose"
    );
    playTone(false);
    speak("Hidden bill detected. Budget confidence reduced.");
    vibrate([20, 40, 20, 40, 20]);
  } else if (payout > cost) {
    setStatus(
      `Payout ${formatTokens(payout)} tokens from ${result
        .map((item) => item.icon)
        .join(" ")}. ${pick(roastWin)}`,
      "win"
    );
    playTone(true);
    speak("Jackpot confidence high. Please ignore all caveats.");
    vibrate([40, 20, 90]);
  } else if (payout > 0) {
    setStatus(
      `Small save: ${formatTokens(payout)} tokens. ${pick(roastWin)}`,
      "win"
    );
    playTone(true);
    speak("Partial recovery complete.");
    vibrate(40);
  } else {
    setStatus(
      `No payout on ${result.map((item) => item.icon).join(" ")}. ${pick(
        roastLose
      )}`,
      "lose"
    );
    playTone(false);
    speak("No payout. Please purchase more optimism.");
    vibrate([50, 25, 60]);
  }

  toggleControls(false);
  isSpinning = false;
}

function scoreSpin(result, cost) {
  const [a, b, c] = result.map((item) => item.icon);
  const allSame = a === b && b === c;
  const twoSame = a === b || a === c || b === c;
  const hasCoin = result.some((item) => item.icon === "🪙");
  const hasSparkle = result.some((item) => item.icon === "✨");

  if (allSame && a === "🪙") {
    return cost * 10;
  }

  if (allSame) {
    return cost * 6;
  }

  if (hasCoin && hasSparkle) {
    return cost * 3;
  }

  if (twoSame) {
    return cost * 2;
  }

  return 0;
}

function drawSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function animateReel(reel, finalIcon, delayMs) {
  return new Promise((resolve) => {
    const symbol = reel.querySelector(".symbol");
    const ticks = 10 + Math.floor(Math.random() * 5);
    let count = 0;

    setTimeout(() => {
      reel.animate(
        [
          { transform: "translateY(0) rotate(0)" },
          { transform: "translateY(-6px) rotate(-2deg)" },
          { transform: "translateY(0) rotate(0)" }
        ],
        {
          duration: 100,
          iterations: ticks,
          easing: "ease-in-out"
        }
      );

      const timer = window.setInterval(() => {
        symbol.textContent = drawSymbol().icon;
        count += 1;

        if (count >= ticks) {
          window.clearInterval(timer);
          symbol.textContent = finalIcon;
          reel.animate(
            [
              { transform: "scale(0.95)" },
              { transform: "scale(1.05)" },
              { transform: "scale(1)" }
            ],
            { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
          );
          resolve();
        }
      }, 95);
    }, delayMs);
  });
}

function runRevealAnimation() {
  const panels = [...document.querySelectorAll(".reveal")];
  panels.forEach((panel, index) => {
    window.setTimeout(() => {
      panel.classList.add("is-visible");
    }, 80 * index);
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEFAULT_STATE);
    }

    const parsed = JSON.parse(raw);
    return {
      wallet: asFiniteNumber(parsed.wallet, DEFAULT_STATE.wallet),
      totalSpent: asFiniteNumber(parsed.totalSpent, DEFAULT_STATE.totalSpent),
      totalWon: asFiniteNumber(parsed.totalWon, DEFAULT_STATE.totalWon),
      spins: asFiniteNumber(parsed.spins, DEFAULT_STATE.spins),
      bestWallet: asFiniteNumber(parsed.bestWallet, DEFAULT_STATE.bestWallet)
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderStats() {
  walletEl.textContent = formatTokens(state.wallet);
  spentEl.textContent = formatTokens(state.totalSpent);
  wonEl.textContent = formatTokens(state.totalWon);
  netEl.textContent = formatTokens(state.totalWon - state.totalSpent);
  bestEl.textContent = formatTokens(state.bestWallet);

  const cost = Number(betEl.value);
  spinBtn.disabled = isSpinning || state.wallet < cost;
}

function setStatus(message, tone) {
  statusEl.textContent = message;
  statusEl.classList.remove("win", "lose");
  if (tone) {
    statusEl.classList.add(tone);
  }
}

function resetGame() {
  if (!window.confirm("Reset token history and start over?")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(DEFAULT_STATE);
  persistState();
  renderStats();
  setStatus("Wallet reset. Hope is back in beta.", "");
  speak("Reset complete. Delusions refreshed.");
  vibrate([30, 30, 30]);
}

async function shareScore() {
  const text = `I have ${formatTokens(state.wallet)} tokens after ${state.spins} spins in One-Arm AI Slot Machine. Net: ${formatTokens(
    state.totalWon - state.totalSpent
  )}.`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "One-Arm AI Slot Machine",
        text
      });
      setStatus("Score shared. Brag responsibly.", "win");
      return;
    } catch {
      // User cancelled share intent.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Score copied to clipboard.", "win");
      return;
    } catch {
      // Fall through.
    }
  }

  setStatus("Sharing unavailable in this browser.", "lose");
}

function toggleControls(disabled) {
  spinBtn.disabled = disabled;
  shareBtn.disabled = disabled;
  resetBtn.disabled = disabled;
  betEl.disabled = disabled;
}

function playTone(isWin) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const ctx = new AudioCtx();
  const sequence = isWin ? [440, 660, 880] : [220, 180];

  sequence.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isWin ? "triangle" : "sawtooth";
    osc.frequency.value = frequency;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + i * 0.12;
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

    osc.start(start);
    osc.stop(start + 0.11);
  });

  window.setTimeout(() => ctx.close(), 520);
}

function speak(message) {
  if (!voiceToggle.checked || !("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1.05;
  utterance.pitch = 0.92 + Math.random() * 0.25;
  utterance.volume = 0.82;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function asFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function formatTokens(value) {
  return `${formatNumber.format(value)} tk`;
}

function pick(collection) {
  return collection[Math.floor(Math.random() * collection.length)];
}
