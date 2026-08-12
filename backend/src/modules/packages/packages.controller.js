const packagesService = require("./packages.service");
const { sendSuccess } = require("../../utils/apiResponse");
const { NotFoundError } = require("../../utils/AppError");
const asyncHandler = require("../../utils/asyncHandler");
const HTTP_STATUS = require("../../core/constants/httpStatus");
const packageMapper = require("./packages.mapper");

const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await packagesService.getAllPackages(req.query);

  return sendSuccess(res, "Travel packages retrieved successfully", packages);
});

const createPackage = asyncHandler(async (req, res) => {
  const packageDto = packageMapper.toCreatePackageDto(req.body);

  const createdPackage = await packagesService.createPackage(packageDto);
  const response = packageMapper.toPackageResponseDto(createdPackage);

  return sendSuccess(
    res,
    "Travel package created successfully",
    response,
    HTTP_STATUS.CREATED,
  );
});

const getPackageById = asyncHandler(async (req, res) => {
  const travelPackage = await packagesService.getPackageById(req.params.id);
  const response = packageMapper.toPackageResponseDto(travelPackage);

  if (!travelPackage) {
    throw new NotFoundError("Travel package not found");
  }

  return sendSuccess(res, "Travel package retrieved successfully", response);
});

const updatePackage = asyncHandler(async (req, res) => {
  const packageDto = packageMapper.toUpdatePackageDto(req.body);

  const updatedPackage = await packagesService.updatePackage(
    req.params.id,
    packageDto,
  );

  const response = packageMapper.toPackageResponseDto(updatedPackage);
  return sendSuccess(res, "Travel package updated successfully", response);
});

const deletePackage = asyncHandler(async (req, res) => {
  await packagesService.deletePackage(req.params.id);

  return sendSuccess(res, "Travel package deleted successfully");
});


// Package Images
const addPackageImage = asyncHandler(async (req, res) => {
  const createdImage = await packagesService.addPackageImage(
    req.params.packageId,
    req.body
  );

  return sendSuccess(
    res,
    "Package image added successfully",
    createdImage,
    HTTP_STATUS.CREATED
  );
});

const updatePackageImage = asyncHandler(async (req, res) => {
  const updatedImage = await packagesService.updatePackageImage(
    req.params.packageId,
    req.params.imageId,
    req.body
  );

  return sendSuccess(
    res,
    "Package image updated successfully",
    updatedImage
  );
});

const deletePackageImage = asyncHandler(async (req, res) => {
  await packagesService.deletePackageImage(
    req.params.packageId,
    req.params.imageId
  );

  return sendSuccess(
    res,
    "Package image deleted successfully"
  );
});

// Package Itineraries
const addPackageItinerary = asyncHandler(async (req, res) => {
  const itinerary =
    await packagesService.addPackageItinerary(
      req.params.packageId,
      req.body
    );

  return sendSuccess(
    res,
    "Package itinerary added successfully",
    itinerary,
    HTTP_STATUS.CREATED
  );
});

const updatePackageItinerary = asyncHandler(async (req, res) => {
  const itinerary =
    await packagesService.updatePackageItinerary(
      req.params.packageId,
      req.params.itineraryId,
      req.body
    );

  return sendSuccess(
    res,
    "Package itinerary updated successfully",
    itinerary
  );
});

const deletePackageItinerary = asyncHandler(async (req, res) => {
  await packagesService.deletePackageItinerary(
    req.params.packageId,
    req.params.itineraryId
  );

  return sendSuccess(
    res,
    "Package itinerary deleted successfully"
  );
});

// Package Inclusions
const addPackageInclusion = asyncHandler(async (req, res) => {
  const inclusion =
    await packagesService.addPackageInclusion(
      req.params.packageId,
      req.body
    );

  return sendSuccess(
    res,
    "Package inclusion added successfully",
    inclusion,
    HTTP_STATUS.CREATED
  );
});

const updatePackageInclusion = asyncHandler(async (req, res) => {
  const inclusion =
    await packagesService.updatePackageInclusion(
      req.params.packageId,
      req.params.inclusionId,
      req.body
    );

  return sendSuccess(
    res,
    "Package inclusion updated successfully",
    inclusion
  );
});

const deletePackageInclusion = asyncHandler(async (req, res) => {
  await packagesService.deletePackageInclusion(
    req.params.packageId,
    req.params.inclusionId
  );

  return sendSuccess(
    res,
    "Package inclusion deleted successfully"
  );
});


// Package Exclusions
const addPackageExclusion = asyncHandler(async (req, res) => {
  const exclusion =
    await packagesService.addPackageExclusion(
      req.params.packageId,
      req.body
    );

  return sendSuccess(
    res,
    "Package exclusion added successfully",
    exclusion,
    HTTP_STATUS.CREATED
  );
});

const updatePackageExclusion = asyncHandler(async (req, res) => {
  const exclusion =
    await packagesService.updatePackageExclusion(
      req.params.packageId,
      req.params.exclusionId,
      req.body
    );

  return sendSuccess(
    res,
    "Package exclusion updated successfully",
    exclusion
  );
});

const deletePackageExclusion = asyncHandler(async (req, res) => {
  await packagesService.deletePackageExclusion(
    req.params.packageId,
    req.params.exclusionId
  );

  return sendSuccess(
    res,
    "Package exclusion deleted successfully"
  );
});


// Package FAQs
const addPackageFaq = asyncHandler(async (req, res) => {
  const faq = await packagesService.addPackageFaq(
    req.params.packageId,
    req.body
  );

  return sendSuccess(
    res,
    "Package FAQ added successfully",
    faq,
    HTTP_STATUS.CREATED
  );
});

const updatePackageFaq = asyncHandler(async (req, res) => {
  const faq = await packagesService.updatePackageFaq(
    req.params.packageId,
    req.params.faqId,
    req.body
  );

  return sendSuccess(
    res,
    "Package FAQ updated successfully",
    faq
  );
});

const deletePackageFaq = asyncHandler(async (req, res) => {
  await packagesService.deletePackageFaq(
    req.params.packageId,
    req.params.faqId
  );

  return sendSuccess(
    res,
    "Package FAQ deleted successfully"
  );
});


const getPackageBySlug = asyncHandler(async (req, res) => {
  const travelPackage =
    await packagesService.getPackageBySlug(
      req.params.slug
    );

  const response =
    packageMapper.toPackageResponseDto(
      travelPackage
    );

  return sendSuccess(
    res,
    "Travel package retrieved successfully",
    response
  );
});

module.exports = {
  getAllPackages,
  createPackage,
  getPackageById,
  getPackageBySlug,
  updatePackage,
  deletePackage,

  addPackageImage,
  updatePackageImage,
  deletePackageImage,

  addPackageItinerary,
  updatePackageItinerary,
  deletePackageItinerary,

  addPackageInclusion,
  updatePackageInclusion,
  deletePackageInclusion,

  addPackageExclusion,
  updatePackageExclusion,
  deletePackageExclusion,

  addPackageFaq,
  updatePackageFaq,
  deletePackageFaq,
};
