import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "../config/config.js";
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import teamRoutes from "../routes/team.routes.js";
import projectRoutes from "../routes/project.routes.js";
import taskRoutes from "../routes/task.routes.js";
import notificationRoutes from "../routes/notification.routes.js";
import mediaRoutes from "../routes/media.routes.js";
import imagekitRoutes from "../routes/imagekit.routes.js";
import invitationRoutes from "../routes/invitation.routes.js";
import { helmet } from "../middlewares/helmet.middleware.js";
import {
  notFoundHandler,
  errorHandler,
} from "../middlewares/error.middleware.js";

// 1. Initialize Express App
const app = express();

// Configure trust proxy (SEC-10) and remove framework fingerprint
app.set("trust proxy", 1);
app.disable("x-powered-by");

// 2. Middlewares
app.use(helmet());
const isProduction =
  process.env.NODE_ENV === "production" || config.NODE_ENV === "production";

// Configure allowed origins based on CLIENT_URL from config and localhost in dev
const allowedOrigins = [
  config.CLIENT_URL?.replace(/\/+$/, ""),
  ...(!isProduction ? ["http://localhost:5173"] : []),
].filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        uniqueAllowedOrigins.includes(origin) ||
        uniqueAllowedOrigins.includes(origin.replace(/\/+$/, ""))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }),
);
app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || "10mb" }));
app.use(cookieParser());

// 3. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/imagekit", imagekitRoutes);
app.use("/api/invitations", invitationRoutes);

// 4. Test & Health Check Routes
app.get("/", (req, res) => {
  res.send("AgentraZira Backend API is running!");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "Server is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// 5. Centralized Error Handling Middlewares (Must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
