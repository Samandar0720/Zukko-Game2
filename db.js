import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scoresFilePath = path.join(__dirname, 'scores.json');
const settingsFilePath = path.join(__dirname, 'settings.json');

let scores = {};
let activeGames = {};

// O'yinlarning standart (default) sozlamalari.
// Admin /settings orqali bularni o'zgartira oladi.
const DEFAULT_SETTINGS = {
  minesCount: 3,          // Mina Maydonidagi minalar soni (16 katakdan)
  minesRevealPoints: 5,   // Har bir xavfsiz katak uchun ball
  minesWinBonus: 20,      // Barcha kataklarni ochish uchun qo'shimcha bonus
  quizQuestionCount: 5,   // Har bir viktorina sessiyasidagi savollar soni
  quizCorrectPoints: 10,  // To'g'ri javob uchun ball
  flagPoints: 10,         // Bayroqni to'g'ri topish uchun ball
  anagramPoints: 15       // Anagrammani to'g'ri topish uchun ball
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
    scores[userId].points += points;

    saveScores();
    return scores[userId].points;
  },

  getTopScores(limit = 10) {
    return Object.values(scores)
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  },

  getUserScore(userId) {
    return scores[String(userId)] ? scores[String(userId)].points : 0;
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
