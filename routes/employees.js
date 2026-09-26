const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/company/:companyId', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: Number(req.params.companyId) },
      orderBy: { fullName: 'asc' },
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
    if (!employee) return res.status(404).json({ error: 'Xodim topilmadi' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.post('/', async (req, res) => {
  const { fullName, position, phone, photoUrl, hourlyRate, monthlySalary, companyId } = req.body;
  if (!fullName || !position || !phone || !companyId) {
    return res.status(400).json({ error: "Ism, lavozim, telefon va kompaniya shart" });
  }
  try {
    const employee = await prisma.employee.create({
      data: {
        fullName, position, phone,
        photoUrl: photoUrl || null,
        hourlyRate: Number(hourlyRate) || 0,
        monthlySalary: monthlySalary ? Number(monthlySalary) : null,
        companyId: Number(companyId),
      },
    });
    res.json(employee);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Bu telefon raqam bilan xodim allaqachon mavjud' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.put('/:id', async (req, res) => {
  const { fullName, position, phone, photoUrl, hourlyRate, monthlySalary, active } = req.body;
  try {
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(position !== undefined && { position }),
        ...(phone !== undefined && { phone }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        ...(monthlySalary !== undefined && { monthlySalary: monthlySalary ? Number(monthlySalary) : null }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: { active: false },
    });
    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

module.exports = router;
