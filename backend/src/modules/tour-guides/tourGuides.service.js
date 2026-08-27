const tourGuidesRepository = require("./tourGuides.repository");

const { hashPassword } = require("../auth/helpers/auth.password");

const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require("../../utils/AppError");

const {
  USER_ROLES,
  USER_STATUS,
  AUTH_PROVIDERS,
} = require("../../core/constants/auth.constants");

/**
 * =========================================================
 * Create Tour Guide
 * =========================================================
 */

const createTourGuide = async (data) => {
  const existingUser = await tourGuidesRepository.findUserByEmail(data.email);

  if (existingUser) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(data.password);

  return tourGuidesRepository.createTourGuide({
    userData: {
      firstName: data.firstName,

      lastName: data.lastName,

      email: data.email,

      phone: data.phone || null,

      passwordHash,

      role: USER_ROLES.TOUR_GUIDE,

      provider: AUTH_PROVIDERS.LOCAL,

      status: USER_STATUS.ACTIVE,

      isEmailVerified: true,
    },

    profileData: {
      bio: data.bio || null,

      experienceYears: data.experienceYears,

      languages: data.languages,

      specializations: data.specializations,

      location: data.location || null,

      dailyRate: data.dailyRate ?? null,

      isAvailable: data.isAvailable,
    },
  });
};

/**
 * =========================================================
 * Public - Available Guides
 * =========================================================
 */

const getAllTourGuides = async () => {
  return tourGuidesRepository.findAllPublicTourGuides();
};

/**
 * =========================================================
 * Admin - All Guides
 * =========================================================
 */

const getAdminTourGuides = async (query = {}) => {
  let isAvailable;

  if (query.isAvailable === "true") {
    isAvailable = true;
  }

  if (query.isAvailable === "false") {
    isAvailable = false;
  }

  return tourGuidesRepository.findAllAdminTourGuides({
    isAvailable,

    search: query.search?.trim() || undefined,
  });
};

/**
 * =========================================================
 * Get Guide By ID
 * =========================================================
 */

const getTourGuideById = async (id) => {
  const tourGuide = await tourGuidesRepository.findTourGuideById(id);

  if (!tourGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  return tourGuide;
};

/**
 * =========================================================
 * Update Guide
 * =========================================================
 */

const updateTourGuide = async (guideId, data) => {
  const existingGuide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!existingGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  const userData = {};

  const profileData = {};

  /**
   * User fields
   */

  if (data.firstName !== undefined) {
    userData.firstName = data.firstName;
  }

  if (data.lastName !== undefined) {
    userData.lastName = data.lastName;
  }

  if (data.phone !== undefined) {
    userData.phone = data.phone || null;
  }

  /**
   * Guide profile fields
   */

  if (data.bio !== undefined) {
    profileData.bio = data.bio || null;
  }

  if (data.experienceYears !== undefined) {
    profileData.experienceYears = data.experienceYears;
  }

  if (data.languages !== undefined) {
    profileData.languages = data.languages;
  }

  if (data.specializations !== undefined) {
    profileData.specializations = data.specializations;
  }

  if (data.location !== undefined) {
    profileData.location = data.location || null;
  }

  if (data.dailyRate !== undefined) {
    profileData.dailyRate = data.dailyRate;
  }

  const updatedGuide = await tourGuidesRepository.updateTourGuide(
    guideId,
    userData,
    profileData,
  );

  if (!updatedGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  return updatedGuide;
};

/**
 * =========================================================
 * Availability
 * =========================================================
 */

const updateTourGuideAvailability = async (guideId, isAvailable) => {
  const existingGuide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!existingGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  /**
   * A soft-deleted guide cannot be
   * reactivated through availability.
   */

  if (existingGuide.deletedAt) {
    throw new BadRequestError(
      "A deactivated tour guide cannot be made available",
    );
  }

  return tourGuidesRepository.updateTourGuideAvailability(guideId, isAvailable);
};

/**
 * =========================================================
 * Deactivate Guide
 * =========================================================
 */

const deleteTourGuide = async (guideId) => {
  const existingGuide = await tourGuidesRepository.findTourGuideById(guideId);

  if (!existingGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  /**
   * Do not deactivate a guide while they
   * still own an active booking.
   *
   * Historical completed/cancelled bookings
   * are preserved and do not block deactivation.
   */

  const activeBooking =
    await tourGuidesRepository.findActiveBookingByGuideId(guideId);

  if (activeBooking) {
    throw new ConflictError(
      `This guide cannot be deactivated while assigned to active booking ${activeBooking.bookingReference}`,
    );
  }

  const deactivatedGuide =
    await tourGuidesRepository.deactivateTourGuide(guideId);

  if (!deactivatedGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  return deactivatedGuide;
};

module.exports = {
  createTourGuide,

  getAllTourGuides,
  getAdminTourGuides,

  getTourGuideById,

  updateTourGuide,

  updateTourGuideAvailability,

  deleteTourGuide,
};