const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files with long-term caching
const setCacheHeader = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
};

app.use(express.static('public'));
app.use('/uploads', express.static('uploads', { setHeaders: setCacheHeader }));

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  try {
    const { originalname, buffer, mimetype } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let outputExt = ext;
    let transformer = sharp(buffer).resize({
      width: 1920,
      height: 1080,
      fit: 'inside'
    });

    if (mimetype === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
      transformer = transformer.jpeg({ quality: 80 });
    } else if (mimetype === 'image/png' || ext === '.png') {
      transformer = transformer.webp({ quality: 80 });
      outputExt = '.webp';
    }

    const fileName = `${Date.now()}${outputExt}`;
    const filePath = path.join(uploadDir, fileName);

    await transformer.toFile(filePath);

    res.json({ url: `/uploads/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Image processing failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
