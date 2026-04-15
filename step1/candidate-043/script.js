const STORAGE_KEY = "ai-slot-machine-state-v1";
const MAX_FEED_ITEMS = 8;
const numberFormatter = new Intl.NumberFormat();

const SYMBOLS = [
  { icon: "🤖", name: "Autopilot Bot", weight: 24, triple: 38 },
  { icon: "🧠", name: "Overfit Brain", weight: 20, triple: 42 },
  { icon: "🪙", name: "Raw Token", weight: 17, triple: 56 },
  { icon: "📉", name: "Valuation Crash", weight: 14, triple: 32 },
  { icon: "🐛", name: "Regression Bug", weight: 14, triple: 45 },
  { icon: "🛰️", name: "Cloud Bill", weight: 11, triple: 50 }
];

const UPGRADES = {
  compression: {
    name: "Prompt Compression",
    cost: 30,
    effect: "Spin cost dropped by 2."
  },
  firewall: {
    name: "Hallucination Firewall",
    cost: 55,
    effect: "Misses now refund 4 tokens."
  },
  context: {
    name: "Context Window XL",
    cost: 80,
    effect: "All payouts increased by 25%."
  },
  cfo: {
    name: "CFO Mode",
    cost: 110,
    effect: "Any payout has a 12% chance to double."
  }
};

const dom = {
  tokenBalance: document.getElementById("tokenBalance"),
  spinCost: document.getElementById("spinCost"),
  totalWon: document.getElementById("totalWon"),
  netFlow: document.getElementById("netFlow"),
  spinCount: document.getElementById("spinCount"),
  spinButton: document.getElementById("spinButton"),
  resetButton: document.getElementById("resetButton"),
  statusMessage: document.getElementById("statusMessage"),
  eventFeed: document.getElementById("eventFeed"),
  reels: [
    document.getElementById("reel0"),
    document.getElementById("reel1"),
    document.getElementById("reel2")
  ],
  machine: document.querySelector(".machine"),
  upgradeButtons: Array.from(document.querySelectorAll(".upgrade-card"))
};

let state = loadState();
let isSpinning = false;
let audioContext;

init();

function init() {
  dom.spinButton.addEventListener("click", spin);
  dom.resetButton.addEventListener("click", resetGame);
  dom.upgradeButtons.forEach((button) => {
    button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      spin();
    }
  });

  setInitialReels();
  updateUI();
  addFeed("Machine booted. Hype levels at unsafe altitude.");
  setStatus("Press spin and hope the model converges.", "neutral");
}

function getDefaultState() {
  return {
    tokens: 120,
    totalWon: 0,
    totalSpent: 0,
    spins: 0,
    upgrades: {
      compression: false,
      firewall: false,
      context: false,
      cfo: false
    }
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return getDefaultState();
    }
    return normalizeState(JSON.parse(saved));
  } catch {
    return getDefaultState();
  }
}

function normalizeState(raw) {
  const defaults = getDefaultState();
  const upgrades = raw && typeof raw === "object" ? raw.upgrades : null;

  return {
    tokens: sanitizeNumber(raw && raw.tokens, defaults.tokens),
    totalWon: sanitizeNumber(raw && raw.totalWon, defaults.totalWon),
    totalSpent: sanitizeNumber(raw && raw.totalSpent, defaults.totalSpent),
    spins: sanitizeNumber(raw && raw.spins, defaults.spins),
    upgrades: {
      compression: Boolean(upgrades && upgrades.compression),
      firewall: Boolean(upgrades && upgrades.firewall),
      context: Boolean(upgrades && upgrades.context),
      cfo: Boolean(upgrades && upgrades.cfo)
    }
  };
}

function sanitizeNumber(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.round(value));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSpinCost() {
  const discount = state.upgrades.compression ? 2 : 0;
  return Math.max(3, 8 - discount);
}

function getPayoutMultiplier() {
  return state.upgrades.context ? 1.25 : 1;
}

function setInitialReels() {
  dom.reels.forEach((reel) => renderReelSymbol(reel, drawWeightedSymbol()));
}

function drawWeightedSymbol() {
  const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1];
}

function renderReelSymbol(reel, symbol) {
  reel.textContent = symbol.icon;
  reel.setAttribute("aria-label", symbol.name);
  reel.dataset.symbol = symbol.icon;
}

async function spin() {
  if (isSpinning) {
    return;
  }

  const cost = getSpinCost();
  if (state.tokens < cost) {
    setStatus("Not enough tokens. This is what happens after too many AI pilots.", "loss");
    return;
  }

  warmUpAudio();
  isSpinning = true;

  try {
    state.tokens -= cost;
    state.totalSpent += cost;
    state.spins += 1;
    saveState();
    updateUI();
    addFeed(`-${cost} tokens to spin. GPUs spinning at dramatic RPM.`, -cost);
    setStatus("Sampling outcomes from the probability void...", "neutral");

    const results = [];
    for (let index = 0; index < dom.reels.length; index += 1) {
      const finalSymbol = drawWeightedSymbol();
      await animateReel(dom.reels[index], finalSymbol, 680 + index * 230);
      results.push(finalSymbol);
    }

    const outcome = evaluateOutcome(results);
    let payout = outcome.payout;

    if (state.upgrades.cfo && payout > 0 && Math.random() < 0.12) {
      payout *= 2;
      outcome.message += " CFO mode reclassified the payout as strategic synergy and doubled it.";
      outcome.shortLabel += " Payout doubled.";
    }

    if (payout > 0) {
      state.tokens += payout;
      state.totalWon += payout;
      addFeed(`+${payout} tokens: ${outcome.shortLabel}`, payout);
      playWinJingle(outcome.tone === "jackpot");
      if (outcome.tone === "jackpot") {
        celebrate();
      }
    } else {
      playLoseTone();
      addFeed(outcome.shortLabel);
    }

    setStatus(outcome.message, outcome.tone);
    saveState();
  } finally {
    isSpinning = false;
    updateUI();
  }
}

function evaluateOutcome(results) {
  const multiplier = getPayoutMultiplier();
  const counts = new Map();

  results.forEach((symbol) => {
    counts.set(symbol.icon, (counts.get(symbol.icon) || 0) + 1);
  });

  const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const [topIcon, topCount] = sortedCounts[0];
  const topSymbol = SYMBOLS.find((symbol) => symbol.icon === topIcon);
  const icons = results.map((symbol) => symbol.icon);

  if (topCount === 3 && topSymbol) {
    const payout = Math.round(topSymbol.triple * multiplier);
    return {
      payout,
      tone: "jackpot",
      shortLabel: `Triple ${topSymbol.icon} (${topSymbol.name}).`,
      message: `JACKPOT: triple ${topSymbol.name}. Your AI startup briefly achieved product-market fit.`
    };
  }

  if (topCount === 2) {
    const pairSymbol = SYMBOLS.find((symbol) => symbol.icon === topIcon);
    const base = pairSymbol ? pairSymbol.triple * 0.45 + 12 : 20;
    const payout = Math.round(base * multiplier);
    return {
      payout,
      tone: "win",
      shortLabel: `Pair of ${pairSymbol ? pairSymbol.name : "symbols"}.`,
      message: `Nice pair. The model is only slightly overfitting and you still got paid.`
    };
  }

  if (icons.includes("🤖") && icons.includes("🧠") && icons.includes("📉")) {
    const payout = Math.round(48 * multiplier);
    return {
      payout,
      tone: "jackpot",
      shortLabel: "Bot + Brain + Crash combo.",
      message: "Catastrophic breakthrough combo. The valuation crashed upward and paid you anyway."
    };
  }

  if (state.upgrades.firewall) {
    return {
      payout: 4,
      tone: "refund",
      shortLabel: "Firewall refund: +4 tokens.",
      message: "No match, but Hallucination Firewall issued a 4-token refund."
    };
  }

  if (Math.random() < 0.2) {
    return {
      payout: 0,
      tone: "loss",
      shortLabel: "Hallucinated win detected.",
      message: "The model is 98% confident you won. The ledger is 100% confident you did not."
    };
  }

  return {
    payout: 0,
    tone: "loss",
    shortLabel: "No match this spin.",
    message: "No match. Prompt suggestion was 'be luckier' and it did nothing."
  };
}

function animateReel(reel, finalSymbol, durationMs) {
  return new Promise((resolve) => {
    reel.classList.add("spinning");

    const intervalId = window.setInterval(() => {
      renderReelSymbol(reel, drawWeightedSymbol());
    }, 90);

    window.setTimeout(() => {
      window.clearInterval(intervalId);
      reel.classList.remove("spinning");
      renderReelSymbol(reel, finalSymbol);
      resolve();
    }, durationMs);
  });
}

function buyUpgrade(key) {
  const upgrade = UPGRADES[key];
  if (!upgrade || state.upgrades[key] || isSpinning) {
    return;
  }

  if (state.tokens < upgrade.cost) {
    const shortfall = upgrade.cost - state.tokens;
    setStatus(`Need ${shortfall} more tokens for ${upgrade.name}.`, "loss");
    return;
  }

  state.tokens -= upgrade.cost;
  state.totalSpent += upgrade.cost;
  state.upgrades[key] = true;
  saveState();
  updateUI();

  addFeed(`-${upgrade.cost} tokens: bought ${upgrade.name}.`, -upgrade.cost);
  setStatus(`${upgrade.name} installed. ${upgrade.effect}`, "win");
  playWinJingle(false);
}

function updateUI() {
  const spinCost = getSpinCost();
  const net = state.totalWon - state.totalSpent;

  dom.tokenBalance.textContent = formatNumber(state.tokens);
  dom.spinCost.textContent = `${spinCost} tokens`;
  dom.totalWon.textContent = formatNumber(state.totalWon);
  dom.netFlow.textContent = `${net >= 0 ? "+" : ""}${formatNumber(net)}`;
  dom.netFlow.dataset.polarity = net >= 0 ? "up" : "down";
  dom.spinCount.textContent = formatNumber(state.spins);

  dom.spinButton.textContent = `Spin (-${spinCost} tokens)`;
  dom.spinButton.disabled = isSpinning || state.tokens < spinCost;
  dom.resetButton.disabled = isSpinning;

  dom.upgradeButtons.forEach((button) => {
    const key = button.dataset.upgrade;
    const upgrade = UPGRADES[key];
    const priceElement = button.querySelector(".upgrade-price");
    const owned = state.upgrades[key];

    if (!upgrade || !priceElement) {
      return;
    }

    button.classList.toggle("owned", owned);

    if (owned) {
      button.disabled = true;
      priceElement.textContent = "Owned";
      return;
    }

    button.disabled = isSpinning || state.tokens < upgrade.cost;
    priceElement.textContent = `Buy for ${upgrade.cost} tokens`;
  });
}

function setStatus(text, tone) {
  dom.statusMessage.textContent = text;
  dom.statusMessage.dataset.tone = tone;
}

function addFeed(message, delta = 0) {
  const item = document.createElement("li");
  if (delta > 0) {
    item.classList.add("gain");
  } else if (delta < 0) {
    item.classList.add("spend");
  }

  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;

  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  item.append(messageSpan, time);
  dom.eventFeed.prepend(item);

  while (dom.eventFeed.children.length > MAX_FEED_ITEMS) {
    dom.eventFeed.removeChild(dom.eventFeed.lastElementChild);
  }
}

function formatNumber(value) {
  return numberFormatter.format(Math.round(value));
}

function resetGame() {
  if (isSpinning) {
    return;
  }

  const confirmed = window.confirm("Reset tokens, upgrades, and stats for a new run?");
  if (!confirmed) {
    return;
  }

  state = getDefaultState();
  saveState();
  dom.eventFeed.innerHTML = "";
  setInitialReels();
  updateUI();
  addFeed("New run started. Runway restored. Confidence restored.");
  setStatus("Everything reset. Time to lose money in a disciplined way.", "neutral");
}

function warmUpAudio() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return;
  }

  if (!audioContext) {
    audioContext = new Context();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {
      /* no-op */
    });
  }
}

function playWinJingle(jackpot) {
  if (!audioContext) {
    return;
  }

  const notes = jackpot ? [520, 660, 880, 1040] : [430, 540, 660];
  notes.forEach((frequency, index) => {
    playTone(frequency, 0.11, index * 0.08, "triangle");
  });
}

function playLoseTone() {
  if (!audioContext) {
    return;
  }
  playTone(180, 0.12, 0, "sawtooth");
}

function playTone(frequency, duration, offset, type) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + offset);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime + offset);
  gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + offset + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + offset + duration
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + offset);
  oscillator.stop(audioContext.currentTime + offset + duration + 0.01);
}

function celebrate() {
  if (navigator.vibrate) {
    navigator.vibrate([60, 30, 80]);
  }

  const machineRect = dom.machine.getBoundingClientRect();
  const centerX = machineRect.width / 2;
  const centerY = machineRect.height / 2;

  for (let index = 0; index < 22; index += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${centerX}px`;
    spark.style.top = `${centerY}px`;
    dom.machine.appendChild(spark);

    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 180;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    const animation = spark.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.1)`,
          opacity: 0
        }
      ],
      {
        duration: 620 + Math.random() * 240,
        easing: "cubic-bezier(.22,.61,.36,1)"
      }
    );

    animation.onfinish = () => spark.remove();
  }
}
