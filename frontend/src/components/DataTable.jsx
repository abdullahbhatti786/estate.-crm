import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  total = 0,
  page = 1,
  pages = 1,
  onPageChange,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue = '',
  actions,
  headerActions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyMessage = 'No records found',
  loading = false
}) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearch = (val) => {
    setLocalSearch(val);
    if (onSearch) onSearch(val);
  };

  const toggleSelect = (id) => {
    if (!onSelectionChange) return;
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(s => s !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(row => row.id));
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      {(onSearch || headerActions) && (
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Search */}
          {onSearch ? (
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder={searchPlaceholder} 
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all"
              />
            </div>
          ) : <div />}

          {/* Header Actions */}
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Selection info */}
      {selectable && selectedIds.length > 0 && (
        <div className="px-5 py-2 bg-accent-dim border-b border-accent/20 text-sm text-accent font-medium">
          {selectedIds.length} contact{selectedIds.length > 1 ? 's' : ''} selected
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated/50">
              {selectable && (
                <th className="pl-5 pr-2 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border bg-bg-elevated accent-accent"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-5 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
              {actions && (
                <th className="px-5 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <span className="text-text-muted text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-5 py-16 text-center text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-bg-hover/50 transition-colors duration-150"
                >
                  {selectable && (
                    <td className="pl-5 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded border-border bg-bg-elevated accent-accent"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-3 text-sm text-text-primary whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] || '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="px-5 py-4 border-t border-border flex items-center justify-between text-xs">
          <span className="text-text-muted">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            
            {/* Page numbers block */}
            <div className="flex items-center gap-1">
              {[...Array(Math.min(3, pages))].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => onPageChange(i + 1)}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium transition-all ${page === i + 1 ? 'bg-accent-dim/30 text-accent border border-accent/20' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
                >
                  {i + 1}
                </button>
              ))}
              {pages > 3 && <span className="text-text-muted px-1">...</span>}
              {pages > 3 && (
                 <button
                 onClick={() => onPageChange(pages)}
                 className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium transition-all ${page === pages ? 'bg-accent-dim/30 text-accent border border-accent/20' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`}
               >
                 {pages}
               </button>
              )}
            </div>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
