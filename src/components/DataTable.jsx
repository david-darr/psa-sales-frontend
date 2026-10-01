import '../styles/ui.css'

/**
 * Scrollable table with a sticky header, CSS zebra striping and CSS hover.
 *
 * Column definitions keep the markup declarative, so adding a column is one
 * array entry rather than a matching pair of edits to a <thead> and a <tbody>
 * that had to be kept in the same order by hand.
 *
 * @param {Array<{key: string, header: string, render?: (row) => ReactNode, className?: string}>} columns
 * @param {Array<object>} rows
 * @param {(row, index) => string|number} rowKey
 * @param {(row) => void} [rowRef]    Called with each row element, for scroll-into-view.
 * @param {ReactNode} [toolbar]       Rendered above the scroll area.
 */
export default function DataTable({ columns, rows, rowKey, rowRef, toolbar }) {
  return (
    <div className="ui-table-frame">
      {toolbar && <div className="ui-table-toolbar">{toolbar}</div>}
      <div className="ui-table-scroll">
        <table className="ui-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey ? rowKey(row, index) : index}
                ref={rowRef ? (el) => rowRef(row, el) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
