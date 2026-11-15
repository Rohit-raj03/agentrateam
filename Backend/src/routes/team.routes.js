import express from "express";
import {
  getTeams,
  getTeamMembers,
  inviteTeamMember,
  getTeamById,
} from "../controllers/team.controller.js";
import {
  updateTeamLogo,
  deleteTeamLogo,
} from "../controllers/media.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadSingleImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(protect);

// Team Logo Endpoints
router.patch("/:teamId/image", uploadSingleImage("image"), updateTeamLogo);
router.delete("/:teamId/image", deleteTeamLogo);

// Standard Team Endpoints
router.get("/", getTeams);
router.get("/members", getTeamMembers);
router.post("/invite", inviteTeamMember);
router.get("/:teamId", getTeamById);

export default router;
