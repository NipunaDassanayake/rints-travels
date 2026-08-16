const packageInclude = {
  images: {
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        displayOrder: "asc",
      },
      {
        id: "asc",
      },
    ],
  },

  itineraries: {
    orderBy: {
      dayNumber: "asc",
    },
  },

  inclusions: {
    orderBy: {
      id: "asc",
    },
  },

  exclusions: {
    orderBy: {
      id: "asc",
    },
  },

  faqs: {
    orderBy: [
      {
        displayOrder: "asc",
      },
      {
        id: "asc",
      },
    ],
  },
};

module.exports = packageInclude;