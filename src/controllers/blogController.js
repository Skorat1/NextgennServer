import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlogPost } from '../models/BlogPost.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/blog');

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// GET /api/blog  — public: only published posts
export async function getAllPosts(req, res) {
  setNoCacheHeaders(res);
  try {
    await BlogPost.ensureTable();
    const { search, featured, limit } = req.query;
    const filter = { published: true };
    if (search) filter.search = search;
    if (featured === 'true') filter.featured = true;
    if (limit) filter.limit = limit;
    const posts = await BlogPost.find(filter);
    res.json(posts);
  } catch (err) {
    console.error('getAllPosts error:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
}

// GET /api/blog/admin/all  — admin: all posts (including drafts)
export async function getAllPostsAdmin(req, res) {
  setNoCacheHeaders(res);
  try {
    await BlogPost.ensureTable();
    const { search } = req.query;
    const filter = {};
    if (search) filter.search = search;
    const posts = await BlogPost.find(filter);
    res.json(posts);
  } catch (err) {
    console.error('getAllPostsAdmin error:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
}

// GET /api/blog/:id  — public
export async function getPostById(req, res) {
  setNoCacheHeaders(res);
  try {
    const post = await BlogPost.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    // increment views async
    BlogPost.incrementViews(req.params.id).catch(() => {});
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
}

// POST /api/blog  — admin only
export async function createPost(req, res) {
  try {
    const data = req.body;
    if (!data.title || !data.title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const post = await BlogPost.create(data);
    res.status(201).json(post);
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ error: 'Failed to create post: ' + err.message });
  }
}

// PUT /api/blog/:id  — admin only
export async function updatePost(req, res) {
  try {
    const post = await BlogPost.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const updated = await BlogPost.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('updatePost error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
}

// DELETE /api/blog/:id  — admin only
export async function deletePost(req, res) {
  try {
    const post = await BlogPost.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await BlogPost.delete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

// PATCH /api/blog/:id/publish  — admin: toggle published
export async function togglePublish(req, res) {
  try {
    const post = await BlogPost.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const updated = await BlogPost.update(req.params.id, { published: !post.published });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle publish status' });
  }
}

// PATCH /api/blog/:id/featured  — admin: toggle featured
export async function toggleFeatured(req, res) {
  try {
    const post = await BlogPost.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const updated = await BlogPost.update(req.params.id, { featured: !post.featured });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle featured status' });
  }
}

// POST /api/blog/upload-image  — admin only
export async function uploadBlogImage(req, res) {
  try {
    const { image, filename: clientFilename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    let ext = 'png';
    let base64Data = image;

<<<<<<< HEAD
    const matches = image.match(/^data:([A-Za-z0-9_+\-\/]+);base64,(.+)$/);
=======
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
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
    const savedName = `blog-${uniqueId}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, savedName);

    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/blog/${savedName}`;
    res.json({
      success: true,
      url: relativeUrl,
      filename: savedName,
      size: buffer.length
    });
  } catch (err) {
    console.error('uploadBlogImage error:', err);
    res.status(500).json({ error: 'Failed to save uploaded image' });
  }
}
