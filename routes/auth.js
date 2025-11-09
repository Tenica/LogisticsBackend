const express = require('express');
const isAuth = require('../middleware/is-auth');
const { createAdmin, loginAdmin, logoutAdmin, postReset, getNewPassword, postNewPassword} = require('../controllers/auth');
const router = express.Router();

router.post('/create-admin', createAdmin)
router.post('/login-admin', loginAdmin);
router.post('/logout-admin', isAuth, logoutAdmin)
router.post('/reset-password',  postReset);
router.get('/reset-password/:token', isAuth, getNewPassword)
router.post('/change-password/:token', postNewPassword)


module.exports = router;