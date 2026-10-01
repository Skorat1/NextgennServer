import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
<<<<<<< HEAD
  max: process.env.NODE_ENV === 'production' ? 1000 : 15000,
=======
  max: 1000,
>>>>>>> cc496e0f4ea914ad0aa57f7457ceb715fe8db620
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
