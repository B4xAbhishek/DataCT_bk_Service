import { deleteData } from "../../controllers/operations";
import express from "express";
import passport from "passport";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin } from "../../middlewares/adminCheck";

let router = express.Router();

// =========================  routes ========================

router.post("/:collectionName/:id", 
entryPoint,
passport.authenticate("bearer", { session: false }),
isAdmin,
deleteData,
exitPoint);

// =========================  end of routes   ========================
module.exports = router;