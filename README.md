# 🎮 Zukko Telegram Bot (6-in-1 Interaktiv O'yinlar)

Ushbu bot Telegram guruhlari va do'stlar jamoasi uchun mo'ljallangan 6 ta qiziqarli va interaktiv o'yinni o'z ichiga oladi:

## 🌟 Mavjud O'yinlar:
1. 🏆 **Eng ko'p ovoz (Superlatives)** — Guruh a'zolari o'rtasida anonim ovoz berish (masalan: *"Kim eng ko'p uxlaydi?"*).
2. 🤥 **Ikki chin, bitta yolg'on (2 Truths 1 Lie)** — Shaxsiy faktlar yuboriladi va guruh qaysi biri yolg'onligini topadi.
3. 🎭 **Taxmin qil (Alias / Charades)** — Berilgan so'zni yoki filmni ta'riflash, guruh topishi kerak.
4. 🧠 **Bilag'on jangi (Viktorina/Quiz)** — Kategoriyalar bo'yicha savol-javoblar va ballar yig'ish.
5. 🎣 **Soxta javob (Fibbage uslubida)** — Har kim soxta javob yozadi, bot haqiqiy javob bilan aralashtiradi va kim kimni chalg'itganiga qarab ochko beriladi.
6. 📖 **Hikoya zanjiri (Story Chain)** — Navbat bilan gap qo'shib kulgili umumiy hikoya yozish.

---

## 🛠 Ishga tushirish (Local rejimda)

1. Loyihani yuklab oling va papkaga kiring:
   ```bash
   cd zukko
   ```

2. Kerakli paketlarni o'rnating:
   ```bash
   npm install
   ```

3. `.env` faylini yarating va **BOT_TOKEN** ni kiriting:
   ```env
   BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   PORT=3000
   ```

4. Botni ishga tushiring:
   ```bash
   npm start
   ```

---

## 🚀 GitHub va Render.com ga Joylashtirish (Deploy qilish)

### 1-Qadam: GitHub repository yaratish va kodlarni yuklash

Terminalda loyiha papkasida ushbu buyruqlarni bajaring:

```bash
# Git rejimini boshlash
git init

# Barcha fayllarni tayyorlash
git add .

# Birinchi commit
git commit -m "Initial commit - Telegram 6-in-1 Game Bot"

# GitHub reponizga ulash (USERNAME va REPO_NAME o'rniga o'zingiznikini yozing)
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Kodlarni push qilish
git push -u origin main
```

---

### 2-Qadam: Render.com saytida tekinga (Free) ishga tushirish

1. [https://render.com](https://render.com) saytiga kiring va ro'yxatdan o'ting (GitHub orqali kirish qulay).
2. Dashboard'da **"New +"** tugmasini bosing va **"Web Service"** ni tanlang.
3. GitHub akkountingizni ulang va yangi yaratgan **`REPO_NAME`** reponizni tanlang (**Connect**).
4. Sozlamalarni quyidagicha to'ldiring:
   - **Name**: `zukko-gamebot` (xohlagan ismingiz)
   - **Region**: Frankfurt yoki eng yaqin joy
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Pastroqda **"Environment Variables"** bo'limiga o'ting va qo'shing:
   - **Key**: `BOT_TOKEN`
   - **Value**: Telegram BotFather'dan olingan tokeningiz
6. **"Create Web Service"** tugmasini bosing!

🎉 **Tugadi!** Render avtomatik ravishda loyihani yig'adi va botingiz 24/7 rejimda Telegram'da ishlaydi.

---

## 📜 Buyruqlar Ro'yxati (Telegram Bot uchun)

Guruhda ishlatiladigan asosiy buyruqlar:
- `/start` — Botni ishga tushirish
- `/help` — O'yinlar qo'llanmasi
- `/game` — Interaktiv o'yin menyusi
- `/superlatives` — Eng ko'p ovoz o'yini
- `/truthlie` — 2 chin 1 yolg'on o'yini
- `/alias` — Taxmin qil o'yini
- `/quiz` — Viktorina o'yini
- `/fibbage` — Soxta javob o'yini
- `/story` — Hikoya zanjiri o'yini
- `/top` — Guruh peshqadamlari reytingi
