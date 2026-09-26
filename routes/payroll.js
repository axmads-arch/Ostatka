const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function shiftHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

router.get('/:employeeId/:year/:month', async (req, res) => {
  const { employeeId, year, month } = req.params;
  try {
    const employee = await prisma.employee.findUnique({ where: { id: Number(employeeId) } });
    if (!employee) return res.status(404).json({ error: 'Xodim topilmadi' });

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);

    const schedule = await prisma.employeeShift.findMany({
      where: { employeeId: Number(employeeId), date: { gte: start, lt: end } },
      include: { shift: true },
    });
    const attendances = await prisma.attendance.findMany({
      where: { employeeId: Number(employeeId), timestamp: { gte: start, lt: end }, type: 'check_in' },
    });
    const attendedDates = new Set(attendances.map(a => new Date(a.timestamp).toDateString()));

    let totalHours = 0, daysAttended = 0, daysMissed = 0, lateMinutesTotal = 0;

    for (const s of schedule) {
      const attended = attendedDates.has(new Date(s.date).toDateString());
      if (attended) {
        daysAttended++;
        totalHours += shiftHours(s.shift.startTime, s.shift.endTime);
      } else {
        daysMissed++;
      }
    }
    for (const a of attendances) {
      if (a.status === 'kech' && a.minutesDiff > 0) lateMinutesTotal += a.minutesDiff;
    }

    const shiftPay = employee.monthlySalary ? employee.monthlySalary : Math.round(totalHours * employee.hourlyRate);

    const adjustments = await prisma.bonusPenalty.findMany({
      where: { employeeId: Number(employeeId), date: { gte: start, lt: end } },
    });
    const bonus = adjustments.filter(a => a.type === 'bonus').reduce((s, a) => s + a.amount, 0);
    const penalty = adjustments.filter(a => a.type === 'penalty').reduce((s, a) => s + a.amount, 0);
    const productDeduction = adjustments.filter(a => a.type === 'product_deduction').reduce((s, a) => s + a.amount, 0);

    const netSalary = shiftPay + bonus - penalty - productDeduction;

    res.json({
      employee: { id: employee.id, fullName: employee.fullName, position: employee.position },
      year: Number(year), month: Number(month),
      totalHours, daysAttended, daysMissed, totalScheduledDays: schedule.length, lateMinutesTotal,
      shiftPay, bonus, penalty, productDeduction, netSalary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.get('/company/:companyId/:year/:month', async (req, res) => {
  const { companyId, year, month } = req.params;
  try {
    const employees = await prisma.employee.findMany({ where: { companyId: Number(companyId), active: true } });
    const results = [];
    for (const emp of employees) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      const schedule = await prisma.employeeShift.findMany({
        where: { employeeId: emp.id, date: { gte: start, lt: end } },
        include: { shift: true },
      });
      const attendances = await prisma.attendance.findMany({
        where: { employeeId: emp.id, timestamp: { gte: start, lt: end }, type: 'check_in' },
      });
      const attendedDates = new Set(attendances.map(a => new Date(a.timestamp).toDateString()));
      let totalHours = 0, daysAttended = 0, daysMissed = 0;
      for (const s of schedule) {
        if (attendedDates.has(new Date(s.date).toDateString())) {
          daysAttended++;
          totalHours += shiftHours(s.shift.startTime, s.shift.endTime);
        } else {
          daysMissed++;
        }
      }
      const shiftPay = emp.monthlySalary ? emp.monthlySalary : Math.round(totalHours * emp.hourlyRate);
      const adjustments = await prisma.bonusPenalty.findMany({
        where: { employeeId: emp.id, date: { gte: start, lt: end } },
      });
      const bonus = adjustments.filter(a => a.type === 'bonus').reduce((s, a) => s + a.amount, 0);
      const penalty = adjustments.filter(a => a.type === 'penalty').reduce((s, a) => s + a.amount, 0);
      const productDeduction = adjustments.filter(a => a.type === 'product_deduction').reduce((s, a) => s + a.amount, 0);
      results.push({
        employeeId: emp.id, fullName: emp.fullName, position: emp.position,
        totalHours, daysAttended, daysMissed, shiftPay, bonus, penalty, productDeduction,
        netSalary: shiftPay + bonus - penalty - productDeduction,
      });
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.post('/adjustment', async (req, res) => {
  const { employeeId, type, amount, reason, date } = req.body;
  if (!employeeId || !type || amount == null) {
    return res.status(400).json({ error: 'Xodim, tur va summa shart' });
  }
  try {
    const adjustment = await prisma.bonusPenalty.create({
      data: { employeeId: Number(employeeId), type, amount: Number(amount), reason: reason || null, date: date ? new Date(date) : new Date() },
    });
    res.json(adjustment);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

module.exports = router;
