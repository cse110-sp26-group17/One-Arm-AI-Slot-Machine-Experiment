const STORAGE_KEY = "token-tugbandit-state-v1";
const STARTING_BALANCE = 120;
const SPIN_COST = 7;
const BAILOUT_AMOUNT = 35;
const MAX_RUNWAY_BALANCE = 180;
const tokenFormatter = new Intl.NumberFormat("en-US");

const SYMBOLS = [
  {
    id: "gpu",
    icon: "\u{1F5A5}\uFE0F",
    name: "GPU",
    triplePayout: 45,
    pairPayout: 11,
    description: "Triple GPU. Congratulations, you have converted electricity into vibes."
  },
  {
    id: "prompt",
    icon: "\u{1FA84}",
    name: "Prompt",
    triplePayout: 34,
    pairPayout: 9,
    description: "Triple Prompt. The machine believes wording is now a profession."
  },
  {
    id: "token",
    icon: "\u{1FA99}",
    name: "Token",
    triplePayout: 58,
    pairPayout: 14,
    description: "Triple Token. Pure numerical nourishment for the quarterly report."
  },
  {
    id: "hallucination",
    icon: "\u{1F99C}",
    name: "Hallucination",
    triplePayout: 19,
    pairPayout: 6,
    description: "Triple Hallucination. Wrong, loud, and somehow still premium priced."
  },
  {
    id: "safety",
    icon: "\u{1F9BA}",
    name: "Safety",
    triplePayout: 24,
    pairPayout: 7,
    description: "Triple Safety. Legal feels calmer, which counts as a win."
  },
  {
    id: "vc",
    icon: "\u{1F4B8}",
    name: "VC Cash",
    triplePayout: 40,
    pairPayout: 10,
    description: "Triple VC Cash. The burn rate is invisible if the slide deck is glossy."
  }
];

const state = loadState();

const elements = {
  balanceDisplay: document.getElementById("balanceDisplay"),
  bestBalanceDisplay: document.getElementById("bestBalanceDisplay"),
  spinCostDisplay: document.getElementById("spinCostDisplay"),
  bailoutsDisplay: document.getElementById("bailoutsDisplay"),
  spinsDisplay: document.getElementById("spinsDisplay"),
  runwayFill: document.getElementById("runwayFill"),
  runwayLabel: document.getElementById("runwayLabel"),
  messageDisplay: document.getElementById("messageDisplay"),
  lastPayoutDisplay: document.getElementById("lastPayoutDisplay"),
  spinButton: document.getElementById("spinButton"),
  bailoutButton: document.getElementById("bailoutButton"),
  resetButton: document.getElementById("resetButton"),
  payoutGrid: document.getElementById("payoutGrid"),
  reels: Array.from({ length: 3 }, (_, index) => ({
    card: document.getElementById(`reel${index}`),
    icon: document.getElementById(`reelIcon${index}`),
    name: document.getElementById(`reelName${index}`)
  })),
  machineCard: document.querySelector(".machine-card")
};

let spinning = false;
let audioContext;

buildPayoutGrid();
elements.spinCostDisplay.textContent = `${SPIN_COST} tokens`;
setInitialReels();
render();

elements.spinButton.addEventListener("click", handleSpin);
elements.bailoutButton.addEventListener("click", handleBailout);
elements.resetButton.addEventListener("click", resetGame);

function loadState() {
  const fallback = {
    balance: STARTING_BALANCE,
    bestBalance: STARTING_BALANCE,
    bailouts: 0,
    spins: 0,
    lastPayout: 0
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const saved = JSON.parse(raw);
    const balance = Number.isFinite(saved.balance) ? saved.balance : fallback.balance;
    const bestBalance = Number.isFinite(saved.bestBalance) ? saved.bestBalance : fallback.bestBalance;
    return {
      balance,
      bestBalance: Math.max(balance, bestBalance),
      bailouts: Number.isFinite(saved.bailouts) ? saved.bailouts : fallback.bailouts,
      spins: Number.isFinite(saved.spins) ? saved.spins : fallback.spins,
      lastPayout: Number.isFinite(saved.lastPayout) ? saved.lastPayout : fallback.lastPayout
    };
  } catch (error) {
    console.warn("Could not restore game state.", error);
    return fallback;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not persist game state.", error);
  }
}

function buildPayoutGrid() {
  elements.payoutGrid.innerHTML = SYMBOLS.map(
    (symbol) => `
      <article class="payout-card">
        <div class="payout-card__icon">${symbol.icon}</div>
        <h3>${symbol.name}</h3>
        <p>${symbol.description}</p>
        <p><strong>3x:</strong> ${formatTokens(symbol.triplePayout)} | <strong>2x:</strong> ${formatTokens(symbol.pairPayout)}</p>
      </article>
    `
  ).join("");
}

function setInitialReels() {
  const defaults = [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]];
  defaults.forEach((symbol, index) => showSymbol(index, symbol));
}

function render() {
  elements.balanceDisplay.textContent = formatTokens(state.balance);
  elements.bestBalanceDisplay.textContent = formatTokens(state.bestBalance);
  elements.bailoutsDisplay.textContent = String(state.bailouts);
  elements.spinsDisplay.textContent = `${state.spins} spins`;
  elements.lastPayoutDisplay.textContent = `Last payout: ${formatTokens(state.lastPayout)}`;

  const runwayPercent = Math.max(0, Math.min(100, (state.balance / MAX_RUNWAY_BALANCE) * 100));
  elements.runwayFill.style.width = `${runwayPercent}%`;
  elements.runwayFill.style.filter = runwayPercent < 18 ? "saturate(1.4) brightness(0.88)" : "none";

  if (state.balance >= 80) {
    elements.runwayLabel.textContent = "Runway stable";
  } else if (state.balance >= SPIN_COST * 2) {
    elements.runwayLabel.textContent = "Runway getting theatrical";
  } else if (state.balance > 0) {
    elements.runwayLabel.textContent = "Runway mostly hope";
  } else {
    elements.runwayLabel.textContent = "Runway deleted by finance";
  }

  elements.spinButton.disabled = spinning || state.balance < SPIN_COST;
  elements.bailoutButton.disabled = spinning || state.balance > SPIN_COST * 2;
}

async function handleSpin() {
  if (spinning || state.balance < SPIN_COST) {
    if (state.balance < SPIN_COST) {
      updateMessage("Not enough tokens. Please contact an investor, a cloud credit program, or your future self.");
    }
    return;
  }

  spinning = true;
  state.balance -= SPIN_COST;
  state.spins += 1;
  state.lastPayout = 0;
  updateMessage("Inference in progress. The machine is converting tokens directly into suspense.");
  highlightWinningReels([]);
  render();
  saveState();

  warmAudio();
  pulseMachine();

  elements.machineCard.classList.add("is-spinning");
  const results = await animateSpin();
  elements.machineCard.classList.remove("is-spinning");

  const outcome = evaluateResults(results);
  state.balance += outcome.payout;
  state.lastPayout = outcome.payout;
  state.bestBalance = Math.max(state.bestBalance, state.balance);
  updateMessage(outcome.message);
  highlightWinningReels(outcome.highlightIndexes);
  playOutcomeTone(outcome.tone);
  vibrate(outcome.tone === "win" ? [70, 30, 90] : [45]);

  if (state.balance <= 0) {
    updateMessage(`${outcome.message} Wallet empty. Time to beg for another seed round.`);
  }

  spinning = false;
  render();
  saveState();
}

function handleBailout() {
  if (spinning || state.balance > SPIN_COST * 2) {
    return;
  }

  warmAudio();
  state.balance += BAILOUT_AMOUNT;
  state.bailouts += 1;
  state.bestBalance = Math.max(state.bestBalance, state.balance);
  updateMessage(`A cheerful VC has supplied ${formatTokens(BAILOUT_AMOUNT)} fresh tokens and absolutely no governance.`);
  playOutcomeTone("bailout");
  vibrate([20, 20, 20, 20, 40]);
  render();
  saveState();
}

function resetGame() {
  state.balance = STARTING_BALANCE;
  state.bestBalance = Math.max(state.bestBalance, STARTING_BALANCE);
  state.bailouts = 0;
  state.spins = 0;
  state.lastPayout = 0;
  setInitialReels();
  updateMessage("Timeline reset. The tokens are back and nobody has learned anything.");
  highlightWinningReels([]);
  render();
  saveState();
}

function animateSpin() {
  const finalSymbols = Array.from({ length: 3 }, pickSymbol);

  return new Promise((resolve) => {
    const stopTimes = [850, 1250, 1650];
    const revealed = [false, false, false];
    const startTime = performance.now();

    const tick = (now) => {
      elements.reels.forEach((reel, index) => {
        if (revealed[index]) {
          return;
        }

        if (now - startTime >= stopTimes[index]) {
          showSymbol(index, finalSymbols[index]);
          revealed[index] = true;
          if (typeof reel.card.animate === "function") {
            reel.card.animate(
              [
                { transform: "translateY(-8px) scale(1.02)" },
                { transform: "translateY(0) scale(1)" }
              ],
              { duration: 240, easing: "cubic-bezier(.2,.9,.2,1)" }
            );
          }
          return;
        }

        showSymbol(index, pickSymbol());
      });

      if (revealed.every(Boolean)) {
        resolve(finalSymbols);
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function evaluateResults(results) {
  const ids = results.map((symbol) => symbol.id);
  const counts = ids.reduce((map, id) => {
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});

  const matchingEntry = Object.entries(counts).find(([, count]) => count === 3 || count === 2);
  const isSpecialCombo = ["gpu", "prompt", "token"].every((id) => ids.includes(id));

  if (matchingEntry && matchingEntry[1] === 3) {
    const matched = SYMBOLS.find((symbol) => symbol.id === matchingEntry[0]);
    return {
      payout: matched.triplePayout,
      message: `${matched.icon} ${matched.name} jackpot. The deck looked confident, so the market has awarded ${formatTokens(matched.triplePayout)} tokens.`,
      highlightIndexes: [0, 1, 2],
      tone: "win"
    };
  }

  if (isSpecialCombo) {
    return {
      payout: 28,
      message: "GPU + Prompt + Token. That is enough buzzword alignment for a 28 token synergy bonus.",
      highlightIndexes: [0, 1, 2],
      tone: "win"
    };
  }

  if (matchingEntry && matchingEntry[1] === 2) {
    const matched = SYMBOLS.find((symbol) => symbol.id === matchingEntry[0]);
    const highlightIndexes = ids
      .map((id, index) => (id === matched.id ? index : -1))
      .filter((index) => index >= 0);

    return {
      payout: matched.pairPayout,
      message: `Two ${matched.name} symbols. Not a breakout, but definitely enough for a ${formatTokens(matched.pairPayout)} token vanity metric.`,
      highlightIndexes,
      tone: "win"
    };
  }

  return {
    payout: 0,
    message: "No alignment. The tokens are gone and the machine has generated a very sincere blog post about lessons learned.",
    highlightIndexes: [],
    tone: "loss"
  };
}

function pickSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function showSymbol(index, symbol) {
  const reel = elements.reels[index];
  reel.icon.textContent = symbol.icon;
  reel.name.textContent = symbol.name;
  reel.card.dataset.symbol = symbol.id;
}

function highlightWinningReels(indexes) {
  elements.reels.forEach((reel, index) => {
    reel.card.classList.toggle("is-winning", indexes.includes(index));
  });
}

function updateMessage(message) {
  elements.messageDisplay.textContent = message;
}

function pulseMachine() {
  if (typeof document.documentElement.animate === "function") {
    document.documentElement.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.004)" },
        { transform: "scale(1)" }
      ],
      { duration: 300, easing: "ease-out" }
    );
  }
}

function warmAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  audioContext = new AudioContextClass();
}

function playOutcomeTone(kind) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const frequencies =
    kind === "win"
      ? [440, 554.37, 659.25]
      : kind === "bailout"
        ? [392, 523.25, 659.25]
        : [220, 196];

  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === "loss" ? "triangle" : "square";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01 + index * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15 + index * 0.04);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + index * 0.05);
    oscillator.stop(now + 0.22 + index * 0.05);
  });
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function formatTokens(value) {
  return `${tokenFormatter.format(value)} tokens`;
}
