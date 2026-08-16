const express = require("express");
const path = require("path");

const cors = require("cors");
const cookieParser = require("cookie-parser");

const requestLogger = require("./middlewares/requestLogger");
const notFoundHandler = require("./middlewares/notFoundHandler");
const errorHandler = require("./middlewares/errorHandler");
const correlationId = require("./middlewares/correlationId");

const routes = require("./routes");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();

/**
 * CORS
 *
 * credentials: true is required because the refresh token
 * is stored in an HttpOnly cookie.
 */
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-Id"],
  }),
);

app.use(express.json());

app.use(cookieParser());

app.use(correlationId);

app.use(requestLogger);

/**
 * =========================================================
 * Static uploaded files
 * =========================================================
 *
 * Example physical file:
 *
 * backend/uploads/packages/8-12345.jpg
 *
 * becomes publicly available at:
 *
 * http://localhost:5000/uploads/packages/8-12345.jpg
 *
 * IMPORTANT:
 * This must be BEFORE notFoundHandler.
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * =========================================================
 * API routes
 * =========================================================
 */
app.use("/api", routes);

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Rints Travels API");
});

/**
 * =========================================================
 * Error handling
 * =========================================================
 *
 * These must stay last.
 */
app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
