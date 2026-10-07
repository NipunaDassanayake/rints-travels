const getPagination = require("../../core/pagination/getPagination");

const buildFilters = require("../../core/query/buildFilters");

const buildSorting = require("../../core/query/buildSorting");

const buildPackageQueryOptions = (query) => {
  const { page, limit, skip, take } = getPagination(query);

  const filters = buildFilters(query, {
    status: "equals",

    destination: "contains",

    title: "contains",
  });

  const orderBy = buildSorting(query, [
    "title",
    "destination",
    "durationDays",
    "price",
    "createdAt",
  ]);

  return {
    page,
    limit,
    skip,
    take,
    filters,
    orderBy,
  };
};

module.exports = {
  buildPackageQueryOptions,
};