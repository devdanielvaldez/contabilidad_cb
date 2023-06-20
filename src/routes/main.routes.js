const router = require('express').Router();
const student = require('./students.routes');
const payments = require('./payments.routes');

router.use('/students', student);
router.use('/payments', payments);

module.exports = router;