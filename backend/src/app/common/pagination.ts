export function getPagination(pageValue?: string, sizeValue?: string) {
  const parsedPage = Number.parseInt(pageValue ?? "1", 10);
  const parsedSize = Number.parseInt(sizeValue ?? "25", 10);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize =
    Number.isSafeInteger(parsedSize) && parsedSize > 0
      ? Math.min(parsedSize, 100)
      : 25;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
