const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username & password wajib diisi' });

  const userExists = await User.findOne({ username });
  if (userExists) return res.status(400).json({ error: 'Username sudah terdaftar' });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: 'Register sukses' });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username & password wajib diisi' });

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'User tidak ditemukan' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Password salah' });

  // JWT
  const token = jwt.sign(
    { id: user._id, username: user.username },
    'SECRET_JWT_KEY',
    { expiresIn: '8h' }
  );
  res.json({ token, username: user.username });
});

module.exports = router;
