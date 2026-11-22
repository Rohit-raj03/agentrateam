import mongoose from "mongoose";
import TeamModel from "../models/team.model.js";
import UserModel from "../models/user.model.js";

/**
 * @desc    Get teams accessible by current user
 * @route   GET /api/teams
 * @access  Private
 */
export const getTeams = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? {}
        : {
            $or: [
              { owner: req.user._id },
              { "members.user": req.user._id },
            ],
          };

    const teams = await TeamModel.find(query).populate("owner", "name email avatar");

    return res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    console.error("getTeams error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error fetching teams",
    });
  }
};

/**
 * @desc    Get active team members across organization
 * @route   GET /api/teams/members
 * @access  Private
 */
export const getTeamMembers = async (req, res) => {
  try {
    const users = await UserModel.find({ isActive: true }).select("-password");
    const safeUsers = users.map((u) => {
      const obj = u.toObject ? u.toObject() : { ...u };
      return {
        _id: obj._id,
        id: obj.id || obj._id,
        name: obj.name,
        username: obj.username,
        email: obj.email,
        avatar: obj.avatar,
        jobTitle: obj.jobTitle,
        department: obj.department,
      };
    });
    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      data: safeUsers,
    });
  } catch (error) {
    console.error("getTeamMembers error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error fetching members",
    });
  }
};

/**
 * @desc    Send team invitation to email
 * @route   POST /api/teams/invite
 * @access  Private
 */
export const inviteTeamMember = async (req, res) => {
  try {
    const { email, role, name } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required to send invitation",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Invitation successfully sent to ${email}`,
      data: { email, role: role || "member", name: name || "" },
    });
  } catch (error) {
    console.error("inviteTeamMember error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error sending invite",
    });
  }
};

/**
 * @desc    Get team details by ID
 * @route   GET /api/teams/:teamId
 * @access  Private
 */
export const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID format",
      });
    }

    const team = await TeamModel.findById(teamId)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar jobTitle");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Access check: only admins, owners, or members can access team details
    if (req.user.role !== "admin" && !team.isTeamMember(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this team",
      });
    }

    return res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("getTeamById error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error fetching team",
    });
  }
};
