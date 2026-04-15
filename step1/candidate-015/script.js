const reels = [
  document.getElementById("reel-0"),
  document.getElementById("reel-1"),
  document.getElementById("reel-2"),
];

const balanceEl = document.getElementById("balance");
const spinCostEl = document.getElementById("spin-cost");
const payoutEl = document.getElementById("last-payout");
const messageEl = document.getElementById("message");
const spinBtn = document.getElementById("spin-btn");
const refillBtn = document.getElementById("refill-btn");
const machineEl = document.querySelector(".machine");

const SYMBOLS = ["🤖", "🧠", "🛰️", "💸", "🔥", "📉"];
const AI_SET = new Set(["🤖", "🧠", "🛰️"]);

const spinCost = 8;
let balance = 120;
let spinning = false;

spinCostEl.textContent = String(spinCost);

function weightedSymbol() {
  const roll = Math.random();
  if (roll < 0.2) return "🤖";
  if (roll < 0.38) return "🧠";
  if (roll < 0.53) return "🛰️";
  if (roll < 0.72) return "💸";
  if (roll < 0.86) return "🔥";
  return "📉";
}

function updateHUD(lastPayout = 0) {
  balanceEl.textContent = String(balance);
  payoutEl.textContent = String(lastPayout);
  spinBtn.textContent = `Spend ${spinCost} Tokens`;

  const broke = balance < spinCost;
  machineEl.classList.toggle("broke", broke);
  spinBtn.disabled = spinning || broke;
}

function summarize(result, payout) {
  const [a, b, c] = result;
  const allSame = a === b && b === c;
  const aiTrio = result.every((s) => AI_SET.has(s));
  const exactlyOneCash = result.filter((s) => s === "💸").length === 1;

  if (allSame) {
    return `Model alignment achieved. It echoed ${a}${a}${a} and paid ${payout} tokens.`;
  }

  if (aiTrio) {
    return `Three AI symbols. The machine claims this is "emergent value". +${payout} tokens.`;
  }

  const counts = new Map();
  result.forEach((symbol) => counts.set(symbol, (counts.get(symbol) || 0) + 1));
  const hasPair = [...counts.values()].some((count) => count === 2);

  if (hasPair) {
    return `Two symbols matched. Barely coherent output, but you still got ${payout} tokens.`;
  }

  if (exactlyOneCash && payout > 0) {
    return `One lonely 💸 showed up. The system threw pity credits: +${payout}.`;
  }

  return `The model burned context and returned vibes. You lost ${spinCost} tokens.`;
}

function calcPayout(result) {
  const [a, b, c] = result;
  if (a === b && b === c) return 50;

  if (result.every((s) => AI_SET.has(s))) return 30;

  const counts = new Map();
  result.forEach((symbol) => counts.set(symbol, (counts.get(symbol) || 0) + 1));
  const hasPair = [...counts.values()].some((count) => count === 2);
  if (hasPair) return 16;

  const cashCount = result.filter((s) => s === "💸").length;
  if (cashCount === 1) return 4;

  return 0;
}

function showRandomDuringSpin() {
  reels.forEach((reel) => {
    const index = Math.floor(Math.random() * SYMBOLS.length);
    reel.textContent = SYMBOLS[index];
  });
}

function spin() {
  if (spinning || balance < spinCost) return;

  spinning = true;
  balance -= spinCost;
  updateHUD(0);
  messageEl.textContent = "Inference in progress... monetization is loading.";

  reels.forEach((reel) => reel.classList.add("spin"));

  const scramble = setInterval(showRandomDuringSpin, 90);

  setTimeout(() => {
    clearInterval(scramble);

    const result = reels.map(() => weightedSymbol());
    result.forEach((symbol, idx) => {
      reels[idx].textContent = symbol;
      reels[idx].classList.remove("spin", "win");
    });

    const payout = calcPayout(result);
    balance += payout;

    if (payout > 0) {
      reels.forEach((reel) => reel.classList.add("win"));
      setTimeout(() => reels.forEach((reel) => reel.classList.remove("win")), 700);
    }

    messageEl.textContent = summarize(result, payout);
    spinning = false;
    updateHUD(payout);

    if (balance < spinCost) {
      messageEl.textContent += " You are out of tokens. Time to pitch investors.";
    }
  }, 1100);
}

function refill() {
  balance += 60;
  messageEl.textContent = "A VC heard \"AI\" and wired 60 fresh tokens.";
  updateHUD(0);
}

spinBtn.addEventListener("click", spin);
refillBtn.addEventListener("click", refill);

updateHUD();
