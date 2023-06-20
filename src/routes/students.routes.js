const router = require('express').Router();
const { find_all_students, addMonthlyFee, registerInscription, getStudentPayments, registerPaymentAbono, registerPaymentCuota } = require('../controllers/students');

router.get('/find/all', find_all_students);
router.put('/add/monthly/fee/:student_id', addMonthlyFee);
router.put('/register/inscription', registerInscription);
router.get('/get/payments/:student_id',getStudentPayments);
router.post('/register/abono', registerPaymentAbono);
router.post('/register/cuota', registerPaymentCuota);

module.exports = router;