const tourGuidesRepository = require("./tourGuides.repository");

const { hashPassword } = require("../auth/helpers/auth.password");

const { ConflictError, NotFoundError } = require("../../utils/AppError");

const {
  USER_ROLES,
  USER_STATUS,
  AUTH_PROVIDERS,
} = require("../../core/constants/auth.constants");

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

// Additional functions to retrieve tour guides
const getAllTourGuides = async () => {
  return tourGuidesRepository.findAllTourGuides();
};

const getTourGuideById = async (id) => {
  const tourGuide = await tourGuidesRepository.findTourGuideById(id);

  if (!tourGuide) {
    throw new NotFoundError("Tour guide not found");
  }

  return tourGuide;
};

module.exports = {
  createTourGuide,
  getAllTourGuides,
  getTourGuideById,
};
