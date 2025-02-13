const express = require("express");
const auth = require("../../middlewares/doctor.auth");
const doctorPrescriptionController = require("../../controllers/Doctor/prescription.controller");

const router = express.Router();

router.get(
  "/suggestions/prescription",
  auth,
  doctorPrescriptionController.prescriptionSuggestion
);
router.get(
  "/:id/prescriptions",
  auth,
  doctorPrescriptionController.getPatientPastPrescriptions
);
router.post(
  "/:id/prescription",
  auth,
  doctorPrescriptionController.addPrescription
);

module.exports = router;
