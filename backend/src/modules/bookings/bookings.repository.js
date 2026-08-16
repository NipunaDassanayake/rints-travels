const prisma = require("../../config/prisma");

const bookingInclude = {
  tourRequest: true,

  quotation: {
    include: {
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

      itineraries: {
        orderBy: {
          dayNumber: "asc",
        },
      },

      inclusions: true,

      exclusions: true,
    },
  },

  payment: true,

  tourist: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

const findBookingByPaymentId = async (paymentId) => {
  return prisma.booking.findUnique({
    where: {
      paymentId,
    },

    include: bookingInclude,
  });
};

const findBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: {
      id,
    },

    include: bookingInclude,
  });
};

const findBookingsByTouristId = async (touristId) => {
  return prisma.booking.findMany({
    where: {
      touristId,
    },

    include: bookingInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Admin - Find all bookings
 *
 * Optional filters:
 * - status
 * - touristId
 */
const findAllBookings = async ({ status, touristId } = {}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (touristId) {
    where.touristId = touristId;
  }

  return prisma.booking.findMany({
    where,

    include: bookingInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Admin - Update booking lifecycle status
 */
const updateBookingStatus = async (id, status) => {
  const data = {
    status,
  };

  /**
   * Keep lifecycle timestamps
   * synchronized with booking status.
   */
  if (status === "IN_PROGRESS") {
    data.completedAt = null;

    data.cancelledAt = null;
  }

  if (status === "COMPLETED") {
    data.completedAt = new Date();

    data.cancelledAt = null;
  }

  if (status === "CANCELLED") {
    data.cancelledAt = new Date();

    data.completedAt = null;
  }

  return prisma.booking.update({
    where: {
      id,
    },

    data,

    include: bookingInclude,
  });
};

const confirmBookingFromPayment = async ({ paymentId, bookingReference }) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        id: paymentId,
      },

      include: {
        quotation: {
          include: {
            tourRequest: true,
          },
        },
      },
    });

    if (!payment) {
      return null;
    }

    const existingBooking = await tx.booking.findUnique({
      where: {
        paymentId,
      },

      include: bookingInclude,
    });

    if (existingBooking) {
      return existingBooking;
    }

    if (payment.status !== "SUCCESS") {
      return null;
    }

    const quotation = payment.quotation;

    const tourRequest = quotation.tourRequest;

    const booking = await tx.booking.create({
      data: {
        tourRequestId: tourRequest.id,

        quotationId: quotation.id,

        paymentId: payment.id,

        touristId: payment.touristId,

        bookingReference,

        status: "CONFIRMED",

        startDate: quotation.startDate,

        endDate: quotation.endDate,

        totalAmount: payment.amount,

        currency: payment.currency,

        confirmedAt: new Date(),
      },
    });

    await tx.tourRequest.update({
      where: {
        id: tourRequest.id,
      },

      data: {
        status: "BOOKED",
      },
    });

    return tx.booking.findUnique({
      where: {
        id: booking.id,
      },

      include: bookingInclude,
    });
  });
};

module.exports = {
  findBookingByPaymentId,
  findBookingById,
  findBookingsByTouristId,
  findAllBookings,
  updateBookingStatus,
  confirmBookingFromPayment,
};