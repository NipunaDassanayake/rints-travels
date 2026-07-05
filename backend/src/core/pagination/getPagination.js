const PAGINATION = require("../constants/pagination");

const getPagination = (query) => {
  const page = Math.max(
    Number(query.page) || PAGINATION.DEFAULT_PAGE,
    PAGINATION.DEFAULT_PAGE
  );

  const requestedLimit = Number(query.limit) || PAGINATION.DEFAULT_LIMIT;

  const limit = Math.min(
    Math.max(requestedLimit, 1),
    PAGINATION.MAX_LIMIT
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
};

module.exports = getPagination;