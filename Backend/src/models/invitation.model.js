import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: [true, "Invitee name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Invitee email is required"],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "manager", "member"],
        message: "Invitation role must be 'admin', 'manager', or 'member'",
      },
      default: "member",
    },
    jobTitle: {
      type: String,
      trim: true,
      default: "Team Member",
    },
    jobProfile: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "cancelled", "expired", "revoked"],
        message: "Status must be pending, accepted, cancelled, expired, or revoked",
      },
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ userId: 1 });

/**
 * Check whether the invitation has exceeded its expiration time
 */
invitationSchema.methods.isExpired = function () {
  if (this.status === "expired") return true;
  return Boolean(this.expiresAt && new Date() > this.expiresAt);
};

/**
 * Check whether the invitation can currently be accepted
 */
invitationSchema.methods.canBeAccepted = function () {
  return this.status === "pending" && !this.isExpired();
};

/**
 * Never leak tokenHash when converting invitation document to JSON
 */
invitationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.tokenHash;
  return obj;
};

// Check if model already compiled to prevent recompilation in watch/test modes
const Invitation =
  mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);

export default Invitation;
