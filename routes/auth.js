const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

router.post('/register-manager', async (req, res) => {
  const { name, phone, password, role, companyId } = req.body;
  if (!name || !phone || !password || !companyId) {
    return res.status(400).json({ error: 'Barcha maydonlar shart' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const manager = await prisma.manager.create({
      data: { name, phone, passwordHash, role: role || 'manager', companyId: Number(companyId) },
    });
    res.json({ id: manager.id, name: manager.name, phone: manager.phone, role: manager.role });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Bu telefon raqam bilan menejer allaqachon mavjud' });
    }
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Telefon va parol shart' });
  try {
    const manager = await prisma.manager.findUnique({ where: { phone } });
    if (!manager) return res.status(401).json({ error: "Telefon yoki parol noto'g'ri" });
    const valid = await bcrypt.compare(password, manager.passwordHash);
    if (!valid) return res.status(401).json({ error: "Telefon yoki parol noto'g'ri" });
    const token = jwt.sign(
      { managerId: manager.id, companyId: manager.companyId, role: manager.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, manager: { id: manager.id, name: manager.name, role: manager.role, companyId: manager.companyId } });
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token kerak' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.manager = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
