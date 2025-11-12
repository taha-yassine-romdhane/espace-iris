import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ExcelTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  summary?: Record<string, any>;
}

export const ExcelTable: React.FC<ExcelTableProps> = ({ columns, data, title, summary }) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="w-full">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{data.length} entrées</p>
          </div>

          {/* Pagination Controls - Top */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Afficher</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages || 1}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                size="sm"
                variant="outline"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
              {paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`
                    border-b border-gray-200 hover:bg-blue-50 transition-colors
                    ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  {columns.map((col, colIdx) => {
                    const value = row[col.key];
                    let displayValue;

                    if (col.render) {
                      displayValue = col.render(value, row);
                    } else if (col.format) {
                      displayValue = col.format(value);
                    } else {
                      displayValue = value;
                    }

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

      {/* Table Info & Bottom Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span>Faites défiler horizontalement pour voir toutes les colonnes</span>
          <span className="mx-2">•</span>
          <span>Affichage {startIndex + 1}-{Math.min(endIndex, data.length)} sur {data.length} ligne{data.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Pagination Controls - Bottom */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExcelTable;
