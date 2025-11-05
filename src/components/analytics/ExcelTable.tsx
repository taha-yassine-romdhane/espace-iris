import React from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  className?: string;
}

interface ExcelTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  summary?: Record<string, any>;
}

export const ExcelTable: React.FC<ExcelTableProps> = ({ columns, data, title, summary }) => {
  return (
    <div className="w-full">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{data.length} entrées</p>
        </div>
      )}

      {/* Excel-like container with horizontal scroll */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '100%' }}>
            {/* Table Header */}
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`
                      px-4 py-3 text-sm font-semibold text-gray-700
                      border-r border-gray-300 whitespace-nowrap sticky top-0 bg-gray-100
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      ${idx === 0 ? 'sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}
                    `}
                    style={{ width: col.width || 'auto' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`
                    border-b border-gray-200 hover:bg-blue-50 transition-colors
                    ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  {columns.map((col, colIdx) => {
                    const value = row[col.key];
                    const displayValue = col.format ? col.format(value) : value;

                    return (
                      <td
                        key={col.key}
                        className={`
                          px-4 py-3 text-sm text-gray-900 border-r border-gray-200
                          ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                          ${col.className || ''}
                          ${colIdx === 0 ? 'sticky left-0 z-10 font-medium bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]' : ''}
                        `}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Summary Row */}
            {summary && (
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-300 font-semibold">
                  {columns.map((col, colIdx) => {
                    const value = summary[col.key];
                    const displayValue = value !== undefined
                      ? (col.format ? col.format(value) : value)
                      : '';

                    return (
                      <td
                        key={col.key}
                        className={`
                          px-4 py-3 text-sm text-gray-900 border-r border-blue-200
                          ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                          ${colIdx === 0 ? 'sticky left-0 z-10 bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}
                        `}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Table Info */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>Faites défiler horizontalement pour voir toutes les colonnes</span>
        <span>{data.length} ligne{data.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export default ExcelTable;
