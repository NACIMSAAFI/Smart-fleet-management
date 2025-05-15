const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const vehicleStatusController = require('../controllers/vehicleStatusController');
const rentalDurationController = require('../controllers/rentalDurationController');
const vehicleConflictController = require('../controllers/vehicleConflictController');
const clearRangeController = require('../controllers/clearRangeController');

// Vehicle management
router.get('/vehicles', vehicleController.getVehicles);
router.post('/vehicles', vehicleController.addVehicle);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);

// Status management
router.post('/statuses', vehicleStatusController.setVehicleStatus);
router.get('/statuses', vehicleStatusController.getStatuses);
router.delete('/statuses/:vehicleId/:date', vehicleStatusController.deleteStatus);

// Duration management (single endpoint set)
router.post('/durations', rentalDurationController.setRentalDuration);
router.get('/durations', rentalDurationController.getRentalDurations);
router.delete('/durations/:vehicleId/:startDate', rentalDurationController.deleteRentalDuration);

// Utility endpoints
router.get('/conflicts', vehicleConflictController.checkConflicts);
router.post('/clear-range', clearRangeController.clearRange);

module.exports = router;