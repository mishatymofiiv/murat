// Проста перевірка адмін-доступу через токен у заголовку Authorization.
// Пізніше можна замінити на повноцінний логін (таблиця admins вже є в схемі БД).

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: 'ADMIN_TOKEN не налаштовано на сервері' });
  }

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Немає доступу. Потрібен коректний admin-токен.' });
  }

  next();
}

module.exports = adminAuth;
