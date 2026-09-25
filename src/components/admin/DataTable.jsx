export default function DataTable({
  columns,
  rows = [],
  groups,
  rowKey,
  onRowClick,
  rowClassName,
  loading = false,
  emptyState,
  pagination,
  compact = false,
  hoverClassName = 'hover:bg-[#f3faf6]',
  mobileCard,
}) {
  const pad = compact ? 'px-4 py-3' : 'px-4 py-3.5'
  const groupes = groups?.filter((g) => g.rows?.length) ?? null
  const liste = groupes ? groupes.flatMap((g) => g.rows) : rows
  const vide = liste.length === 0

  const cle = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey])

  const renderRow = (row) => {
    const extra = rowClassName?.(row) ?? ''
    return (
      <tr
        key={cle(row)}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={[onRowClick ? `cursor-pointer transition ${hoverClassName}` : '', extra].join(' ')}
      >
        {columns.map((col, i) => (
          <td
            key={col.id}
            className={[
              pad,
              col.className ?? '',
              i === columns.length - 1 ? 'sticky end-0 bg-inherit' : '',
            ].join(' ')}
          >
            {col.cell(row)}
          </td>
        ))}
      </tr>
    )
  }

  const table = !vide && (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full min-w-[860px] text-start text-sm">
        <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
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
          {groupes
            ? groupes.map((g) => (
                <Groupes key={g.id} label={g.label} colSpan={columns.length}>
                  {g.rows.map(renderRow)}
                </Groupes>
              ))
            : rows.map(renderRow)}
        </tbody>
      </table>
    </div>
  )

  const cartes =
    mobileCard && !vide ? (
      <div className="space-y-4 p-3 md:hidden">
        {groupes
          ? groupes.map((g) => (
              <div key={g.id}>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{g.label}</p>
                <div className="space-y-2">
                  {g.rows.map((row) => (
                    <button
                      key={cle(row)}
                      type="button"
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={[
                        'w-full rounded-[8px] border border-gray-200 p-3 text-start',
                        onRowClick ? `cursor-pointer ${hoverClassName}` : '',
                        rowClassName?.(row) ?? '',
                      ].join(' ')}
                    >
                      {mobileCard(row)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          : rows.map((row) => (
              <button
                key={cle(row)}
                type="button"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'w-full rounded-[8px] border border-gray-200 p-3 text-start',
                  onRowClick ? `cursor-pointer ${hoverClassName}` : '',
                  rowClassName?.(row) ?? '',
                ].join(' ')}
              >
                {mobileCard(row)}
              </button>
            ))}
      </div>
    ) : null

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-sm text-gray-500">
          Chargement…
        </div>
      )}
      {vide && !loading ? (
        emptyState || <p className="p-8 text-center text-sm text-gray-500">Aucune donnée.</p>
      ) : vide ? (
        <p className="p-8 text-center text-sm text-gray-500">Chargement…</p>
      ) : (
        <>
          {cartes}
          <div className={mobileCard ? 'hidden md:block' : undefined}>{table}</div>
        </>
      )}
      {pagination}
    </div>
  )
}

function Groupes({ label, colSpan, children }) {
  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="sticky top-10 z-10 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600"
        >
          {label}
        </td>
      </tr>
      {children}
    </>
  )
}
