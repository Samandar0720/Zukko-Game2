import { DB } from './db.js';
import { questionsData } from './data.js';

const SHOP_ITEMS = {
  hint: {
    label: 'Yordam (Hint)',
    emoji: '💡',
    price: 30,
    desc: "Faol o'yin bo'yicha maslahat beradi (/hint bilan ishlatiladi)."
  },
  skip: {
    label: "O'tkazib yuborish (Skip)",
    emoji: '⏭',
    price: 15,
    desc: "Qiyin savolni jarimasiz tashlab, o'yinni qayta boshlash imkonini beradi (/skip bilan ishlatiladi)."
  },
  doublePoints: {
    label: '2x Ball kartasi',
    emoji: '⚡',
    price: 50,
    desc: "Keyingi g'alabangizda olingan ballni ikki baravar qiladi (avtomatik ishlaydi)."
  }
};

function buildShopMenu(userId) {
  const balance = DB.getUserScore(userId);
  const rows = Object.entries(SHOP_ITEMS).map(([key, item]) => ([{
    text: `${item.emoji} ${item.label} — ${item.price} ball`,
    callback_data: `shop_buy_${key}`
  }]));
  return { balance, keyboard: { inline_keyboard: rows } };
}

function buildShopText(userId) {
  const balance = DB.getUserScore(userId);
  let text = `🛒 **Do'kon**\n\n💰 Balansingiz: **${balance} ball**\n\n`;
  Object.values(SHOP_ITEMS).forEach(item => {
    text += `${item.emoji} **${item.label}** — ${item.price} ball\n_${item.desc}_\n\n`;
  });
  text += "Sotib olish uchun quyidagi tugmalardan birini bosing:";
  return text;
}

export function registerShop(bot) {
  bot.command(['shop', 'magazin', "do'kon"], async (ctx) => {
    const { keyboard } = buildShopMenu(ctx.from.id);
    await ctx.reply(buildShopText(ctx.from.id), { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.command(['inventory', 'sumka', 'inventar'], async (ctx) => {
    const inv = DB.getInventory(ctx.from.id);
    await ctx.reply(
      `🎒 **Sizning sumkangiz:**\n\n` +
      `💡 Yordam: ${inv.hint || 0} ta\n` +
      `⏭ Skip: ${inv.skip || 0} ta\n` +
      `⚡ 2x Ball kartasi: ${inv.doublePoints || 0} ta`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action(/^shop_buy_(.+)$/, async (ctx) => {
    const key = ctx.match[1];
    const item = SHOP_ITEMS[key];
    if (!item) return ctx.answerCbQuery('⚠️ Mahsulot topilmadi.');

    const balance = DB.getUserScore(ctx.from.id);
    if (balance < item.price) {
      return ctx.answerCbQuery(`❌ Ballingiz yetarli emas! (${balance}/${item.price})`, { show_alert: true });
    }

    DB.deductPoints(ctx.from, item.price);
    DB.addInventoryItem(ctx.from.id, key, 1);
    await ctx.answerCbQuery(`✅ Xarid qilindi: ${item.emoji} ${item.label}!`);

    const { keyboard } = buildShopMenu(ctx.from.id);
    await ctx.editMessageText(buildShopText(ctx.from.id), { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // /hint — faol o'yin bo'yicha maslahat berish
  bot.command(['hint', 'yordam'], async (ctx) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game) return ctx.reply('⚠️ Hozir faol o\'yin yo\'q.');

    const has = DB.useInventoryItem(ctx.from.id, 'hint');
    if (!has) return ctx.reply("❌ Sizda 💡 Yordam yo'q. /shop orqali sotib oling.");

    switch (game.gameType) {
      case 'quiz': {
        const q = game.questions[game.currentIndex];
        const wrongIdx = q.options.findIndex((_, idx) => idx !== q.answer);
        return ctx.reply(`💡 **Maslahat:** "${q.options[wrongIdx]}" — bu noto'g'ri javob, uni yo'q deb hisoblang.`, { parse_mode: 'Markdown' });
      }
      case 'anagram': {
        const firstLetter = game.targetWord[0];
        return ctx.reply(`💡 **Maslahat:** Yashirin so'z **"${firstLetter}"** harfi bilan boshlanadi va ${game.targetWord.length} ta harfdan iborat.`, { parse_mode: 'Markdown' });
      }
      case 'minesweeper': {
        for (let r = 0; r < game.grid.length; r++) {
          for (let c = 0; c < game.grid[r].length; c++) {
            const cell = game.grid[r][c];
            if (!cell.isMine && !cell.revealed) {
              return ctx.reply(`💡 **Maslahat:** ${r + 1}-qator, ${c + 1}-ustundagi katak xavfsiz!`, { parse_mode: 'Markdown' });
            }
          }
        }
        return ctx.reply('💡 Barcha xavfsiz kataklar allaqachon ochilgan.');
      }
      default:
        DB.addInventoryItem(ctx.from.id, 'hint', 1); // ishlatilmagani uchun qaytarib beramiz
        return ctx.reply("⚠️ Bu o'yin turi uchun hozircha yordam mavjud emas.");
    }
  });

  // /skip — faol o'yinni jarimasiz bekor qilish
  bot.command(['skip', "otkazib"], async (ctx) => {
    const chatId = ctx.chat.id;
    const game = DB.getGame(chatId);
    if (!game) return ctx.reply("⚠️ Hozir faol o'yin yo'q.");

    const has = DB.useInventoryItem(ctx.from.id, 'skip');
    if (!has) return ctx.reply("❌ Sizda ⏭ Skip yo'q. /shop orqali sotib oling.");

    DB.clearGame(chatId);
    return ctx.reply("⏭ O'yin jarimasiz to'xtatildi. Yangi o'yin boshlashingiz mumkin.");
  });
}
