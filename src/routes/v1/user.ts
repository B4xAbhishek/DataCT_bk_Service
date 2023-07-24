import express from "express";
import passport from "passport";
import { addUser, updateUser, deleteUser, findAllUsers, findOneUser } from "../../controllers/user/index";
import { entryPoint } from "../../middlewares/entryPoint";
import { exitPoint } from "../../middlewares/exitPoint";
import { isAdmin } from "../../middlewares/adminCheck";

let router = express.Router();

router.post(
  "/add",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  addUser,
  exitPoint
);

router.post(
  "/update/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  updateUser,
  exitPoint
);

router.post(
  "/delete",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  deleteUser,
  exitPoint
);

router.get(
  "/findAll",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  findAllUsers,
  exitPoint
);

router.get(
  "/findOne/:id",
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  findOneUser,
  exitPoint
);

// =========================  end of routes   ========================
module.exports = router;