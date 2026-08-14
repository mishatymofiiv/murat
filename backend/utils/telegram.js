// Надсилає повідомлення в Telegram про нове замовлення.
// Якщо TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не налаштовані — просто пропускає відправку,
// щоб відсутність Telegram-бота не ламала оформлення замовлень на сайті.

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === 'your_telegram_bot_token') {
    console.warn('⚠️  Telegram не налаштовано (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) — сповіщення про замовлення не надіслано.');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Telegram API повернув помилку:', data.description);
    }
  } catch (err) {
    console.error('❌ Не вдалось надіслати повідомлення в Telegram:', err.message);
  }
}

function formatOrderMessage(order, items) {
  const deliveryLine = order.delivery_method === 'novaposhta'
    ? `🏤 Нова пошта: <b>${order.np_city_name || '—'}</b>, відділення <b>${order.np_warehouse_name || '—'}</b>`
    : `📮 Укрпошта: індекс <b>${order.ukrposhta_index || '—'}</b>, адреса: ${order.ukrposhta_address || '—'}`;

  const paymentLabel = order.payment_method === 'online' ? 'Повна оплата онлайн' : 'Передоплата';

  const itemsLines = items.map((i) => `• ${i.product_name} × ${i.quantity} = ${(i.price * i.quantity).toFixed(0)} ₴`).join('\n');

  return [
    `🛒 <b>Нове замовлення #${order.id}</b>`,
    ``,
    `👤 ${order.customer_name}`,
    `📞 ${order.phone}`,
    order.city ? `🏙 Місто: ${order.city}` : '',
    deliveryLine,
    `💳 Оплата: ${paymentLabel}`,
    order.comment ? `💬 Коментар: ${order.comment}` : '',
    ``,
    `<b>Товари:</b>`,
    itemsLines,
    ``,
    `<b>Разом: ${parseFloat(order.total).toFixed(0)} ₴</b>`,
  ].filter(Boolean).join('\n');
}

module.exports = { sendTelegramMessage, formatOrderMessage };
