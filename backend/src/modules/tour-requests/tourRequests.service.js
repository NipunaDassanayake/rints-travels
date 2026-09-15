const tourRequestsRepository = require("./tourRequests.repository");
const lifecycle = require("./tourRequests.lifecycle");
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

const updateStatus = async (tourRequestId, newStatus) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  if (!lifecycle.isTransitionAllowed(tourRequest.status, newStatus)) {
    throw new BadRequestError(
      `Cannot change tour request status from ${tourRequest.status} to ${newStatus}`,
    );
  }

  return tourRequestsRepository.transitionStatusTransaction({
    tourRequestId,
    from: lifecycle.allowedSourcesFor(newStatus),
    to: newStatus,
  });
};

// Tourist - cancel own tour request
const cancelOwnTourRequest = async (tourRequestId, touristId) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  if (tourRequest.touristId !== touristId) {
    throw new ForbiddenError(
      "You do not have permission to cancel this tour request",
    );
  }

  if (!lifecycle.isTransitionAllowed(tourRequest.status, "CANCELLED")) {
    throw new BadRequestError(
      `Cannot cancel a tour request with status ${tourRequest.status}`,
    );
  }

  return tourRequestsRepository.transitionStatusTransaction({
    tourRequestId,
    from: lifecycle.TOURIST_CANCEL.from,
    to: "CANCELLED",
  });
};

// Admin - list active admins that a tour request can be assigned to
const getAssignableAdmins = async () => {
  return authRepository.findActiveAdmins();
};

const adminEditTourRequest = async (tourRequestId, updateData) => {
  const tourRequest =
    await tourRequestsRepository.findTourRequestById(tourRequestId);

  if (!tourRequest) {
    throw new NotFoundError("Tour request not found");
  }

  if (!lifecycle.ADMIN_EDIT_ALLOWED.includes(tourRequest.status)) {
    throw new BadRequestError(
      `Cannot edit a tour request with status ${tourRequest.status}`,
    );
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

  if (updateData.preferredGuideId !== undefined) {
    await validatePreferredGuide(updateData.preferredGuideId);
  }

  return tourRequestsRepository.adminEditTransaction({
    tourRequestId,
    allowed: lifecycle.ADMIN_EDIT_ALLOWED,
    data: updateData,
  });
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
  cancelOwnTourRequest,
  getAssignableAdmins,
  adminEditTourRequest,
};
