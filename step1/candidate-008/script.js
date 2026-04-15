const STORAGE_KEY = "token-burner-3000-state";

const SYMBOLS = [
  { key: "404", weight: 5, value: 10, label: "404: classic AI confidence with no payload." },
  { key: "GPU", weight: 4, value: 16, label: "GPU: the rectangle that eats your margins." },
  { key: "BOT", weight: 4, value: 14, label: "BOT: fake enthusiasm, real overhead." },
  { key: "VC", weight: 3, value: 20, label: "VC: congrats on being diluted by luck." },
  { key: "HYPE", weight: 2, value: 35, label: "HYPE: metrics without product, the dream." },
  { key: "MOON", weight: 1, value: 60, label: "MOON: irrational confidence multiplier engaged." }
];

const statusBank = {
  loss: [
    "The model consumed your tokens and returned a vibes-based answer.",
    "You funded another GPU cluster and received exactly zero wisdom.",
    "A chatbot said 'great question' and took your spin fee.",
    "Your prompt budget is gone, but your optimism remains suspiciously high."
  ],
  smallWin: [
    "Tiny payout detected. Enough tokens to continue the comedy.",
    "The machine hallucinated value and, frankly, who are we to argue?",
    "Micro-win. Please tell investors this counts as traction."
  ],
  bigWin: [
    "Three matching symbols. The hype cycle salutes your recklessness.",
    "Jackpot-adjacent behavior. Someone is drafting a thought-leadership thread.",
    "The tokens are flowing. Please pretend this is sustainable."
  ],
  broke: [
    "Wallet empty. The AI bubble asks that you pivot to enterprise.",
    "No tokens left. Time to raise another seed round from your cousins.",
    "Bankruptcy% speedrun complete. Hit reset to restore market confidence."
  ]
};

const reelNodes = Array.from({ length: 3 }, (_, index) => document.getElementById(`reel${index}`));
const tokenBalanceNode = document.getElementById("tokenBalance");
const spinCostNode = document.getElementById("spinCost");
const jackpotPoolNode = document.getElementById("jackpotPool");
const statusLineNode = document.getElementById("statusLine");
const spinButton = document.getElementById("spinButton");
const resetButton = document.getElementById("resetButton");
const totalSpinsNode = document.getElementById("totalSpins");
const biggestWinNode = document.getElementById("biggestWin");
const netTokensNode = document.getElementById("netTokens");
const hypeLevelNode = document.getElementById("hypeLevel");
const machineNode = document.querySelector(".machine");

const defaultState = {
  tokens: 120,
  spinCost: 15,
  jackpot: 300,
  totalSpins: 0,
  biggestWin: 0,
  netTokens: 0
};

let state = loadState();
let spinning = false;
let audioContext;

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function weightedSymbol() {
  const expanded = SYMBOLS.flatMap((symbol) => Array.from({ length: symbol.weight }, () => symbol));
  return expanded[Math.floor(Math.random() * expanded.length)];
}

function pickStatus(type) {
  const options = statusBank[type];
  return options[Math.floor(Math.random() * options.length)];
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function currentHypeLevel() {
  if (state.tokens <= 0) return "Bag Holder";
  if (state.netTokens >= 120) return "Series A Delusion";
  if (state.netTokens >= 40) return "Promptfluencer";
  if (state.netTokens >= 0) return "Cautiously Viral";
  return "Compute Casualty";
}

function updateUi() {
  tokenBalanceNode.textContent = formatNumber(state.tokens);
  spinCostNode.textContent = formatNumber(state.spinCost);
  jackpotPoolNode.textContent = formatNumber(state.jackpot);
  totalSpinsNode.textContent = formatNumber(state.totalSpins);
  biggestWinNode.textContent = formatNumber(state.biggestWin);
  netTokensNode.textContent = state.netTokens > 0 ? `+${formatNumber(state.netTokens)}` : formatNumber(state.netTokens);
  hypeLevelNode.textContent = currentHypeLevel();
  spinButton.disabled = spinning || state.tokens < state.spinCost;
}

function resetGame() {
  state = { ...defaultState };
  saveState();
  reelNodes.forEach((node, index) => {
    node.textContent = SYMBOLS[index].key;
  });
  statusLineNode.textContent = "Economic reset complete. The token bubble has been lovingly re-inflated.";
  updateUi();
}

function flashMachine() {
  machineNode.classList.remove("win-flash");
  void machineNode.offsetWidth;
  machineNode.classList.add("win-flash");
}

function getPayout(results) {
  const [a, b, c] = results;

  if (a.key === b.key && b.key === c.key) {
    const jackpotWin = a.value * 4 + Math.floor(state.jackpot * 0.35);
    return { amount: jackpotWin, kind: "bigWin" };
  }

  if (a.key === b.key || b.key === c.key || a.key === c.key) {
    const pairValue = Math.max(a.value, b.value, c.value) + 12;
    return { amount: pairValue, kind: "smallWin" };
  }

  if (results.some((symbol) => symbol.key === "MOON")) {
    return { amount: 8, kind: "smallWin" };
  }

  return { amount: 0, kind: "loss" };
}

function playTone(frequency, duration, type = "sine", volume = 0.03) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function celebrate(result) {
  if (result.kind === "bigWin") {
    flashMachine();
    playTone(523.25, 0.12, "triangle", 0.05);
    setTimeout(() => playTone(659.25, 0.12, "triangle", 0.05), 90);
    setTimeout(() => playTone(783.99, 0.18, "triangle", 0.05), 180);
    return;
  }

  if (result.kind === "smallWin") {
    playTone(440, 0.08, "sine", 0.04);
    setTimeout(() => playTone(554.37, 0.1, "sine", 0.04), 70);
  }
}

async function spin() {
  if (spinning || state.tokens < state.spinCost) {
    if (state.tokens < state.spinCost) {
      statusLineNode.textContent = pickStatus("broke");
    }
    return;
  }

  spinning = true;
  state.tokens -= state.spinCost;
  state.netTokens -= state.spinCost;
  state.totalSpins += 1;
  state.jackpot += Math.ceil(state.spinCost * 0.6);
  updateUi();
  statusLineNode.textContent = "Spinning up a fresh batch of synthetic luck...";

  const results = [];

  for (let index = 0; index < reelNodes.length; index += 1) {
    const node = reelNodes[index];
    node.classList.add("spinning");

    await new Promise((resolve) => {
      let ticks = 0;
      const interval = window.setInterval(() => {
        node.textContent = weightedSymbol().key;
        ticks += 1;
        if (ticks > 8 + index * 4) {
          window.clearInterval(interval);
          const finalSymbol = weightedSymbol();
          results[index] = finalSymbol;
          node.textContent = finalSymbol.key;
          node.classList.remove("spinning");
          playTone(260 + (index * 70), 0.05, "square", 0.03);
          resolve();
        }
      }, 75);
    });
  }

  const payout = getPayout(results);
  state.tokens += payout.amount;
  state.netTokens += payout.amount;
  state.biggestWin = Math.max(state.biggestWin, payout.amount);

  if (payout.kind === "bigWin") {
    state.jackpot = Math.max(180, Math.floor(state.jackpot * 0.55));
  }

  const symbolLore = results.map((symbol) => symbol.label).join(" ");
  const payoutText = payout.amount
    ? `${pickStatus(payout.kind)} You won ${payout.amount} tokens. ${symbolLore}`
    : `${pickStatus("loss")} ${symbolLore}`;

  statusLineNode.textContent = payoutText;
  celebrate(payout);
  saveState();
  spinning = false;
  updateUi();
}

spinButton.addEventListener("click", spin);
resetButton.addEventListener("click", resetGame);

updateUi();
