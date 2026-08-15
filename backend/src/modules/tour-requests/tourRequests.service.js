const tourRequestsRepository = require("./tourRequests.repository");
const packagesRepository = require("../packages/packages.repository");
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../../utils/AppError");
const authRepository = require("../auth/repositories/auth.repository");
const tourGuidesRepository = require("../tour-guides/tourGuides.repository");

const {
  USER_ROLES,
  USER_STATUS,
} = require("../../core/constants/auth.constants");

const createPackageBasedRequest = async (touristId, requestData) => {
  const travelPackage = await packagesRepository.findPackageById(
    requestData.packageId,
  );

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  await validatePreferredGuide(requestData.preferredGuideId);

  return tourRequestsRepository.createTourRequest({
    touristId,
    packageId: requestData.packageId,
    requestType: "PACKAGE_BASED",

    preferredStartDate: requestData.preferredStartDate,
    preferredEndDate: requestData.preferredEndDate,

    adultCount: requestData.adultCount,
    childCount: requestData.childCount,

    budget: requestData.budget,
    currency: requestData.currency,

    preferredGuideId: requestData.preferredGuideId,

    hotelPreference: requestData.hotelPreference,
    transportPreference: requestData.transportPreference,
    specialRequirements: requestData.specialRequirements,

    contactMethod: requestData.contactMethod,

    status: "PENDING_REVIEW",
  });
};

const createCustomRequest = async (touristId, requestData) => {
  await validatePreferredGuide(requestData.preferredGuideId);

  return tourRequestsRepository.createTourRequest({
    touristId,
    packageId: null,
    requestType: "CUSTOM",

    title: requestData.title,

    preferredStartDate: requestData.preferredStartDate,
    preferredEndDate: requestData.preferredEndDate,

    adultCount: requestData.adultCount,
    childCount: requestData.childCount,

    destinationPreferences: requestData.destinationPreferences,

    budget: requestData.budget,
    currency: requestData.currency,

    preferredGuideId: requestData.preferredGuideId,

    hotelPreference: requestData.hotelPreference,
    transportPreference: requestData.transportPreference,
    specialRequirements: requestData.specialRequirements,

    contactMethod: requestData.contactMethod,

    status: "PENDING_REVIEW",
  });
};

const getMyTourRequests = async (touristId) => {
  return tourRequestsRepository.findTourRequestsByTouristId(touristId);
};

const getTourRequestById = async (id, currentUser) => {
  const tourRequest = await tourRequestsRepository.findTourRequestById(id);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const isOwner = tourRequest.touristId === currentUser.id;

  const isAdmin =
    currentUser.role === "ADMIN" || currentUser.role === "SYSTEM_ADMIN";

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      "You do not have permission to view this tour request",
    );
  }

  return tourRequest;
};

// Additional function to get all tour requests with optional filters
const getAllTourRequests = async (query) => {
  return tourRequestsRepository.findAllTourRequests({
    status: query.status,
    requestType: query.requestType,
    touristId: query.touristId,
    assignedAdminId: query.assignedAdminId,
  });
};

// Additional function to assign an admin to a tour request
const assignAdmin = async (tourRequestId, adminId) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const admin = await authRepository.findUserById(adminId);

  if (
    !admin ||
    ![USER_ROLES.ADMIN, USER_ROLES.SYSTEM_ADMIN].includes(admin.role) ||
    admin.status !== USER_STATUS.ACTIVE
  ) {
    throw new NotFoundError("Active admin user not found");
  }

  return tourRequestsRepository.assignAdminToTourRequest(
    tourRequestId,
    adminId,
  );
};

// Define allowed status transitions for tour requests
const ALLOWED_STATUS_TRANSITIONS = {
  PENDING_REVIEW: ["UNDER_DISCUSSION", "REJECTED", "CANCELLED"],

  UNDER_DISCUSSION: ["READY_FOR_QUOTATION", "REJECTED", "CANCELLED"],

  READY_FOR_QUOTATION: ["UNDER_DISCUSSION", "CANCELLED"],

  QUOTATION_SENT: ["UNDER_DISCUSSION", "CANCELLED"],

  ACCEPTED: [],

  REJECTED: [],
  CANCELLED: [],
  BOOKED: [],
};

const updateStatus = async (tourRequestId, newStatus) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const allowedStatuses = ALLOWED_STATUS_TRANSITIONS[tourRequest.status] || [];

  if (!allowedStatuses.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot change tour request status from ${tourRequest.status} to ${newStatus}`,
    );
  }

  return tourRequestsRepository.updateTourRequestStatus(
    tourRequestId,
    newStatus,
  );
};

const adminEditTourRequest = async (tourRequestId, updateData) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  const startDate =
    updateData.preferredStartDate ?? tourRequest.preferredStartDate;

  const endDate =
    updateData.preferredEndDate !== undefined
      ? updateData.preferredEndDate
      : tourRequest.preferredEndDate;

  if (endDate && new Date(endDate) < new Date(startDate)) {
    throw new BadRequestError(
      "Preferred end date cannot be before preferred start date",
    );
  }

  return tourRequestsRepository.updateTourRequest(tourRequestId, updateData);
};

const validatePreferredGuide = async (preferredGuideId) => {
  if (!preferredGuideId) {
    return;
  }

  const guide = await tourGuidesRepository.findTourGuideById(preferredGuideId);

  if (!guide || !guide.isAvailable) {
    throw new NotFoundError("Available preferred tour guide not found");
  }
};

module.exports = {
  createPackageBasedRequest,
  createCustomRequest,
  getMyTourRequests,
  getTourRequestById,
  getAllTourRequests,
  assignAdmin,
  updateStatus,
  adminEditTourRequest,
};
