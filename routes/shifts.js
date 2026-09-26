const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/company/:companyId', async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({ where: { companyId: Number(req.params.companyId) } });
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.post('/', async (req, res) => {
  const { name, startTime, endTime, companyId } = req.body;
  if (!name || !startTime || !endTime || !companyId) {
    return res.status(400).json({ error: 'Barcha maydonlar shart' });
  }
  try {
    const shift = await prisma.shift.create({ data: { name, startTime, endTime, companyId: Number(companyId) } });
    res.json(shift);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.shift.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.post('/assign', async (req, res) => {
  const { employeeId, shiftId, date } = req.body;
  if (!employeeId || !shiftId || !date) {
    return res.status(400).json({ error: 'Xodim, smena va sana shart' });
  }
  try {
    const assignment = await prisma.employeeShift.upsert({
      where: { employeeId_date: { employeeId: Number(employeeId), date: new Date(date) } },
      update: { shiftId: Number(shiftId) },
      create: { employeeId: Number(employeeId), shiftId: Number(shiftId), date: new Date(date) },
    });
    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.get('/schedule/:employeeId/:year/:month', async (req, res) => {
  const { employeeId, year, month } = req.params;
  try {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);
    const schedule = await prisma.employeeShift.findMany({
      where: { employeeId: Number(employeeId), date: { gte: start, lt: end } },
      include: { shift: true },
      orderBy: { date: 'asc' },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.delete('/assign/:employeeId/:date', async (req, res) => {
  try {
    await prisma.employeeShift.delete({
      where: { employeeId_date: { employeeId: Number(req.params.employeeId), date: new Date(req.params.date) } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

module.exports = router;
