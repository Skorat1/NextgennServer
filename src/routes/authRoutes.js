import { Router } from 'express';
import {
  getPasskeyChallenge,
  verifyPasskey,
  oauthRedirect,
  socialLogin,
  getMe,
  registerUser,
  loginUser,
  forgotPassword
} from '../controllers/authController.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/passkey-challenge', getPasskeyChallenge);
router.post('/passkey-verify', verifyPasskey);
router.get('/me', getMe);
router.post('/social', socialLogin);
router.get('/:provider', oauthRedirect);

export default router;
