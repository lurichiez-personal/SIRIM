
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  className = ''
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };
  
  // Basic pagination links logic
  let pages = [];
  for(let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex justify-between items-center mt-4 p-2 ${className}`}>
        <span className="text-sm text-secondary-600">
            Página {currentPage} de {totalPages} ({totalCount} registros)
        </span>
        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
            >
            Anterior
            </button>
            {/* TODO: Add more complex page number rendering (e.g., with ellipsis) */}
            <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50"
            >
            Siguiente
            </button>
      </nav>
    </div>
  );
};

export default Pagination;
