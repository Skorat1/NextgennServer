import { Router } from 'express';
import { generateProvablyFair, verifyProvablyFair } from '../controllers/fairController.js';

const router = Router();

router.post('/generate', generateProvablyFair);
router.post('/verify', verifyProvablyFair);

export default router;
