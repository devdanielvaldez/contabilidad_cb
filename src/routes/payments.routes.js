const router = require('express').Router();
const { addExtraordinaryPayments, updateExtraordinaryPayments, addExtraordinaryPaymentsByStudentAndPeriod, savePaymentReceipt} = require('../controllers/payments');

router.post('/register', addExtraordinaryPayments);
router.put('/update/payments',updateExtraordinaryPayments);
router.post('/extraordinary/payment', addExtraordinaryPaymentsByStudentAndPeriod);
router.post('/create/factura', savePaymentReceipt);

module.exports = router;