import { DB } from './db.js';

// Faqat shu Telegram ID admin sifatida sozlamalarni o'zgartira oladi.
const ADMIN_ID = 1621559223;

// Sozlamalar kategoriyalarga bo'lingan — har biri alohida menyu bo'lib ochiladi.
const CATEGORIES = {
  solo: {
    title: "🎮 Yakka o'yinlar",
    settings: {
      quizQuestionCount: { label: 'Viktorina savollar soni', emoji: '🧠', options: [4, 5, 6, 8, 10] },
      quizCorrectPoints: { label: "To'g'ri javob bali (viktorina)", emoji: '✅', options: [3, 5, 6, 10, 15] },
      quizWrongPenalty: { label: "Noto'g'ri javob jarimasi (viktorina)", emoji: '❌', options: [0, 2, 3, 5] },
      flagPoints: { label: 'Bayroq o\'yini bali', emoji: '🏳️', options: [3, 5, 6, 10, 15] },
      flagWrongPenalty: { label: "Noto'g'ri javob jarimasi (bayroq)", emoji: '❌', options: [0, 2, 3, 5] },
      anagramPoints: { label: 'Anagramma bali', emoji: '🧩', options: [5, 8, 10, 15, 20] },
      wordlePoints: { label: 'Wordle bali', emoji: '🔤', options: [10, 15, 20, 25] },
      mathPoints: { label: 'Tezkor matematika bali', emoji: '🧮', options: [5, 8, 10, 15] },
      mathWrongPenalty: { label: "Matematika noto'g'ri javob jarimasi", emoji: '❌', options: [0, 2, 3, 5] },
      minesCount: { label: 'Minalar soni', emoji: '💣', options: [1, 2, 3, 4, 5, 6] },
      minesRevealPoints: { label: 'Mina: xavfsiz katak bali', emoji: '💎', options: [1, 2, 3, 5, 10] },
      minesWinBonus: { label: "Mina: g'alaba bonusi", emoji: '🏆', options: [10, 15, 20, 30, 50] },
      minesMinCashoutCells: { label: 'Mina: min. saqlash chegarasi', emoji: '🎯', options: [0, 1, 2, 3, 5] },
      numberGuessMaxAttempts: { label: 'Son topish: max urinish (ball uchun)', emoji: '🎯', options: [5, 10, 15, 20, 30] },
      speedClickMaxReactionMs: { label: 'Chaqqonlik: max reaksiya vaqti (ms)', emoji: '🎯', options: [400, 600, 800, 1000, 1500] }
    }
  },
  group: {
    title: '🤝 Guruh o\'yinlari',
    settings: {
      aliasGuesserPoints: { label: 'Alias: topgan uchun', emoji: '🗣️', options: [5, 10, 15, 20] },
      aliasExplainerPoints: { label: 'Alias: tushuntirgan uchun', emoji: '🗣️', options: [3, 5, 8, 10] },
      superlativesWinnerPoints: { label: "Eng... o'yini bali", emoji: '🏅', options: [5, 10, 15, 20] },
      twoTruthsFoolPoints: { label: "2 chin 1 yolg'on: aldash bali", emoji: '🤥', options: [3, 5, 8, 10] },
      crocodileGuesserPoints: { label: 'Timsah: topgan uchun', emoji: '🐊', options: [5, 10, 15, 20] },
      crocodileActorPoints: { label: 'Timsah: tasvirlagan uchun', emoji: '🐊', options: [3, 5, 8, 10] }
    }
  },
  duel: {
    title: '⚔️ Duel o\'yinlari',
    settings: {
      ticTacToeWinnerPoints: { label: 'Krestik-nolik g\'olibi', emoji: '❌⭕', options: [5, 10, 15, 20] },
      rpsDuelWinnerPoints: { label: 'Tosh-qaychi-qog\'oz g\'olibi', emoji: '✂️', options: [5, 10, 15, 20] },
      diceBattleWinnerPoints: { label: 'Zar duel g\'olibi', emoji: '🎲', options: [5, 10, 15, 20] },
      dartsBattleWinnerPoints: { label: 'Nishon duel g\'olibi', emoji: '🎯', options: [5, 10, 15, 20] },
      mathDuelWinnerPoints: { label: 'Matematika duel g\'olibi', emoji: '🧠', options: [10, 15, 20, 25, 30] }
    }
  },
  shop: {
    title: "🛒 Do'kon narxlari",
    settings: {
      shopHintPrice: { label: 'Yordam (Hint) narxi', emoji: '💡', options: [10, 20, 30, 50] },
      shopSkipPrice: { label: 'Skip narxi', emoji: '⏭', options: [5, 10, 15, 25] },
      shopDoublePointsPrice: { label: '2x Ball kartasi narxi', emoji: '⚡', options: [25, 50, 75, 100] }
    }
  }
};

function isAdmin(ctx) {
  return ctx.from && ctx.from.id === ADMIN_ID;
}

function findSettingMeta(key) {
  for (const cat of Object.values(CATEGORIES)) {
    if (cat.settings[key]) return cat.settings[key];
  }
  return null;
}

function buildMainMenu() {
  const rows = Object.entries(CATEGORIES).map(([catKey, cat]) => ([{
    text: cat.title,
    callback_data: `adm_cat_${catKey}`
  }]));
  rows.push([{ text: '🔄 Standart holatga qaytarish (hammasi)', callback_data: 'adm_reset' }]);
  return { inline_keyboard: rows };
}

function buildCategoryMenu(catKey) {
  const cat = CATEGORIES[catKey];
  const current = DB.getAllSettings();
  const rows = Object.entries(cat.settings).map(([key, meta]) => ([{
    text: `${meta.emoji} ${meta.label}: ${current[key]}`,
    callback_data: `adm_open_${key}`
  }]));
  rows.push([{ text: '⬅️ Bosh menyu', callback_data: 'adm_main' }]);
  return { inline_keyboard: rows };
}

function findCategoryOf(key) {
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    if (cat.settings[key]) return catKey;
  }
  return null;
}

function buildOptionsMenu(key) {
  const meta = findSettingMeta(key);
  const current = DB.getSetting(key);
  const rows = [];
  let row = [];
  meta.options.forEach((val) => {
    const mark = val === current ? '✅ ' : '';
    row.push({ text: `${mark}${val}`, callback_data: `adm_set_${key}_${val}` });
    if (row.length === 3) {
      rows.push(row);
      row = [];
    }
  });
  if (row.length) rows.push(row);
  const catKey = findCategoryOf(key);
  rows.push([{ text: '⬅️ Orqaga', callback_data: `adm_cat_${catKey}` }]);
  return { inline_keyboard: rows };
}

export function registerAdminPanel(bot) {
  bot.command(['settings', 'sozlamalar', 'admin'], async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Bu buyruq faqat bot administratori uchun.');
    }
    await ctx.reply(
      '⚙️ **Bot sozlamalari (Admin panel)**\n\nKategoriyani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  bot.action('adm_main', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '⚙️ **Bot sozlamalari (Admin panel)**\n\nKategoriyani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  bot.action(/^adm_cat_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    const catKey = ctx.match[1];
    const cat = CATEGORIES[catKey];
    if (!cat) return ctx.answerCbQuery('⚠️ Topilmadi.');

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${cat.title}\n\nO'zgartirmoqchi bo'lgan sozlamani tanlang:`,
      { parse_mode: 'Markdown', reply_markup: buildCategoryMenu(catKey) }
    );
  });

  bot.action(/^adm_open_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    const key = ctx.match[1];
    const meta = findSettingMeta(key);
    if (!meta) return ctx.answerCbQuery('⚠️ Topilmadi.');

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${meta.emoji} **${meta.label}**\n\nYangi qiymatni tanlang:`,
      { parse_mode: 'Markdown', reply_markup: buildOptionsMenu(key) }
    );
  });

  bot.action(/^adm_set_(.+)_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    const key = ctx.match[1];
    const value = parseInt(ctx.match[2], 10);
    const meta = findSettingMeta(key);
    if (!meta) return ctx.answerCbQuery('⚠️ Topilmadi.');

    DB.setSetting(key, value);
    await ctx.answerCbQuery(`✅ Saqlandi: ${value}`);

    const catKey = findCategoryOf(key);
    await ctx.editMessageText(
      `${CATEGORIES[catKey].title}\n\nO'zgartirmoqchi bo'lgan sozlamani tanlang:`,
      { parse_mode: 'Markdown', reply_markup: buildCategoryMenu(catKey) }
    );
  });

  bot.action('adm_reset', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Ruxsat yo\'q.', { show_alert: true });
    DB.resetSettings();
    await ctx.answerCbQuery('🔄 Barcha sozlamalar standart holatga qaytarildi!');
    await ctx.editMessageText(
      '⚙️ **Bot sozlamalari (Admin panel)**\n\nKategoriyani tanlang:',
      { parse_mode: 'Markdown', reply_markup: buildMainMenu() }
    );
  });

  // Admin foydalanuvchiga ball berish/ayirish huquqi.
  // Foydalanish: xabarga javob berib "/ball 50" YOKI "/ball <telegram_id> 50"
  // Manfiy son yuborsa (masalan -20), balldan ayiradi.
  bot.command(['ball', 'givepoints'], async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Bu buyruq faqat bot administratori uchun.');
    }

    const args = ctx.message.text.split(/\s+/).slice(1);
    let targetUser = null;
    let amount = null;

    if (ctx.message.reply_to_message && args.length >= 1) {
      targetUser = ctx.message.reply_to_message.from;
      amount = parseInt(args[0], 10);
    } else if (args.length >= 2) {
      const targetId = parseInt(args[0], 10);
      amount = parseInt(args[1], 10);
      targetUser = { id: targetId, first_name: `User ${targetId}` };
    }

    if (!targetUser || isNaN(amount)) {
      return ctx.reply(
        "⚠️ Foydalanish:\n" +
        "• Xabarga javob berib: `/ball 50`\n" +
        "• ID orqali: `/ball 123456789 50`\n\n" +
        "Ballni ayirish uchun manfiy son yuboring: `/ball 50 -20`",
        { parse_mode: 'Markdown' }
      );
    }

    const result = DB.addPoints(targetUser, amount);
    const name = targetUser.first_name || targetUser.id;
    const sign = amount >= 0 ? '+' : '';
    await ctx.reply(`✅ **${name}** ga ${sign}${amount} ball berildi.\n💰 Yangi balans: ${result ? result.total : DB.getUserScore(targetUser.id)}`, { parse_mode: 'Markdown' });
  });
}
