import { Submission } from '../models/Submission.js';
import { sanitizeGameUrl } from '../utils/sanitize.js';

export async function getSubmissions(req, res) {
  try {
    const submissions = await Submission.find();
    return res.json(submissions || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createSubmission(req, res) {
  try {
    const data = { ...req.body };
    if (!data.id) data.id = 'sub-' + Date.now().toString().slice(-6);
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    if (!data.status) data.status = 'pending';
    if (data.gameUrl) {
      data.gameUrl = sanitizeGameUrl(data.gameUrl);
    }

    await Submission.create(data);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateSubmission(req, res) {
  try {
    const rawId = req.params.id;

    const updated = await Submission.findOneAndUpdate(
      { id: rawId },
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteSubmission(req, res) {
  try {
    const rawId = String(req.params.id || '');
    if (!rawId) {
      return res.status(400).json({ error: 'Submission ID required' });
    }

    await Submission.deleteMany({ id: rawId });
    res.json({ success: true, message: 'Submission deleted', id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
