export function resolveSlideContext(question, currentPage, totalPages) {
  const match = String(question).match(/\b(?:slide|trang)\s+(\d+)\b/i);
  const explicit = Boolean(match);
  const pageNumber = explicit ? Number(match[1]) : currentPage;
  return {
    pageNumber,
    explicit,
    valid: Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages,
  };
}
