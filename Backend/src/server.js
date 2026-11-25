import app from "./app/app.js";
import config from "./config/config.js";
import connectDB from "./config/db.js";
import { verifyTransporter } from "./services/email.service.js";

const startServer = async () => {
  try {
    await connectDB();

    // Diagnostic SMTP connection check during startup
    verifyTransporter()
      .then((res) => {
        if (res.connected) {
          console.log(`[SMTP] ${res.message}`);
        } else {
          console.warn(`[SMTP Diagnostic] ${res.message}`);
        }
      })
      .catch((err) => {
        console.warn(`[SMTP Diagnostic] Connection check failed: ${err.message}`);
      });

    app.listen(config.PORT, () => {
      console.log(`Server running on: http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
