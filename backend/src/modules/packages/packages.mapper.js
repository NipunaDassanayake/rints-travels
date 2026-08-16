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
  const data = {};

  if (body.title !== undefined) {
    data.title = body.title;
  }

  if (body.slug !== undefined) {
    data.slug = body.slug;
  }

  if (body.destination !== undefined) {
    data.destination = body.destination;
  }

  if (body.description !== undefined) {
    data.description = body.description;
  }

  if (body.durationDays !== undefined) {
    data.durationDays = body.durationDays;
  }

  if (body.price !== undefined) {
    data.price = body.price;
  }

  if (body.status !== undefined) {
    data.status = body.status;
  }

  return data;
};

const toPackageResponseDto = (travelPackage) => {
  if (!travelPackage) {
    return null;
  }

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