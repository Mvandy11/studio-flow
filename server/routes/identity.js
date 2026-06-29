import express from 'express';
import { createIdentity } from '../controllers/identityController.js';

const router = express.Router();

// POST /api/identity/create
router.post('/create', createIdentity);

export default router;
