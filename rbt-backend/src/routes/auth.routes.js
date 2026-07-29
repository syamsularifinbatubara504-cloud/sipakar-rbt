/**
 * Auth Routes
 * /api/auth/*
 */
const express = require('express');
const router = express.Router();
const { googleLogin, getProfile, updateProfile, localLogin } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/google', googleLogin);

// Local login for predefined accounts
router.post('/local-login', localLogin);

// Protected routes (memerlukan JWT)
router.get('/me', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;

