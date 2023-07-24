import { addData } from "../../controllers/operations";
import express from "express";
import passport from "passport";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin, isAdminOrUser } from "../../middlewares/adminCheck";
import {
  searchData,
  getGraphData,
  getGraphForBreakDown,
  getGraphForPlannedAnalysis,
  getGraphForRejectionAnalysis,
} from "../../controllers/search";
import * as Search from "../../controllers/search";
import * as Operations from "../../controllers/operations/index";
import { getMaterialDescriptionAgg } from "../../models/dynamicmodel";

let router = express.Router();

// =========================  routes ========================
router.post(
  "/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  searchData,
  exitPoint
);

router.post(
  "/graph/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  getGraphData,
  exitPoint
);

router.post(
  "/stackedGraph/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  getGraphForBreakDown,
  exitPoint
);

router.post(
  "/stackedGraph/plannedAnalysis/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  getGraphForPlannedAnalysis,
  exitPoint
);

router.post(
  "/stackedGraph/rejectionAnalysis/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  getGraphForRejectionAnalysis,
  exitPoint
);

router.post(
  "/mouldFlow/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getGraphForMould,
  // getMaterialDescriptionAgg,
  exitPoint
);

//===============apis for filter params ====================

router.get(
  "/reasons/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Operations.getAllReasons,
  exitPoint
);

router.get(
  "/machineId/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Operations.getAllMachineIds,
  exitPoint
);

router.get(
  "/breakDown/materialList/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Operations.getmatrialListForBreakdown,
  exitPoint
);

router.get(
  "/oee/materialList/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Operations.getmatrialListForOee,
  exitPoint
);

router.get(
  "/rejection/materialList/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Operations.getmatrialListForRejection,
  exitPoint
);

//=================== counter apis =============

router.post(
  "/counters/OEE",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCounters,
  exitPoint
);

router.post(
  "/counters/breakDown",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCountersForBreakdown,
  exitPoint
);

router.post(
  "/counters/plannedDowntime",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCountersForPlanned,
  exitPoint
);

router.post(
  "/counters/energy",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCountersForEnergy,
  exitPoint
);

router.post(
  "/counters/rejection",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCountersForRejection,
  exitPoint
);

router.post(
  "/counters/mould",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.getCountersForMould,
  exitPoint
);

// ================== dashboard apis ======================

router.get(
  "/machineHoldData/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.machineHoldingsData,
  exitPoint
);

//get latest oee data in different collection
router.get(
  "/machineHoldData/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.machineHoldingsData,
  exitPoint
);

router.post(
  "/averageData/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.machineAverageData,
  exitPoint
);

router.post(
  "/averageSingleMachineData/getData",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.singleMachineData,
  exitPoint
);

//calculate the averageData for OEE

router.post(
  "/averageDataOee/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Search.machineAverageDataOee,
  exitPoint
);

router.post(
  "/totalEnergy/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  Search.machineTotalEnergyData,
  exitPoint
);

router.get(
  "/liveData/:collectionName",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.machineLiveData,
  exitPoint
);

router.post(
  "/status/machine",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdminOrUser,
  // isAdmin,
  Search.machineStatusData,
  exitPoint
);

// =========================  end of routes   ========================
module.exports = router;
