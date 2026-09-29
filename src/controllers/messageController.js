import { Message } from '../models/Message.js';

export async function getMessages(req, res) {
  try {
    const messages = await Message.find();
    const mapped = (messages || []).map(m => ({
      ...m,
      id: m.id || `msg-${Date.now()}`,
      date: m.date || (m.createdAt ? new Date(m.createdAt).toISOString().replace('T', ' ').slice(0, 16) : '')
    }));
    return res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createMessage(req, res) {
  try {
    const msg = { ...req.body };
    if (!msg.id) msg.id = 'msg-' + Date.now().toString().slice(-6);
    if (!msg.createdAt) msg.createdAt = new Date().toISOString();
    if (!msg.date) msg.date = new Date().toISOString().replace('T', ' ').slice(0, 16);
    msg.read = false;

    await Message.create(msg);
    res.status(201).json(msg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function markMessageRead(req, res) {
  try {
    const rawId = req.params.id;
    const updated = await Message.findOneAndUpdate(
      { id: rawId },
      { $set: { read: true } },
      { new: true }
    );

    res.json(updated || { id: rawId, read: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function markAllMessagesRead(req, res) {
  try {
    await Message.markAllAsRead();
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteMessage(req, res) {
  try {
    const rawId = String(req.params.id || '');
    if (!rawId || rawId === 'undefined') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    await Message.deleteMany({ id: rawId });
    res.json({ success: true, message: 'Message deleted', id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
