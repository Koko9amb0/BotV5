import telebot
from telebot import types

TOKEN = "твой_токен"
bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def start(message):
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="🛍 Открыть магазин",
        web_app=types.WebAppInfo(url="https://botv5-glix.onrender.com")
    ))
    bot.send_message(message.chat.id, "Добро пожаловать!", reply_markup=markup)

bot.polling(non_stop=True)