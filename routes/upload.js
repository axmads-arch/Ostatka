const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Rasm topilmadi' });
  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const formData = new URLSearchParams();
    formData.append('image', base64Data);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    const data = await response.json();
    if (data.data?.url) {
      res.json({ url: data.data.url });
    } else {
      res.status(500).json({ error: 'Rasm yuklanmadi' });
    }
  } catch (err) {
    console.error('Rasm yuklash xatoligi:', err);
    res.status(500).json({ error: 'Server xatoligi' });
  }
});

module.exports = router;
