const paymentsService =
  require("./payments.service");

const asyncHandler =
  require("../../utils/asyncHandler");

const {
  sendSuccess,
} = require("../../utils/apiResponse");

const HTTP_STATUS =
  require("../../core/constants/httpStatus");

const initiatePayment = asyncHandler(
  async (req, res) => {
    const payment =
      await paymentsService.initiatePayment(
        req.user.id,
        req.body
      );

    return sendSuccess(
      res,
      "Payment initiated successfully",
      payment,
      HTTP_STATUS.CREATED
    );
  }
);

const getMyPayments = asyncHandler(
  async (req, res) => {
    const payments =
      await paymentsService.getMyPayments(
        req.user.id
      );

    return sendSuccess(
      res,
      "Payments retrieved successfully",
      payments
    );
  }
);

const getPaymentById = asyncHandler(
  async (req, res) => {
    const payment =
      await paymentsService.getPaymentById(
        req.params.id,
        req.user
      );

    return sendSuccess(
      res,
      "Payment retrieved successfully",
      payment
    );
  }
);

const markPaymentSuccessful = asyncHandler(
  async (req, res) => {
    const payment =
      await paymentsService.markPaymentSuccessful(
        req.params.id,
        req.body.gatewayReference
      );

    return sendSuccess(
      res,
      "Payment completed successfully",
      payment
    );
  }
);

const markPaymentFailed = asyncHandler(
  async (req, res) => {
    const payment =
      await paymentsService.markPaymentFailed(
        req.params.id,
        req.body
      );

    return sendSuccess(
      res,
      "Payment marked as failed",
      payment
    );
  }
);

module.exports = {
  initiatePayment,
  getMyPayments,
  getPaymentById,
  markPaymentSuccessful,
  markPaymentFailed,
};