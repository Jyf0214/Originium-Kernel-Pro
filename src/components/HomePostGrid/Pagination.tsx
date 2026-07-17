import { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  t,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
}) {
  const handlePrev = useCallback(() => {
    onPageChange(Math.max(1, currentPage - 1));
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, onPageChange]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Button
        variant="default"
        size="sm"
        autoLoading={false}
        icon={<ChevronLeft size={16} />}
        disabled={currentPage === 1}
        onClick={handlePrev}
      >
        <span className="hidden sm:inline">{t('common.previous')}</span>
      </Button>
      {/* 页码按钮数量通常有限（最多10个），内联回调性能影响可忽略 */}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'primary' : 'ghost'}
          size="sm"
          autoLoading={false}
          iconOnly
          className={page === currentPage ? 'shadow-sm shadow-zinc-900/10' : 'border border-zinc-200'}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
      <Button
        variant="default"
        size="sm"
        autoLoading={false}
        icon={<ChevronRight size={16} />}
        disabled={currentPage === totalPages}
        onClick={handleNext}
      >
        <span className="hidden sm:inline">{t('common.next')}</span>
      </Button>
    </div>
  );
});
