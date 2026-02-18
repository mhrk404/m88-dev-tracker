export type PaginationToken = number | "ellipsis"

function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

/**
 * Returns a compact pagination token list (page numbers + ellipsis markers).
 * Always includes 1 and total (when total > 1).
 */
export function paginationRange(
  current: number,
  total: number,
  siblingCount: number = 1
): PaginationToken[] {
  if (total <= 1) return [1]

  const totalPageNumbers = siblingCount * 2 + 5
  if (total <= totalPageNumbers) return range(1, total)

  const leftSiblingIndex = Math.max(current - siblingCount, 1)
  const rightSiblingIndex = Math.min(current + siblingCount, total)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < total - 1

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2
    return [...range(1, leftItemCount), "ellipsis", total]
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2
    const start = total - rightItemCount + 1
    return [1, "ellipsis", ...range(start, total)]
  }

  return [
    1,
    "ellipsis",
    ...range(leftSiblingIndex, rightSiblingIndex),
    "ellipsis",
    total,
  ]
}

