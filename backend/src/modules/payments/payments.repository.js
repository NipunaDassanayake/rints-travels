const prisma = require("../../config/prisma");

const paymentInclude = {
  quotation: {
    include: {
      tourRequest: true,
      guide: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  },
  tourist: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

const createPayment = async (data) => {
  return prisma.payment.create({
    data,
    include: paymentInclude,
  });
};

const findPaymentById = async (id) => {
  return prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentInclude,
  });
};

const findPaymentsByTouristId = async (touristId) => {
  return prisma.payment.findMany({
    where: {
      touristId,
    },
    include: paymentInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findSuccessfulPaymentByQuotationId = async (
  quotationId
) => {
  return prisma.payment.findFirst({
    where: {
      quotationId,
      status: "SUCCESS",
    },
    include: paymentInclude,
  });
};

const findActivePaymentByQuotationId = async (
  quotationId
) => {
  return prisma.payment.findFirst({
    where: {
      quotationId,
      status: {
        in: ["PENDING", "PROCESSING"],
      },
    },
    include: paymentInclude,
  });
};

const updatePaymentStatus = async (
  id,
  data
) => {
  return prisma.payment.update({
    where: {
      id,
    },
    data,
    include: paymentInclude,
  });
};

module.exports = {
  createPayment,
  findPaymentById,
  findPaymentsByTouristId,
  findSuccessfulPaymentByQuotationId,
  findActivePaymentByQuotationId,
  updatePaymentStatus,
};