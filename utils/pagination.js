// utils/pagination.js

export const getPagination = (query) => {
  const { page, limit } = query;

  if (
    typeof page !== "string" ||
    typeof limit !== "string" ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(limit)
  ) {
    return {
      error: "Both page and limit must be positive integers.",
    };
  }

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (
    !Number.isSafeInteger(parsedPage) ||
    !Number.isSafeInteger(parsedLimit) ||
    parsedLimit > 50
  ) {
    return {
      error:
        "Page must be a safe positive integer and limit must be between 1 and 50.",
    };
  }

  const offset = (parsedPage - 1) * parsedLimit;

  if (!Number.isSafeInteger(offset)) {
    return {
      error: "Page value is too large.",
    };
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset,
  };
};