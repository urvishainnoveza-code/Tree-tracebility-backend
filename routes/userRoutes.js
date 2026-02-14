const express = require('express');
const router = express.Router();
const {signupUser, deleteUserAll, createUser,updateUser, importUsersFromExcel, exportUsers, getUsers, deleteUser, getUserById, loginUser, verifyOtp,    logout } = require('../Controllers/userController');

const { protect } = require('../middleware/auth');
const { uploadProfileImage, attachImage, } = require('../middleware/uploadimage');
const excelUpload = require("../middleware/excelUpload");
const generateUserNumber = require('../middleware/generateUser');




router.post('/create', protect, attachImage,generateUserNumber, createUser);
router.post('/signup',signupUser);
router.put('/:id', protect, attachImage, updateUser);
router.post('/login', loginUser);
router.post('/verifyOtp', verifyOtp);
router.post('/import-excel', excelUpload.single('file'), importUsersFromExcel);
router.get('/export-excel',protect, exportUsers);

router.get('/', protect, getUsers);

router.get('/:id', protect, getUserById);

router.delete('/logout', protect, logout);

router.delete('/delete-users', protect, deleteUserAll);

router.delete('/:id', protect, deleteUser);




module.exports = router;


