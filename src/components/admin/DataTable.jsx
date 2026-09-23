export default function DataTable({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  emptyState,
  pagination,
}) {
  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm text-gray-500">
          Chargement…
        </div>
      )}
      {rows.length === 0 && !loading ? (
        emptyState || <p className="p-8 text-center text-sm text-gray-500">Aucune donnée.</p>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={col.id}
                    className={[
                      'px-4 py-3 font-medium',
                      col.headerClassName ?? '',
                      i === columns.length - 1 ? 'sticky end-0 bg-gray-50' : '',
                    ].join(' ')}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey]
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? 'cursor-pointer transition hover:bg-[#f3faf6]' : ''}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={col.id}
                        className={[
                          'px-4 py-3.5',
                          col.className ?? '',
                          i === columns.length - 1 ? 'sticky end-0 bg-white' : '',
                        ].join(' ')}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {pagination}
    </div>
  )
}
