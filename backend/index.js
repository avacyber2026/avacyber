const express = require('express');
const authRoutes = require('./routes/auth');
const ticketsRoutes = require('./routes/tickets');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const notificationsRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const guideArticlesRoutes = require('./routes/guideArticles');
const exportRoutes = require('./routes/export');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Маршруты: /auth, /tickets, /reports, /users, /admin, /profile, /notifications, /settings
router.use('/auth', authRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/reports', reportsRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/profile', profileRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/settings', settingsRoutes);
router.use('/guide-articles', guideArticlesRoutes);
router.use('/export', exportRoutes);

module.exports = router;
