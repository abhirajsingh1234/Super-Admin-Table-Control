const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configController');

router.post('/connect', ctrl.connect);
router.post('/save-tables', ctrl.saveTables);
router.get('/config', ctrl.getConfig);
router.post('/relationships', ctrl.saveRelationships);
router.get('/columns', ctrl.getColumns);
router.get('/table-data', ctrl.getTableData);
router.post('/table-row', ctrl.insertRow);
router.post('/table-row-update', ctrl.updateRow);
router.post('/table-row-delete', ctrl.deleteRow);

module.exports = router;