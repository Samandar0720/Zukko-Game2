import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scoresFilePath = path.join(__dirname, 'scores.json');

let scores = {};
let activeGames = {};

try {
  if (fs.existsSync(scoresFilePath)) {
    const data = fs.readFileSync(scoresFilePath, 'utf8');
    scores = JSON.parse(data);
  }
} catch (err) {
  scores = {};
}

const saveScores = () => {
  try {
    fs.writeFileSync(scoresFilePath, JSON.stringify(scores, null, 2));
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
  }
};
