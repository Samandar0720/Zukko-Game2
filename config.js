import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  port: process.env.PORT || 3000,
  webhookUrl: process.env.WEBHOOK_URL || ''
};
