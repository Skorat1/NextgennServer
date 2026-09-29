import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Category } from '../models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATEGORY_UPLOADS_DIR = path.resolve(__dirname, '../../uploads/categories');

export async function getCategories(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const categories = await Category.find();
    res.json(categories || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const cat = { ...req.body };
    if (!cat.id) {
      cat.id = (cat.name || 'cat')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const created = await Category.findOneAndUpdate(
      { id: cat.id },
      { $set: cat },
      { upsert: true, new: true }
    );

    res.status(201).json(created || cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const rawId = String(req.params.id || '');
    const updates = { ...req.body };
    if (updates.image && !updates.icon) {
      updates.icon = updates.image;
    }
    if (updates.icon && !updates.image && (updates.icon.startsWith('http') || updates.icon.startsWith('/uploads') || updates.icon.startsWith('data:'))) {
      updates.image = updates.icon;
    }

    const updated = await Category.findOneAndUpdate(
      { id: rawId },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const rawId = String(req.params.id || '');
    if (!rawId) {
      return res.status(400).json({ error: 'Category ID required' });
    }

    await Category.deleteMany({ id: rawId });
    res.json({ success: true, message: 'Category deleted', id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/categories/upload-image — admin only
export async function uploadCategoryImage(req, res) {
  try {
    const { image, filename: clientFilename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!fs.existsSync(CATEGORY_UPLOADS_DIR)) {
      fs.mkdirSync(CATEGORY_UPLOADS_DIR, { recursive: true });
    }

    let ext = 'png';
    let base64Data = image;

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      else if (mime.includes('svg')) ext = 'svg';
      else ext = 'png';
      base64Data = matches[2];
    } else if (clientFilename && clientFilename.includes('.')) {
      ext = clientFilename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const savedName = `category-${uniqueId}.${ext}`;
    const filePath = path.join(CATEGORY_UPLOADS_DIR, savedName);

    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/categories/${savedName}`;
    res.json({
      success: true,
      url: relativeUrl,
      filename: savedName,
      size: buffer.length
    });
  } catch (err) {
    console.error('uploadCategoryImage error:', err);
    res.status(500).json({ error: 'Failed to save category image' });
  }
}
