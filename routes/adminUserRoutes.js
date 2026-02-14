const express = require('express');
const router = express.Router();
const { getUser,updateUser,createSuperUser,loginUser,verifyOtp} = require('../Controllers/adminUsercontroller.js');
const { protect } = require('../middleware/auth.js');
const {uploadProfileImage} = require('../middleware/uploadimage.js');


router.post('/', createSuperUser);
router.post('/login', loginUser);
router.post('/verify-Otp',verifyOtp)
router.get('/',protect,getUser);
router.put('/',protect, uploadProfileImage,updateUser);



module.exports = router;



