const STORAGE_KEY = "token-trough-save-v1";
const STARTING_TOKENS = 180;
const SPIN_COST = 15;
const HISTORY_LIMIT = 6;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SYMBOLS = [
  {
    key: "token",
    label: "TOKEN",
    copy: "micropayment theater",
    weight: 1,
  },
  {
    key: "gpu",
    label: "GPU",
    copy: "someone else's cloud bill",
    weight: 1.1,
  },
  {
    key: "prompt",
    label: "PROMPT",
    copy: "word salad leverage",
    weight: 1.2,
  },
  {
    key: "hype",
    label: "HYPE",
    copy: "demo day confetti",
    weight: 1.2,
  },
  {
    key: "pivot",
    label: "PIVOT",
    copy: "the roadmap moved again",
    weight: 1.05,
  },
  {
    key: "slop",
    label: "SLOP",
    copy: "content mill couture",
    weight: 1.15,
  },
  {
    key: "vibe",
    label: "VIBE",
    copy: "no tests, pure confidence",
    weight: 1.15,
  },
  {
    key: "ghost",
    label: "GHOST",
    copy: "citation unavailable",
    weight: 1.1,
  },
];

const EL = {
  balance: document.querySelector("#token-balance"),
  spins: document.querySelector("#spin-count"),
  bestWin: document.querySelector("#best-win"),
  confidence: document.querySelector("#confidence-score"),
  spinCost: document.querySelector("#spin-cost"),
  status: document.querySelector("#status-line"),
  spinButton: document.querySelector("#spin-button"),
  resetButton: document.querySelector("#reset-button"),
  history: document.querySelector("#history-list"),
  reels: Array.from(document.querySelectorAll(".reel-card")),
};

const numberFormat = new Intl.NumberFormat("en-US");

let isSpinning = false;
let state = loadState();

EL.spinCost.textContent = `${SPIN_COST} tokens`;
render();

EL.spinButton.addEventListener("click", handleSpin);
EL.resetButton.addEventListener("click", resetGame);

function loadState() {
  const defaults = {
    balance: STARTING_TOKENS,
    spins: 0,
    bestWin: 0,
    lastTone: "",
    lastMessage:
      "Deposit complete. The machine is ready to monetize your optimism.",
    history: [],
    reels: [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    highlightedIndices: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);

    return {
      balance:
        typeof parsed.balance === "number" ? parsed.balance : defaults.balance,
      spins: typeof parsed.spins === "number" ? parsed.spins : defaults.spins,
      bestWin:
        typeof parsed.bestWin === "number" ? parsed.bestWin : defaults.bestWin,
      lastTone:
        typeof parsed.lastTone === "string" ? parsed.lastTone : defaults.lastTone,
      lastMessage:
        typeof parsed.lastMessage === "string"
          ? parsed.lastMessage
          : defaults.lastMessage,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      reels: hydrateReels(parsed.reels, defaults.reels),
      highlightedIndices: Array.isArray(parsed.highlightedIndices)
        ? parsed.highlightedIndices.filter((value) => Number.isInteger(value))
        : defaults.highlightedIndices,
    };
  } catch {
    return defaults;
  }
}

function hydrateReels(savedReels, fallback) {
  if (!Array.isArray(savedReels) || savedReels.length !== 3) {
    return fallback;
  }

  return savedReels.map((savedSymbol, index) => {
    const matched = SYMBOLS.find((symbol) => symbol.key === savedSymbol.key);
    return matched || fallback[index];
  });
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      balance: state.balance,
      spins: state.spins,
      bestWin: state.bestWin,
      lastTone: state.lastTone,
      lastMessage: state.lastMessage,
      history: state.history,
      reels: state.reels,
      highlightedIndices: state.highlightedIndices,
    }),
  );
}

function render() {
  EL.balance.textContent = numberFormat.format(state.balance);
  EL.spins.textContent = numberFormat.format(state.spins);
  EL.bestWin.textContent = numberFormat.format(state.bestWin);
  EL.confidence.textContent = `${getConfidenceScore()}%`;
  EL.status.textContent = state.lastMessage;
  applyStatusTone(state.lastTone);

  renderReels(state.reels, state.highlightedIndices);
  renderHistory();

  const isBroke = state.balance < SPIN_COST;
  EL.spinButton.disabled = isSpinning || isBroke;
  EL.spinButton.textContent = isSpinning
    ? "Spinning..."
    : isBroke
      ? "Out Of Tokens"
      : `Burn ${SPIN_COST} Tokens`;
}

function renderReels(reels, winIndices = []) {
  reels.forEach((symbol, index) => {
    const reel = EL.reels[index];
    reel.querySelector(".reel-name").textContent = symbol.label;
    reel.querySelector(".reel-copy").textContent = symbol.copy;
    reel.classList.toggle("win", winIndices.includes(index));
  });
}

function renderHistory() {
  if (!state.history.length) {
    EL.history.innerHTML =
      '<li class="history-item"><div class="history-main"><span class="history-symbols">NO SPINS YET</span><span class="history-delta negative">-0</span></div><div class="history-meta">The machine is waiting for a visionary to light tokens on fire.</div></li>';
    return;
  }

  EL.history.innerHTML = state.history
    .map((entry) => {
      const deltaClass = entry.net >= 0 ? "positive" : "negative";
      const sign = entry.net > 0 ? "+" : "";

      return `
        <li class="history-item">
          <div class="history-main">
            <span class="history-symbols">${entry.symbols.join(" / ")}</span>
            <span class="history-delta ${deltaClass}">${sign}${entry.net}</span>
          </div>
          <div class="history-meta">Spin ${entry.spin}: ${entry.message}</div>
        </li>
      `;
    })
    .join("");
}

function getConfidenceScore() {
  const score = Math.round(40 + state.balance / 4 + state.bestWin / 5 - state.spins * 1.5);
  return Math.max(3, Math.min(99, score));
}

async function handleSpin() {
  if (isSpinning || state.balance < SPIN_COST) {
    return;
  }

  isSpinning = true;
  state.balance -= SPIN_COST;
  state.spins += 1;
  state.highlightedIndices = [];
  setStatus("Routing tokens into the confidence furnace...", "loss");
  pulseBalance();
  saveState();
  render();

  const finalReels = await Promise.all(
    EL.reels.map((_, index) => spinSingleReel(index)),
  );

  const result = evaluateSpin(finalReels);
  state.reels = finalReels;
  state.balance += result.payout;
  state.bestWin = Math.max(state.bestWin, result.payout);
  state.lastTone = result.payout > 0 ? "win" : "loss";
  state.lastMessage = result.message;
  state.highlightedIndices = result.winIndices;

  state.history.unshift({
    spin: state.spins,
    symbols: finalReels.map((symbol) => symbol.label),
    net: result.payout - SPIN_COST,
    message: result.message,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);

  saveState();
  render();
  emphasizeOutcome(result);

  isSpinning = false;
  render();
}

function spinSingleReel(index) {
  return new Promise((resolve) => {
    const reel = EL.reels[index];
    const finalSymbol = pickSymbol();
    const duration = REDUCED_MOTION ? 80 : 850 + index * 260;
    const frameDelay = REDUCED_MOTION ? duration : 90;
    let elapsed = 0;

    reel.classList.add("spinning");

    const timer = window.setInterval(() => {
      const symbol = elapsed + frameDelay >= duration ? finalSymbol : pickSymbol();

      reel.querySelector(".reel-name").textContent = symbol.label;
      reel.querySelector(".reel-copy").textContent = symbol.copy;
      elapsed += frameDelay;

      if (elapsed >= duration) {
        window.clearInterval(timer);
        reel.classList.remove("spinning");
        resolve(finalSymbol);
      }
    }, frameDelay);
  });
}

function pickSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let target = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    target -= symbol.weight;

    if (target <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1];
}

function evaluateSpin(reels) {
  const keys = reels.map((symbol) => symbol.key);
  const labels = reels.map((symbol) => symbol.label);
  const counts = keys.reduce((map, key) => {
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topKey, topCount] = entries[0];

  if (topCount === 3 && topKey === "token") {
    return {
      payout: 160,
      message:
        "Three TOKEN reels. Incredible news: the machine returned your own money and called it disruption.",
      winIndices: [0, 1, 2],
    };
  }

  if (topCount === 3 && topKey === "gpu") {
    return {
      payout: 120,
      message:
        "Triple GPU. You outsourced the hard part to expensive hardware and investors applauded.",
      winIndices: [0, 1, 2],
    };
  }

  if (topCount === 3) {
    return {
      payout: 70,
      message: `Triple ${labels[0]}. A clean buzzword sweep. Nobody asked to see the unit economics.`,
      winIndices: [0, 1, 2],
    };
  }

  if (counts.token && counts.gpu && counts.prompt) {
    return {
      payout: 45,
      message:
        "TOKEN, GPU, PROMPT. You assembled the full AI starter pack and monetized the deck.",
      winIndices: [0, 1, 2],
    };
  }

  if (topCount === 2) {
    const matchingIndices = keys
      .map((key, index) => ({ key, index }))
      .filter((entry) => entry.key === topKey)
      .map((entry) => entry.index);

    return {
      payout: 24,
      message: `Pair of ${labels[matchingIndices[0]]}. Barely coherent, but still enough for a seed round.`,
      winIndices: matchingIndices,
    };
  }

  return {
    payout: 0,
    message:
      "Nothing lined up. The demo was all confidence, no product, and the tokens are gone.",
    winIndices: [],
  };
}

function setStatus(message, tone = "") {
  state.lastTone = tone;
  state.lastMessage = message;
  EL.status.textContent = message;
  applyStatusTone(tone);
}

function applyStatusTone(tone) {
  EL.status.classList.remove("is-win", "is-loss");

  if (tone === "win") {
    EL.status.classList.add("is-win");
  }

  if (tone === "loss") {
    EL.status.classList.add("is-loss");
  }
}

function emphasizeOutcome(result) {
  renderReels(state.reels, result.winIndices);

  if (result.payout > 0) {
    EL.status.animate(
      [
        { transform: "translateY(0)", opacity: 0.85 },
        { transform: "translateY(-2px)", opacity: 1 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      {
        duration: REDUCED_MOTION ? 1 : 420,
        easing: "ease-out",
      },
    );
  }

  if (result.payout >= 70 && navigator.vibrate) {
    navigator.vibrate([80, 40, 80]);
  }
}

function pulseBalance() {
  EL.balance.animate(
    [
      { transform: "scale(1)", color: "var(--text)" },
      { transform: "scale(0.96)", color: "var(--danger)" },
      { transform: "scale(1)", color: "var(--text)" },
    ],
    {
      duration: REDUCED_MOTION ? 1 : 300,
      easing: "ease-out",
    },
  );
}

function resetGame() {
  state = {
    balance: STARTING_TOKENS,
    spins: 0,
    bestWin: 0,
    lastTone: "",
    lastMessage:
      "Wallet reset. The machine has forgiven your previous AI strategy.",
    history: [],
    reels: [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    highlightedIndices: [],
  };

  saveState();
  render();
}
