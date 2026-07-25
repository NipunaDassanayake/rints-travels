const toCreatePackageDto = (body) => {
  return {
    title: body.title,
    slug: body.slug,
    destination: body.destination,
    description: body.description,
    durationDays: body.durationDays,
    price: body.price,
    status: body.status,
  };
};

const toUpdatePackageDto = (body) => {
  return {
    title: body.title,
    slug: body.slug,
    destination: body.destination,
    description: body.description,
    durationDays: body.durationDays,
    price: body.price,
    status: body.status,
  };
};

const toPackageResponseDto = (travelPackage) => {
  if (!travelPackage) return null;

  return {
    id: travelPackage.id,
    title: travelPackage.title,
    slug: travelPackage.slug,
    destination: travelPackage.destination,
    description: travelPackage.description,
    durationDays: travelPackage.durationDays,
    price: travelPackage.price,
    status: travelPackage.status,
    images: travelPackage.images || [],
    itineraries: travelPackage.itineraries || [],
    inclusions: travelPackage.inclusions || [],
    exclusions: travelPackage.exclusions || [],
    faqs: travelPackage.faqs || [],
    createdAt: travelPackage.createdAt,
    updatedAt: travelPackage.updatedAt,
  };
};

module.exports = {
  toCreatePackageDto,
  toUpdatePackageDto,
  toPackageResponseDto,
};