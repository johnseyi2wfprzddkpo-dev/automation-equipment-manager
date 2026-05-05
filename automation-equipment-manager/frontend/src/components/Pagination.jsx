const pageSizeOptions = [10, 20, 50, 100];

export function paginateItems(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getTotalPages(total, pageSize) {
  return Math.max(Math.ceil(total / pageSize), 1);
}

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = getTotalPages(total, pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function goTo(nextPage) {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  }

  return (
    <div className="pagination-bar">
      <div className="pagination-summary">
        共 {total} 条，当前 {start}-{end} 条，第 {page} / {totalPages} 页
      </div>
      <div className="pagination-controls">
        <label>
          每页
          <select
            className="form-control pagination-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size} 条</option>
            ))}
          </select>
        </label>
        <button className="secondary-button" disabled={page <= 1} onClick={() => goTo(1)} type="button">首页</button>
        <button className="secondary-button" disabled={page <= 1} onClick={() => goTo(page - 1)} type="button">上一页</button>
        <button className="secondary-button" disabled={page >= totalPages} onClick={() => goTo(page + 1)} type="button">下一页</button>
        <button className="secondary-button" disabled={page >= totalPages} onClick={() => goTo(totalPages)} type="button">末页</button>
      </div>
    </div>
  );
}
