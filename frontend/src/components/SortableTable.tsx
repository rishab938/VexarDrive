import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

export interface ColumnConfig<T> {
  key: keyof T | string;
  label: string;
  isNumeric?: boolean;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface SortableTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  searchKey?: keyof T;
  searchPlaceholder?: string;
  defaultSortKey?: keyof T | string;
  defaultSortDirection?: 'asc' | 'desc';
  filterComponent?: React.ReactNode;
}

export function SortableTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  searchKey,
  searchPlaceholder = 'Search records...',
  defaultSortKey,
  defaultSortDirection = 'desc',
  filterComponent,
}: SortableTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>((defaultSortKey as string) || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Filtered and Sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchTerm && searchKey) {
      result = result.filter((row) => {
        const val = row[searchKey];
        return val ? String(val).toLowerCase().includes(searchTerm.toLowerCase()) : false;
      });
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        // Handle string comparison vs numbers
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      });
    }

    return result;
  }, [data, searchTerm, searchKey, sortKey, sortDirection]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {searchKey && (
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-10 w-full"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          {filterComponent}
        </div>
      </div>

      {/* Glassmorphic Table Container */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 shadow-xl">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                {columns.map((col) => {
                  const isSortable = col.sortable !== false;
                  return (
                    <th
                      key={String(col.key)}
                      onClick={() => isSortable && handleSort(String(col.key))}
                      className={`px-6 py-4 font-medium transition-colors ${
                        isSortable ? 'cursor-pointer hover:text-slate-100 select-none' : ''
                      } ${col.isNumeric ? 'text-right' : ''}`}
                    >
                      <div className={`flex items-center gap-1.5 ${col.isNumeric ? 'justify-end' : 'justify-start'}`}>
                        <span>{col.label}</span>
                        {isSortable && sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                          )
                        ) : (
                          isSortable && <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300 font-medium">
              {processedData.length > 0 ? (
                processedData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors py-4 ${
                      onRowClick ? 'cursor-pointer hover:bg-white/5 dark:hover:bg-slate-900/40' : 'hover:bg-transparent'
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={`px-6 py-4 ${col.isNumeric ? 'text-right font-mono-numbers' : ''}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-500">
                    No records found matching current search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
