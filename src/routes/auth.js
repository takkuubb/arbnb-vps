const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { createToken } = require('../tokens');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'ユーザー名とパスワードが必要です' });

  const user = db.getUser(username);
  if (!user) {
    return res.json({ success: false, error: 'ユーザー名またはパスワードが正しくありません' });
  }

  // Verify bcrypt password
  let valid = false;
  try {
    valid = bcrypt.compareSync(password, user.password_hash);
  } catch (e) {
    valid = false;
  }

  if (!valid) {
    return res.json({ success: false, error: 'ユーザー名またはパスワードが正しくありません' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  const token = createToken(user);

  res.json({ success: true, token, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
