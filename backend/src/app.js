const express = require("express");
const path = require("path");

const cors = require("cors");
const cookieParser = require("cookie-parser");

const env = require("./config/env");

const requestLogger = require("./middlewares/requestLogger");
const notFoundHandler = require("./middlewares/notFoundHandler");
const errorHandler = require("./middlewares/errorHandler");
const correlationId = require("./middlewares/correlationId");

const routes = require("./routes");

const paymentsController = require("./modules/payments/payments.controller");

const { sendSuccess } = require("./utils/apiResponse");

const app = express();

/**
 * =========================================================
 * CORS
 * =========================================================
 *
 * credentials: true is required because the refresh token
 * is stored in an HttpOnly cookie.
 */
app.use(
  cors({
    origin: env.frontend.url,

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-Id",
      "Stripe-Signature",
    ],
  }),
);

/**
 * =========================================================
 * Stripe Webhook
 * =========================================================
 *
 * IMPORTANT:
 *
 * Stripe signature verification requires the ORIGINAL
 * unparsed request body.
 *
 * Therefore this route MUST be registered BEFORE:
 *
 * app.use(express.json())
 *
 * Do not move this below express.json().
 */
app.post(
  "/api/payments/stripe/webhook",
  express.raw({
    type: "application/json",
  }),
  paymentsController.handleStripeWebhook,
);

/**
 * =========================================================
 * Normal JSON Parsing
 * =========================================================
 *
 * All other application routes can use parsed JSON.
 */
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
 * API Routes
 * =========================================================
 */
app.use("/api", routes);

/**
 * =========================================================
 * Root Endpoint
 * =========================================================
 */
app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to Travora API");
});

/**
 * =========================================================
 * Error Handling
 * =========================================================
 *
 * These must stay last.
 */
app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;