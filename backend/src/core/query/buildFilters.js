const buildFilters = (query, filterConfig) => {
  const filters = {};

  Object.entries(filterConfig).forEach(([field, type]) => {
    const value = query[field];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }
//insensitive means that the search will be case-insensitive, so it will match values regardless of their case (uppercase or lowercase).
    switch (type) {
      case "equals":
        filters[field] = value;
        break;

      case "contains":
        filters[field] = {
          contains: value,
          mode: "insensitive",
        };
        break;

      case "number":
        filters[field] = Number(value);
        break;

      default:
        break;
    }
  });

  return filters;
};

module.exports = buildFilters;