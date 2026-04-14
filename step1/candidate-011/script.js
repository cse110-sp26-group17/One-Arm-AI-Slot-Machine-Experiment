const STORAGE_KEY = "ai-slot-save-v1";

const reels = [
  document.getElementById("reel0"),
  document.getElementById("reel1"),
  document.getElementById("reel2")
];

const tokenBalanceEl = document.getElementById("tokenBalance");
const totalWonEl = document.getElementById("totalWon");
const totalSpentEl = document.getElementById("totalSpent");
const spinCountEl = document.getElementById("spinCount");
const resultMessageEl = document.getElementById("resultMessage");
const aiRoastEl = document.getElementById("aiRoast");
const betSelectEl = document.getElementById("betSelect");
const spinButtonEl = document.getElementById("spinButton");
const resetButtonEl = document.getElementById("resetButton");
const voiceButtonEl = document.getElementById("voiceButton");

const symbols = [
  { icon: "🧠", label: "Hallucination", multiplier: 6 },
  { icon: "📉", label: "Model Drift", multiplier: 5 },
  { icon: "🧾", label: "Prompt Tax", multiplier: 4 },
  { icon: "🔥", label: "GPU Burn", multiplier: 8 },
  { icon: "🪙", label: "Token Leak", multiplier: 10 },
  { icon: "🏆", label: "Actual Good Output", multiplier: 20 }
];

const roastLines = [
  "AI says: 'I can totally explain this confidence score later.'",
  "AI says: 'These numbers are not random, they are emergent.'",
  "AI says: 'I was trained on vibes and PDFs.'",
  "AI says: 'That wrong answer was a premium feature.'",
  "AI says: 'I call it hallucination-plus.'"
];

const loseLines = [
  "No match. Your tokens were reclassified as 'inference costs'.",
  "Loss recorded. The model used your bet to buy more uncertainty.",
  "No payout. The AI insists this was still a successful run.",
  "Missed. Your wallet has entered low-latency mode."
];

const partialWinLines = [
  "Two-of-a-kind. The AI accidentally helped.",
  "Pity payout unlocked. Someone prompted responsibly.",
  "Two matches. This counts as progress in AI terms."
];

let state = {
  tokens: 1000,
  totalWon: 0,
  totalSpent: 0,
  spinCount: 0,
  voiceEnabled: false
};

let spinning = false;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed.tokens === "number") {
      state = {
        tokens: parsed.tokens,
        totalWon: parsed.totalWon || 0,
        totalSpent: parsed.totalSpent || 0,
        spinCount: parsed.spinCount || 0,
        voiceEnabled: Boolean(parsed.voiceEnabled)
      };
    }
  } catch (_error) {
    // Fall back to defaults if parsing fails.
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function randomSymbolIndex() {
  return Math.floor(Math.random() * symbols.length);
}

function render() {
  tokenBalanceEl.textContent = state.tokens.toLocaleString();
  totalWonEl.textContent = state.totalWon.toLocaleString();
  totalSpentEl.textContent = state.totalSpent.toLocaleString();
  spinCountEl.textContent = state.spinCount.toLocaleString();

  const bet = Number(betSelectEl.value);
  spinButtonEl.disabled = spinning || state.tokens < bet;
  voiceButtonEl.textContent = state.voiceEnabled ? "Disable AI Trash Talk" : "Enable AI Trash Talk";

  document.title = `Tokens: ${state.tokens} | AI Slot Machine`;
}

function setMessage(text, isWin = null) {
  resultMessageEl.textContent = text;
  resultMessageEl.classList.remove("win", "loss");

  if (isWin === true) {
    resultMessageEl.classList.add("win");
  } else if (isWin === false) {
    resultMessageEl.classList.add("loss");
  }
}

function setRoast(text) {
  aiRoastEl.textContent = text;

  if (state.voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace("AI says:", ""));
    utterance.rate = 1.05;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function rumble(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function animateReel(reelEl, stopIndex, delayMs) {
  return new Promise((resolve) => {
    const reelWindow = reelEl.closest(".reel-window");
    let ticks = 0;
    const minTicks = 14;

    setTimeout(() => {
      reelWindow.classList.add("spinning");

      const timer = setInterval(() => {
        const idx = randomSymbolIndex();
        reelEl.textContent = `${symbols[idx].icon} ${symbols[idx].label}`;
        ticks += 1;

        if (ticks > minTicks + Math.floor(Math.random() * 8)) {
          clearInterval(timer);
          reelEl.textContent = `${symbols[stopIndex].icon} ${symbols[stopIndex].label}`;
          reelWindow.classList.remove("spinning");
          resolve();
        }
      }, 75);
    }, delayMs);
  });
}

function evaluate(resultIndexes, bet) {
  const [a, b, c] = resultIndexes;
  const counts = new Map();

  for (const idx of resultIndexes) {
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }

  const topEntry = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  const [topSymbolIndex, topCount] = topEntry;

  if (a === b && b === c) {
    const payout = bet * symbols[a].multiplier;
    state.tokens += payout;
    state.totalWon += payout;

    setMessage(`JACKPOT: ${symbols[a].label} x3. You won ${payout} tokens.`, true);
    setRoast("AI says: 'I meant to do that. Please cite this as benchmarking.'");
    rumble([90, 40, 130]);
    return;
  }

  if (topCount === 2) {
    const payout = bet * 2;
    state.tokens += payout;
    state.totalWon += payout;

    const line = partialWinLines[Math.floor(Math.random() * partialWinLines.length)];
    setMessage(`${line} Payout: ${payout} tokens.`, true);
    setRoast(roastLines[Math.floor(Math.random() * roastLines.length)]);
    rumble(45);
    return;
  }

  const losingLine = loseLines[Math.floor(Math.random() * loseLines.length)];
  setMessage(`${losingLine} (${symbols[topSymbolIndex].label} almost saved you.)`, false);
  setRoast(roastLines[Math.floor(Math.random() * roastLines.length)]);
  rumble(22);
}

async function spin() {
  if (spinning) {
    return;
  }

  const bet = Number(betSelectEl.value);
  if (state.tokens < bet) {
    setMessage(`Insufficient tokens for a ${bet}-token spin. Reset or lower your bet.`, false);
    return;
  }

  spinning = true;
  state.tokens -= bet;
  state.totalSpent += bet;
  state.spinCount += 1;

  setMessage("Spinning the model weights...", null);
  render();

  const resultIndexes = [randomSymbolIndex(), randomSymbolIndex(), randomSymbolIndex()];

  await Promise.all([
    animateReel(reels[0], resultIndexes[0], 0),
    animateReel(reels[1], resultIndexes[1], 180),
    animateReel(reels[2], resultIndexes[2], 360)
  ]);

  evaluate(resultIndexes, bet);

  if (state.tokens <= 0) {
    setMessage("Token balance is zero. The AI has consumed your entire runway.", false);
    setRoast("AI says: 'We can fix this by raising another round.'");
  }

  spinning = false;
  saveState();
  render();
}

function resetGame() {
  state = {
    tokens: 1000,
    totalWon: 0,
    totalSpent: 0,
    spinCount: 0,
    voiceEnabled: false
  };

  reels.forEach((reelEl) => {
    reelEl.textContent = "🤖 Booting";
  });

  setMessage("Simulation reset. Fresh 1000-token grant deployed.", null);
  setRoast("AI says: 'This time I definitely won't hallucinate.'");

  saveState();
  render();
}

function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  saveState();
  render();

  if (state.voiceEnabled) {
    setRoast("AI says: 'Voice enabled. Prepare for spoken confidence with no guarantees.'");
  } else if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function init() {
  loadState();

  reels.forEach((reelEl) => {
    const idx = randomSymbolIndex();
    reelEl.textContent = `${symbols[idx].icon} ${symbols[idx].label}`;
  });

  setMessage("Boot sequence complete. Your startup grant is loaded.", null);
  setRoast("AI says: 'I am 99.99% sure this is not gambling.'");

  spinButtonEl.addEventListener("click", spin);
  resetButtonEl.addEventListener("click", resetGame);
  voiceButtonEl.addEventListener("click", toggleVoice);
  betSelectEl.addEventListener("change", render);

  render();
}

init();
