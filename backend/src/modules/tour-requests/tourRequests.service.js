const tourRequestsRepository = require("./tourRequests.repository");
const packagesRepository = require("../packages/packages.repository");
const { NotFoundError } = require("../../utils/AppError");


const createPackageBasedRequest = async (
  touristId,
  requestData
) => {
  const travelPackage =
    await packagesRepository.findPackageById(
      requestData.packageId
    );

  if (!travelPackage) {
    throw new NotFoundError(
      "Travel package not found"
    );
  }

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

const createCustomRequest = async (
  touristId,
  requestData
) => {
  return tourRequestsRepository.createTourRequest({
    touristId,
    packageId: null,
    requestType: "CUSTOM",

    title: requestData.title,

    preferredStartDate: requestData.preferredStartDate,
    preferredEndDate: requestData.preferredEndDate,

    adultCount: requestData.adultCount,
    childCount: requestData.childCount,

    destinationPreferences:
      requestData.destinationPreferences,

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

module.exports = {
  createPackageBasedRequest,
  createCustomRequest,
};