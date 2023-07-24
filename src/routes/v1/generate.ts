import { addData } from "../../controllers/operations";
import express from "express";
import passport from "passport";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin } from "../../middlewares/adminCheck";
import { breakDown, planned, rejection, oee, energy, mould} from "../../controllers/generate";
import * as Search from "../../controllers/search";
import * as Operations from "../../controllers/operations/index";

let router = express.Router();

router.post(
  "/breakDown/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  breakDown,
  exitPoint
);

router.post(
  "/planned/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  planned,
  exitPoint
);


router.post(
  "/rejection/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  rejection,
  exitPoint
);


router.post(
  "/oee/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  oee,
  exitPoint
);


router.post(
  "/energy/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  energy,
  exitPoint
);


router.post(
  "/mould/:type",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  mould,
  exitPoint
);


module.exports = router;
