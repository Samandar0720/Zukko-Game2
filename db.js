import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scoresFilePath = path.join(__dirname, 'scores.json');
const settingsFilePath = path.join(__dirname, 'settings.json');
const inventoryFilePath = path.join(__dirname, 'inventory.json');

let scores = {};
let activeGames = {};
let inventory = {}; // { userId: { hint: N, skip: N, doublePoints: N } }

// O'yinlarning standart (default) sozlamalari.
// Admin /settings orqali bularni o'zgartira oladi.
const DEFAULT_SETTINGS = {
  // --- Yakka (solo) o'yinlar ---
  minesCount: 4,               // Mina Maydonidagi minalar soni (16 katakdan)
  minesRevealPoints: 3,        // Har bir xavfsiz katak uchun ball
  minesWinBonus: 15,           // Barcha kataklarni ochish uchun qo'shimcha bonus
  minesMinCashoutCells: 2,     // "Pulni saqlash" uchun kamida nechta xavfsiz katak ochilgan bo'lishi kerak
  quizQuestionCount: 5,        // Har bir viktorina sessiyasidagi savollar soni
  quizCorrectPoints: 6,        // To'g'ri javob uchun ball
  quizWrongPenalty: 2,         // Noto'g'ri javob uchun jarima
  flagPoints: 6,               // Bayroqni to'g'ri topish uchun ball
  flagWrongPenalty: 2,         // Bayroqni noto'g'ri topish uchun jarima
  anagramPoints: 10,           // Anagrammani to'g'ri topish uchun ball
  wordlePoints: 20,            // Wordle so'zini topish uchun ball
  mathPoints: 10,              // Tezkor matematika: to'g'ri javob uchun ball
  mathWrongPenalty: 3,         // Tezkor matematika: noto'g'ri javob jarimasi
  numberGuessMaxAttempts: 15,  // Son topish: shu urinishdan ko'p bo'lsa, ball berilmaydi
  speedClickMaxReactionMs: 800,// Chaqqonlik: shu millisekunddan sekin bo'lsa, ball berilmaydi

  // --- Guruh (party) o'yinlari ---
  aliasGuesserPoints: 10,      // Alias: so'zni topgan uchun
  aliasExplainerPoints: 5,     // Alias: tushuntirgan uchun
  superlativesWinnerPoints: 10,// Eng... ovoz berish: to'g'ri topgan uchun
  twoTruthsFoolPoints: 5,      // 2 chin 1 yolg'on: aldagan har bir kishi uchun
  crocodileGuesserPoints: 10,  // Timsah: so'zni topgan uchun
  crocodileActorPoints: 5,     // Timsah: tasvirlagan uchun

  // --- Duel (2 kishilik) o'yinlar ---
  ticTacToeWinnerPoints: 15,
  rpsDuelWinnerPoints: 10,
  diceBattleWinnerPoints: 15,
  dartsBattleWinnerPoints: 15,
  mathDuelWinnerPoints: 20,

  // --- Do'kon narxlari ---
  shopHintPrice: 30,
  shopSkipPrice: 15,
  shopDoublePointsPrice: 50
};

let settings = { ...DEFAULT_SETTINGS };

try {
  if (fs.existsSync(scoresFilePath)) {
    const data = fs.readFileSync(scoresFilePath, 'utf8');
    scores = JSON.parse(data);
  }
} catch (err) {
  scores = {};
}

try {
  if (fs.existsSync(settingsFilePath)) {
    const data = fs.readFileSync(settingsFilePath, 'utf8');
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  }
} catch (err) {
  settings = { ...DEFAULT_SETTINGS };
}

try {
  if (fs.existsSync(inventoryFilePath)) {
    const data = fs.readFileSync(inventoryFilePath, 'utf8');
    inventory = JSON.parse(data);
  }
} catch (err) {
  inventory = {};
}

const saveScores = () => {
  try {
    fs.writeFileSync(scoresFilePath, JSON.stringify(scores, null, 2));
  } catch (err) {
    // Ignore error if filesystem read-only on Render
  }
};

const saveSettings = () => {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (err) {
    // Ignore error if filesystem read-only on Render
  }
};

const saveInventory = () => {
  try {
    fs.writeFileSync(inventoryFilePath, JSON.stringify(inventory, null, 2));
  } catch (err) {
    // Ignore error if filesystem read-only on Render
  }
};

export const DB = {
  addPoints(user, points) {
    if (!user || !user.id) return;
    const userId = String(user.id);
    const displayName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    const username = user.username ? `@${user.username}` : displayName;

    if (!scores[userId]) {
      scores[userId] = {
        name: displayName,
        username: username,
        points: 0
      };
    }
    scores[userId].name = displayName;
    scores[userId].username = username;

    // Agar foydalanuvchida "2x Ball" kartasi faol bo'lsa va ball musbat bo'lsa, ikki barobar beriladi.
    let finalPoints = points;
    if (points > 0 && inventory[userId] && inventory[userId].doublePoints > 0) {
      finalPoints = points * 2;
      inventory[userId].doublePoints -= 1;
      saveInventory();
    }

    // Ball hech qachon manfiy bo'lmaydi (0 dan pastga tushmaydi)
    scores[userId].points = Math.max(0, scores[userId].points + finalPoints);

    saveScores();
    return { total: scores[userId].points, awarded: finalPoints };
  },

  getTopScores(limit = 10) {
    return Object.values(scores)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  },

  getUserScore(userId) {
    return scores[String(userId)] ? scores[String(userId)].points : 0;
  },

  // Ballni jarima sifatida ayirish (masalan, noto'g'ri javob uchun). 0 dan pastga tushmaydi.
  deductPoints(user, points) {
    if (!user || !user.id) return;
    const userId = String(user.id);
    if (!scores[userId]) return 0;
    scores[userId].points = Math.max(0, scores[userId].points - points);
    saveScores();
    return scores[userId].points;
  },

  // --- Do'kon / Inventar ---
  getInventory(userId) {
    return inventory[String(userId)] || { hint: 0, skip: 0, doublePoints: 0 };
  },

  addInventoryItem(userId, item, qty = 1) {
    const id = String(userId);
    if (!inventory[id]) inventory[id] = { hint: 0, skip: 0, doublePoints: 0 };
    inventory[id][item] = (inventory[id][item] || 0) + qty;
    saveInventory();
    return inventory[id][item];
  },

  useInventoryItem(userId, item) {
    const id = String(userId);
    if (!inventory[id] || !inventory[id][item] || inventory[id][item] <= 0) return false;
    inventory[id][item] -= 1;
    saveInventory();
    return true;
  },

  getGame(chatId) {
    return activeGames[String(chatId)];
  },

  setGame(chatId, gameData) {
    const existing = activeGames[String(chatId)];
    if (existing && existing.timer) {
      clearTimeout(existing.timer);
    }
    activeGames[String(chatId)] = gameData;
  },

  clearGame(chatId) {
    const existing = activeGames[String(chatId)];
    if (existing && existing.timer) {
      clearTimeout(existing.timer);
    }
    delete activeGames[String(chatId)];
  },

  // --- Sozlamalar (Settings) ---
  getSetting(key) {
    return settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
  },

  getAllSettings() {
    return { ...settings };
  },

  setSetting(key, value) {
    if (!(key in DEFAULT_SETTINGS)) return false;
    settings[key] = value;
    saveSettings();
    return true;
  },

  resetSettings() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
  }
};
