const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateStatus(actualTime, scheduledTimeStr) {
  const [h, m] = scheduledTimeStr.split(':').map(Number);
  const scheduled = new Date(actualTime);
  scheduled.setHours(h, m, 0, 0);
  const diffMinutes = Math.round((actualTime - scheduled) / 60000);
  let status;
  if (diffMinutes > 5) status = 'kech';
  else if (diffMinutes < -15) status = 'erta';
  else status = 'vaqtida';
  return { status, minutesDiff: diffMinutes };
}

router.post('/checkin', async (req, res) => {
  const { employeeId, type, photoUrl, latitude, longitude } = req.body;
  if (!employeeId || !type || !photoUrl || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi shart" });
  }
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      include: { company: true },
    });
    if (!employee) return res.status(404).json({ error: 'Xodim topilmadi' });

    const { company } = employee;
    const distance = distanceInMeters(latitude, longitude, company.latitude, company.longitude);
    const withinRadius = distance <= company.radiusM;

    if (!withinRadius) {
      return res.status(403).json({
        error: `Siz ishxona teritoriyasida emassiz (masofa: ${Math.round(distance)}m, ruxsat: ${company.radiusM}m)`,
        distanceM: Math.round(distance),
        withinRadius: false,
      });
    }

    let status = null;
    let minutesDiff = null;

    if (type === 'check_in') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayShift = await prisma.employeeShift.findFirst({
        where: { employeeId: employee.id, date: { gte: today, lt: tomorrow } },
        include: { shift: true },
      });

      if (todayShift) {
        const result = calculateStatus(new Date(), todayShift.shift.startTime);
        status = result.status;
        minutesDiff = result.minutesDiff;
      }
    }

    const attendance = await prisma.attendance.create({
      data: { employeeId: employee.id, type, photoUrl, latitude, longitude, distanceM: distance, withinRadius, status, minutesDiff },
    });

    res.json({ success: true, attendance, status, minutesDiff });
  } catch (err) {
    console.error('Checkin xatoligi:', err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.get('/today/:employeeId', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await prisma.attendance.findMany({
      where: { employeeId: Number(req.params.employeeId), timestamp: { gte: today, lt: tomorrow } },
      orderBy: { timestamp: 'asc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

router.get('/company/:companyId/day/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const employees = await prisma.employee.findMany({
      where: { companyId: Number(req.params.companyId), active: true },
      include: {
        attendances: { where: { timestamp: { gte: date, lt: nextDay } }, orderBy: { timestamp: 'asc' } },
      },
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

module.exports = router;
