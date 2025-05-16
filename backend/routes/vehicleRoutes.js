// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const {
  getVehicles,
  addVehicle,
  updateVehicle, // Added updateVehicle
  deleteVehicle
} = require('../controllers/vehicleController');

const {
  setVehicleStatus,
  getStatuses,
  deleteStatus
} = require('../controllers/vehicleStatusController');

const {
  setRentalDuration,
  getRentalDurations,
  deleteRentalDuration
} = require('../controllers/rentalDurationController');

const { checkConflicts } = require('../controllers/vehicleConflictController');

// Global statuses (for all vehicles, with optional query params)
router.route('/statuses')
  .get(getStatuses);

// Global durations (for all vehicles, with optional query params)
router.route('/durations')
  .get(getRentalDurations);

// Add global conflicts route
router.get('/conflicts', checkConflicts);

// Add global statuses POST route
router.post('/statuses', setVehicleStatus);

// Add global durations POST route
router.post('/durations', setRentalDuration);

// Add global statuses DELETE route
router.delete('/statuses/:vehicleId/:date', deleteStatus);

// Add global durations DELETE route
router.delete('/durations/:vehicleId/:startDate', deleteRentalDuration);

// Vehicle CRUD
router.route('/')
  .get(getVehicles)       // GET /api/vehicles
  .post(addVehicle);      // POST /api/vehicles

router.route('/:id')
  .put(updateVehicle)     // PUT /api/vehicles/:id - Add route for updating vehicle
  .delete(deleteVehicle); // DELETE /api/vehicles/:id

// Status management
router.route('/:vehicleId/statuses')
  .get(getStatuses)       // GET /api/vehicles/:vehicleId/statuses
  .post(setVehicleStatus); // POST /api/vehicles/:vehicleId/statuses

router.route('/:vehicleId/statuses/:date')
  .delete(deleteStatus);  // DELETE /api/vehicles/:vehicleId/statuses/:date

// Rental durations
router.route('/:vehicleId/durations')
  .get(getRentalDurations)    // GET /api/vehicles/:vehicleId/durations
  .post(setRentalDuration);   // POST /api/vehicles/:vehicleId/durations

router.route('/:vehicleId/durations/:startDate')
  .delete(deleteRentalDuration); // DELETE /api/vehicles/:vehicleId/durations/:startDate

module.exports = router;