import { Router } from 'express';
import {
  getPasskeyChallenge,
  verifyPasskey,
  oauthRedirect,
  socialLogin,
  getMe
} from '../controllers/authController.js';

const router = Router();

router.get('/passkey-challenge', getPasskeyChallenge);
router.post('/passkey-verify', verifyPasskey);
router.get('/me', getMe);
router.post('/social', socialLogin);
router.get('/:provider', oauthRedirect);

export default router;
