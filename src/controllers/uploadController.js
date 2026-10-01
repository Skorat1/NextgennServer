import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadImage(req, res) {
  try {
    const { image, name, filename: userFilename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided. Provide base64 or file URL.' });
    }

    // Handle base64 Data URL (e.g. data:image/png;base64,iVBORw0KGgo...)
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already an HTTP URL or local URL, just return it
      if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/uploads/')) {
        return res.json({ success: true, url: image });
      }
      return res.status(400).json({ error: 'Invalid base64 image format. Expecting data:image/*;base64,...' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine extension
    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    // Generate safe clean filename
    const cleanPrefix = (userFilename || name || 'upload')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);

    const filename = `${cleanPrefix}-${Date.now()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    res.json({
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to save uploaded image' });
  }
}
