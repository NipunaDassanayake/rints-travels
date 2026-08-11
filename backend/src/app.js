const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const requestLogger = require("./middlewares/requestLogger");
const notFoundHandler = require("./middlewares/notFoundHandler");
const errorHandler = require("./middlewares/errorHandler");
const correlationId = require("./middlewares/correlationId");

const routes = require("./routes");
const { sendSuccess } = require("./utils/apiResponse");

const app = express();


 //credentials: true is required because the refresh token  is stored in an HttpOnly cookie.
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-Id",
    ],
  })
);

app.use(express.json());

app.use(cookieParser());

app.use(correlationId);

app.use(requestLogger);

/**
 * API routes
 */
app.use("/api", routes);

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  return sendSuccess(
    res,
    "Welcome to Rints Travels API"
  );
});

/**
 * Error handling
 */
app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;