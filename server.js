const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Xodimlar nazorati backend ishlayapti' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi`);
});
