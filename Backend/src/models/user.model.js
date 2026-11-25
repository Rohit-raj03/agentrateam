import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: [6, "Password must be at least 6 characters long"],
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "member"],
      default: "member",
    },

    jobTitle: {
      type: String,
      default: "Team Member",
    },

    jobDescription: {
      type: String,
      default: "",
      trim: true,
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    responsibility: {
      type: String,
      default: "",
      trim: true,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    phone: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          return !v || (v.length >= 10 && v.length <= 15);
        },
        message: "Phone number must be between 10 and 15 digits",
      },
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "Remote",
    },

    timezone: {
      type: String,
      default: "UTC (GMT+0:00)",
    },

    avatar: {
      type: String,
      default: "",
    },

    avatarFileId: {
      type: String,
      default: "",
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "revoked"],
      default: "approved",
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    refreshToken: {
      type: String,
      default: "",
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Derive account access status from isActive and approvalStatus so 'status' is reserved for future presence
userSchema.virtual("status").get(function () {
  if (!this.isActive) return "inactive";
  if (this.approvalStatus === "pending") return "pending";
  if (this.approvalStatus === "revoked") return "revoked";
  return "active";
});

// Hash password with bcrypt before saving (only if modified and present)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password for login verification
userSchema.methods.comparePassword = function (plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

// Automatically omit sensitive credentials when serializing to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
