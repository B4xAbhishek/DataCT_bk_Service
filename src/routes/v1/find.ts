import { findOneData,findAllData } from "../../controllers/operations";
import express from "express";
import passport from "passport";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin } from "../../middlewares/adminCheck";

let router = express.Router();

// =========================  routes ========================

router.get("/:collectionName/:id", 
entryPoint,
passport.authenticate("bearer", { session: false }),
isAdmin,
findOneData,
exitPoint);

router.get("/:collectionName", 
entryPoint,
passport.authenticate("bearer", { session: false }),
isAdmin,
findAllData,
exitPoint);

// =========================  end of routes   ========================
module.exports = router;