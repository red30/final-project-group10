const router = module.exports = require('express').Router();

router.use('/albums', require('./albums').router);
router.use('/photos', require('./photos').router);
router.use('/users', require('./users').router);
