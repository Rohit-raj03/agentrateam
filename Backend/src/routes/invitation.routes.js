import express from "express";
import {
  createInvitation,
  getInvitations,
  resendInvitation,
  revokeInvitation,
  updateInvitationStatus,
  verifyInvitationToken,
  acceptInvitation,
} from "../controllers/invitation.controller.js";
import { protect, requireAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 1. Public Ingress Routes for Invited Employees
router.get("/verify/:token", verifyInvitationToken);
router.post("/accept", acceptInvitation);

// 2. Administrator-Only Management Routes (RBAC Enforced)
router.use(protect, requireAdmin);
router.post("/", createInvitation);
router.get("/", getInvitations);
router.post("/:id/resend", resendInvitation);
router.patch("/:id/status", updateInvitationStatus);
router.delete("/:id", revokeInvitation);

export default router;
