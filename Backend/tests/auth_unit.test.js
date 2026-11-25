import assert from "node:assert";
import UserModel from "../src/models/user.model.js";

async function runTests() {
  console.log("Running Authentication Unit Tests...");

  // 1. Password required when googleId is missing
  const localUserWithoutPassword = new UserModel({
    name: "Alex Smith",
    email: "alex@example.com",
    isActive: true,
  });
  const valError = localUserWithoutPassword.validateSync();
  assert(
    valError && valError.errors["password"],
    "Validation must fail: password is required for local users"
  );
  console.log("✔ Local user requires password when googleId is absent");

  // 1b. Invited/created user has isActive true and approvalStatus pending (virtual status: pending)
  const invitedUser = new UserModel({
    name: "Invited Smith",
    email: "invited@example.com",
    password: "secureRandomPassword123!",
    isActive: true,
    approvalStatus: "pending",
  });
  const invitedValError = invitedUser.validateSync();
  assert(!invitedValError, "Invited user validation must succeed");
  assert.strictEqual(
    invitedUser.isActive,
    true,
    "Invited user must have isActive true"
  );
  assert.strictEqual(
    invitedUser.status,
    "pending",
    "Invited user must derive virtual status pending when approvalStatus is pending"
  );
  console.log("✔ Invited user validates with isActive true and derived status pending");

  // 2. Password NOT required when googleId is present
  const googleUser = new UserModel({
    name: "Google Alex",
    email: "alex.google@example.com",
    googleId: "google-sub-unique-12345",
    isEmailVerified: true,
  });
  const googleValError = googleUser.validateSync();
  assert(
    !googleValError,
    `Google user validation failed: ${googleValError?.message}`
  );
  console.log("✔ Google user validates without password");

  // 3. Password hashing via pre-save hook
  const testUser = new UserModel({
    name: "Hash Test User",
    email: "hash@example.com",
    password: "SecurePassword123!",
  });

  // Execute pre-save hook
  await new Promise((resolve, reject) => {
    testUser.schema.s.hooks.execPre("save", testUser, [testUser], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.notStrictEqual(
    testUser.password,
    "SecurePassword123!",
    "Password must be hashed with bcrypt"
  );
  assert(
    await testUser.comparePassword("SecurePassword123!"),
    "comparePassword must return true for correct password"
  );
  assert(
    !(await testUser.comparePassword("WrongPassword")),
    "comparePassword must return false for incorrect password"
  );
  console.log("✔ Password hashing and comparePassword work correctly");

  // 4. toJSON strips sensitive fields
  testUser.refreshToken = "sample-secret-refresh-token";
  testUser.resetPasswordToken = "sample-reset-token";
  const jsonUser = testUser.toJSON();

  assert.strictEqual(
    jsonUser.password,
    undefined,
    "toJSON must strip password"
  );
  assert.strictEqual(
    jsonUser.refreshToken,
    undefined,
    "toJSON must strip refreshToken"
  );
  assert.strictEqual(
    jsonUser.resetPasswordToken,
    undefined,
    "toJSON must strip resetPasswordToken"
  );
  console.log("✔ toJSON strips sensitive credentials");

  // 5. SEC-01: Public registration cannot self-escalate role
  const { register } = await import("../src/services/auth.service.js");
  const origFindOne = UserModel.findOne;
  const origCreate = UserModel.create;

  let capturedRole = null;
  UserModel.findOne = async () => null; // Email not taken
  UserModel.create = async (userData) => {
    capturedRole = userData.role;
    return {
      _id: "fake_id_123",
      role: userData.role,
      name: userData.name,
      email: userData.email,
      save: async () => {},
    };
  };

  try {
    await register({
      name: "Attacker Admin",
      email: "attacker@example.com",
      password: "password123",
      role: "admin",
    });

    assert.strictEqual(
      capturedRole,
      "member",
      "SEC-01: Public registration must ignore 'role: admin' and force 'member'"
    );
    console.log("✔ SEC-01: Public registration role escalation is blocked");
  } finally {
    UserModel.findOne = origFindOne;
    UserModel.create = origCreate;
  }

  // 6. BUG-05: Logout clears refreshToken in DB even when called without protect middleware
  const { logoutUser } = await import("../src/controllers/auth.controller.js");
  const { generateRefreshToken } = await import("../src/utils/generateToken.js");

  const sampleUserId = "507f1f77bcf86cd799439099";
  const sampleToken = generateRefreshToken(sampleUserId);

  let updatedUserId = null;
  let updateFields = null;
  const origFindByIdAndUpdate = UserModel.findByIdAndUpdate;

  UserModel.findByIdAndUpdate = async (uid, fields) => {
    updatedUserId = uid;
    updateFields = fields;
    return {};
  };

  try {
    let clearedCookie = null;
    const req = {
      user: undefined, // Simulating unauthenticated / public request
      cookies: { refreshToken: sampleToken },
      headers: {},
    };
    const res = {
      clearCookie: (name) => {
        clearedCookie = name;
      },
      status: (code) => ({
        json: (data) => ({ code, data }),
      }),
    };

    await logoutUser(req, res);

    assert.strictEqual(
      updatedUserId?.toString(),
      sampleUserId,
      "BUG-05: User ID must be extracted from refreshToken cookie"
    );
    assert.deepStrictEqual(
      updateFields,
      { refreshToken: "" },
      "BUG-05: refreshToken must be cleared in database"
    );
    assert.strictEqual(
      clearedCookie,
      "refreshToken",
      "BUG-05: refreshToken cookie must be cleared on response"
    );
    console.log("✔ BUG-05: Logout properly invalidates refreshToken in database and clears cookie");
  } finally {
    UserModel.findByIdAndUpdate = origFindByIdAndUpdate;
  }

  // 7. SEC-05: generateAccessToken / generateRefreshToken throw when secrets are missing
  const { generateAccessToken } = await import("../src/utils/generateToken.js");
  const configModule = await import("../src/config/config.js");
  const origAccessSecret = configModule.config.ACCESS_TOKEN_SECRET;
  const origEnvAccessSecret = process.env.ACCESS_TOKEN_SECRET;

  try {
    delete configModule.config.ACCESS_TOKEN_SECRET;
    delete process.env.ACCESS_TOKEN_SECRET;

    assert.throws(
      () => generateAccessToken({ _id: sampleUserId }),
      /JWT ACCESS_TOKEN_SECRET is not configured/,
      "SEC-05: generateAccessToken must throw if secret is missing"
    );
    console.log("✔ SEC-05: Hardcoded fallback JWT secrets successfully removed (fails fast)");
  } finally {
    configModule.config.ACCESS_TOKEN_SECRET = origAccessSecret;
    process.env.ACCESS_TOKEN_SECRET = origEnvAccessSecret;
  }

  // 8. SEC-11: forgotPassword never leaks resetToken when in production environment
  const { forgotPassword } = await import("../src/controllers/auth.controller.js");
  const origNodeEnv = configModule.config.NODE_ENV;
  const origFindOneUser = UserModel.findOne;

  UserModel.findOne = async () => ({
    _id: sampleUserId,
    email: "user@example.com",
    save: async () => {},
  });

  try {
    configModule.config.NODE_ENV = "production";

    let resData = null;
    const req = { body: { email: "user@example.com" } };
    const res = {
      status: () => ({
        json: (payload) => {
          resData = payload;
          return payload;
        },
      }),
    };

    await forgotPassword(req, res);
    assert.strictEqual(resData.success, true);
    assert.strictEqual(
      resData.resetToken,
      undefined,
      "SEC-11: resetToken must NOT be present in production response"
    );
    assert.strictEqual(
      resData.resetUrl,
      undefined,
      "SEC-11: resetUrl must NOT be present in production response"
    );
    console.log("✔ SEC-11: forgotPassword does not leak resetToken in production");
  } finally {
    configModule.config.NODE_ENV = origNodeEnv;
    UserModel.findOne = origFindOneUser;
  }

  // 9. Google Login Pending Approval & cleanEmail verification
  const { loginWithGoogle } = await import("../src/services/auth.service.js");
  const { googleAuthClient } = await import("../src/services/google-auth.service.js");
  const origVerifyIdToken = googleAuthClient.verifyIdToken;
  const origUserCreate = UserModel.create;

  googleAuthClient.verifyIdToken = async () => ({
    getPayload: () => ({
      name: "New Google User",
      email: "newgoogle@example.com",
      email_verified: true,
      sub: "gid-9999",
      picture: "https://example.com/avatar.png",
    }),
  });

  UserModel.findOne = async () => null;
  let createdGoogleUser = null;
  UserModel.create = async (doc) => {
    createdGoogleUser = {
      _id: "google_user_id_123",
      ...doc,
    };
    return createdGoogleUser;
  };

  try {
    await assert.rejects(
      () => loginWithGoogle("fake-google-credential"),
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, "PENDING_APPROVAL");
        return true;
      },
      "loginWithGoogle must reject new user with PENDING_APPROVAL"
    );
    assert.strictEqual(createdGoogleUser.email, "newgoogle@example.com");
    assert.strictEqual(createdGoogleUser.approvalStatus, "pending");
    assert.strictEqual(createdGoogleUser.isActive, true);
    console.log("✔ New Google user registration assigns PENDING_APPROVAL and blocks login until approved");
  } finally {
    googleAuthClient.verifyIdToken = origVerifyIdToken;
    UserModel.create = origUserCreate;
    UserModel.findOne = origFindOneUser;
  }

  console.log("\nALL AUTH UNIT TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runTests().catch((err) => {
  console.error("❌ UNIT TEST FAILED:", err);
  process.exit(1);
});

