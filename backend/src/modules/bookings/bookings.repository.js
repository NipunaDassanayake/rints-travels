const prisma = require("../../config/prisma");

/**
 * =========================================================
 * Shared Booking Include
 * =========================================================
 */

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

/**
 * =========================================================
 * Find Booking
 * =========================================================
 */

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

/**
 * =========================================================
 * Tourist Bookings
 * =========================================================
 */

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
 * =========================================================
 * Tour Guide - Assigned Bookings
 * =========================================================
 *
 * req.user.id is the User ID.
 *
 * The booking stores the assigned guide through:
 *
 * Booking
 *   -> quotation
 *      -> guide
 *         -> userId
 */

const findBookingsByGuideUserId = async (userId) => {
  return prisma.booking.findMany({
    where: {
      quotation: {
        guide: {
          userId,
        },
      },
    },

    include: bookingInclude,

    orderBy: [
      {
        startDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

/**
 * =========================================================
 * Admin - All Bookings
 * =========================================================
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
 * =========================================================
 * Admin - Update Booking Status
 * =========================================================
 */

const updateBookingStatus = async (id, status) => {
  const data = {
    status,
  };

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

/**
 * =========================================================
 * Admin - Assign Guide To Booking
 * =========================================================
 *
 * Guide assignment is currently stored on:
 *
 * TourQuotation.guideId
 */

const assignGuideToBooking = async (bookingId, guideId) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      select: {
        id: true,
        quotationId: true,
      },
    });

    if (!booking) {
      return null;
    }

    await tx.tourQuotation.update({
      where: {
        id: booking.quotationId,
      },

      data: {
        guideId,
      },
    });

    return tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: bookingInclude,
    });
  });
};

/**
 * =========================================================
 * Check Guide Booking Conflict
 * =========================================================
 */

const findGuideBookingConflict = async ({
  guideId,
  startDate,
  endDate,
  excludeBookingId,
}) => {
  return prisma.booking.findFirst({
    where: {
      ...(excludeBookingId
        ? {
            id: {
              not: excludeBookingId,
            },
          }
        : {}),

      status: {
        in: ["CONFIRMED", "IN_PROGRESS"],
      },

      quotation: {
        guideId,
      },

      startDate: {
        lte: endDate,
      },

      endDate: {
        gte: startDate,
      },
    },

    include: bookingInclude,
  });
};

/**
 * =========================================================
 * Create Booking From Successful Payment
 * =========================================================
 */

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
  findBookingsByGuideUserId,

  findAllBookings,

  updateBookingStatus,

  assignGuideToBooking,
  findGuideBookingConflict,

  confirmBookingFromPayment,
};