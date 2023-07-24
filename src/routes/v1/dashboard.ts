// import { getStatusCount } from "../../controllers/dashboard/index";
import * as Dashoboard from "../../controllers/dashboard/index";
import express from "express";
import passport from "passport";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin } from "../../middlewares/adminCheck";

let router = express.Router();

// =========================  routes ========================

// router.get("/cards",
// entryPoint,
// passport.authenticate("bearer", { session: false }),
// // isAdmin,
// Dashoboard.getcardsData,
// exitPoint);

router.get(
  "/overallMachineData",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  // isAdmin,
  // Dashoboard.getcardsData,
  Dashoboard.getOverallPlantData,
  exitPoint
);

// router.get("/machineData",
// entryPoint,
// passport.authenticate("bearer", { session: false }),
// // isAdmin,
// Dashoboard.getMachineData,

// exitPoint);

router.get(
  "/machineData/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  // isAdmin,
  Dashoboard.getLatestDataByMachineName,
  exitPoint
);

router.get(
  "/prevMachineData/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  // isAdmin,
  Dashoboard.getPrevDataByMachineName,
  exitPoint
);

//new collection method
router.get(
  "/latestMachineData",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  Dashoboard.latestMachineData,
  exitPoint
);

////creating separate Api for MachineNameDisplay with Status
router.get(
  "/machineNameDisplay",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  Dashoboard.machineStatusAgg,
  exitPoint
);

router.get(
  "/getAllMachineData",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  Dashoboard.getAllMachineData,
  exitPoint
);

router.get(
  "/shiftDowntimeReasons/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  Dashoboard.shiftDowntimeReasons,
  exitPoint
);

// =========================  end of routes   ========================
module.exports = router;
