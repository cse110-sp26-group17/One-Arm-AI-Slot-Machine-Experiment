const STORAGE_KEY = "tokenized-delusion-v1";
const STARTING_TOKENS = 120;
const STARTING_COST = 8;

const symbols = ["GPT", "LAG", "RNG", "BOT", "404", "GPU", "SPAM", "PROMPT"];
const paytable = {
  "GPT-GPT-GPT": 120,
  "GPU-GPU-GPU": 80,
  "PROMPT-PROMPT-PROMPT": 65,
  "404-404-404": 55,
  "BOT-BOT-BOT": 45,
};

const roastLines = {
  winBig: [
    "Jackpot. The model now claims this was always in your training data.",
    "Massive win. Somewhere an AI startup just rebranded as your fan club.",
    "Huge payout. The algorithm calls this an isolated incident.",
  ],
  win: [
    "Nice hit. You out-prompted the machine for once.",
    "Tokens acquired. The AI describes this as unauthorized optimism.",
    "Profit event detected. Expect a patch to remove this tomorrow.",
  ],
  lose: [
    "No payout. The model says this aligns with product vision.",
    "Loss registered. Have you tried spinning with more confidence?",
    "Nothing won. The AI generated a heartfelt apology template.",
  ],
  broke: [
    "Wallet empty. The AI recommends subscribing to Hope Pro.",
    "Out of tokens. The machine suggests blaming your prompt.",
  ],
  buy: [
    "Upgrade purchased. Capability unchanged, vibes upgraded.",
    "Transaction complete. You bought premium placebo intelligence.",
    "Purchase successful. Nothing improved except investor mood.",
  ],
  reset: [
    "Wallet reset. Regulatory capture avoided.",
    "Fresh bankroll loaded. The algorithm looks nervous.",
  ],
};

const storeItems = [
  {
    id: "hallucination-firewall",
    name: "Hallucination Firewall",
    price: 30,
    description: "Filters nonsense by labeling it strategic storytelling.",
  },
  {
    id: "ethics-skin",
    name: "Ethics Skin Pack",
    price: 45,
    description: "Adds virtue-themed UI without changing outcomes.",
  },
  {
    id: "latency-perfume",
    name: "Latency Perfume",
    price: 35,
    description: "Makes delays smell intentional and enterprise-ready.",
  },
  {
    id: "token-burner",
    name: "Token Burner XL",
    price: 55,
    description: "Converts your balance into a confidence narrative.",
  },
];

const state = {
  tokens: STARTING_TOKENS,
  spinCost: STARTING_COST,
  spent: 0,
  isSpinning: false,
  owned: new Set(),
};

const tokensEl = document.getElementById("tokens");
const spinCostEl = document.getElementById("spin-cost");
const spentEl = document.getElementById("spent");
const lastWinEl = document.getElementById("last-win");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin-btn");
const readBtn = document.getElementById("read-btn");
const resetBtn = document.getElementById("reset-btn");
const reels = [...document.querySelectorAll(".reel")];
const storeGrid = document.getElementById("store-grid");
const template = document.getElementById("item-template");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomPick = (arr) => arr[randomInt(arr.length)];

function randomInt(max) {
  if (!Number.isInteger(max) || max <= 0) return 0;
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint32Array(1);
    cryptoObj.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function setMessage(text) {
  messageEl.textContent = text;
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function speakMessage() {
  if (!("speechSynthesis" in window)) {
    setMessage("Speech API is not available in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(messageEl.textContent);
  utterance.rate = 1.03;
  utterance.pitch = 0.92;
  window.speechSynthesis.speak(utterance);
}

function saveState() {
  const rawState = {
    tokens: state.tokens,
    spinCost: state.spinCost,
    spent: state.spent,
    owned: [...state.owned],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rawState));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed.tokens)) state.tokens = Math.max(0, parsed.tokens);
    if (Number.isFinite(parsed.spinCost)) state.spinCost = Math.max(1, parsed.spinCost);
    if (Number.isFinite(parsed.spent)) state.spent = Math.max(0, parsed.spent);
    if (Array.isArray(parsed.owned)) state.owned = new Set(parsed.owned);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function updateDisplay(lastWin = 0) {
  tokensEl.textContent = String(state.tokens);
  spinCostEl.textContent = String(state.spinCost);
  spentEl.textContent = String(state.spent);
  lastWinEl.textContent = String(lastWin);
  spinBtn.disabled = state.isSpinning || state.tokens < state.spinCost;
  updateStoreButtons();
}

function getPayout(reelValues) {
  const combo = reelValues.join("-");
  if (paytable[combo]) return paytable[combo];

  const counts = reelValues.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {});
  const hasPair = Object.values(counts).some((count) => count >= 2);
  return hasPair ? 12 : 0;
}

function updateStoreButtons() {
  const buttons = storeGrid.querySelectorAll("button[data-id]");
  buttons.forEach((button) => {
    const id = button.dataset.id;
    const price = Number(button.dataset.price);
    const owned = state.owned.has(id);
    button.disabled = owned || state.tokens < price || state.isSpinning;
    button.textContent = owned ? "Owned" : "Buy";
  });
}

function buildStore() {
  storeItems.forEach((item) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".item-name").textContent = item.name;
    card.querySelector(".item-desc").textContent = item.description;
    card.querySelector(".item-price").textContent = `${item.price} tokens`;
    const button = card.querySelector(".buy-btn");
    button.dataset.id = item.id;
    button.dataset.price = String(item.price);
    button.addEventListener("click", () => buyItem(item));
    storeGrid.appendChild(card);
  });
}

function buyItem(item) {
  if (state.owned.has(item.id) || state.tokens < item.price || state.isSpinning) return;
  state.tokens -= item.price;
  state.spent += item.price;
  state.owned.add(item.id);
  setMessage(`${randomPick(roastLines.buy)} ${item.name} equipped for cosmetic confidence.`);
  vibrate([35, 40, 35]);
  saveState();
  updateDisplay(0);
}

function spinAnimationTick() {
  reels.forEach((reel) => {
    reel.textContent = randomPick(symbols);
  });
}

async function spin() {
  if (state.isSpinning) return;
  if (state.tokens < state.spinCost) {
    setMessage(randomPick(roastLines.broke));
    vibrate([100, 50, 100]);
    return;
  }

  state.isSpinning = true;
  state.tokens -= state.spinCost;
  reels.forEach((reel) => reel.classList.add("rolling"));
  updateDisplay(0);

  const start = performance.now();
  while (performance.now() - start < 1000) {
    spinAnimationTick();
    await wait(85);
  }

  const result = reels.map(() => randomPick(symbols));
  reels.forEach((reel, i) => {
    reel.textContent = result[i];
    reel.classList.remove("rolling");
  });

  const payout = getPayout(result);
  state.tokens += payout;
  const combo = result.join("-");

  if (payout >= 60) {
    setMessage(`${randomPick(roastLines.winBig)} Combo ${combo} paid ${payout}.`);
    vibrate([60, 60, 120]);
  } else if (payout > 0) {
    setMessage(`${randomPick(roastLines.win)} Combo ${combo} paid ${payout}.`);
    vibrate([50]);
  } else {
    setMessage(`${randomPick(roastLines.lose)} Combo ${combo}.`);
    vibrate([80]);
  }

  state.spinCost = Math.min(20, STARTING_COST + Math.floor(state.spent / 70));
  state.isSpinning = false;
  saveState();
  updateDisplay(payout);
}

function resetWallet() {
  if (state.isSpinning) return;
  state.tokens = STARTING_TOKENS;
  state.spinCost = STARTING_COST;
  state.spent = 0;
  state.owned.clear();
  saveState();
  updateDisplay(0);
  setMessage(randomPick(roastLines.reset));
  vibrate([30, 30, 30]);
}

spinBtn.addEventListener("click", spin);
readBtn.addEventListener("click", speakMessage);
resetBtn.addEventListener("click", resetWallet);

loadState();
buildStore();
updateDisplay(0);
