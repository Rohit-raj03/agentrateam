import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    logoFileId: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Team owner is required"],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member", "lead"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helpful helper to check if a user is an authorized admin/owner of this team (handles both unpopulated and populated documents)
teamSchema.methods.canManageTeam = function (userId, userRole) {
  if (userRole === "admin") return true;
  if (!userId) return false;
  const targetId = (userId._id || userId).toString();
  const ownerId = (this.owner?._id || this.owner)?.toString();
  if (ownerId && ownerId === targetId) return true;

  const member = (this.members || []).find((m) => {
    const memberId = (m.user?._id || m.user)?.toString();
    return memberId === targetId && (m.role === "admin" || m.role === "lead");
  });
  return Boolean(member);
};

// Helper to check if a user is a member or owner of this team
teamSchema.methods.isTeamMember = function (userId, userRole) {
  if (userRole === "admin") return true;
  if (!userId) return false;
  const targetId = (userId._id || userId).toString();
  const ownerId = (this.owner?._id || this.owner)?.toString();
  if (ownerId && ownerId === targetId) return true;

  return (this.members || []).some(
    (m) => (m.user?._id || m.user)?.toString() === targetId
  );
};

const TeamModel = mongoose.model("Team", teamSchema);

export default TeamModel;

