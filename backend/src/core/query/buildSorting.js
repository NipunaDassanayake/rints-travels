const buildSorting = (query, allowedFields, defaultSort = "createdAt") => {
  const sortBy = allowedFields.includes(query.sortBy)
    ? query.sortBy
    : defaultSort;

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return {
    [sortBy]: sortOrder,
  };
};

module.exports = buildSorting;