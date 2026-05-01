import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function buildPageList(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const set: (number | 'gap')[] = [0];
  if (page > 2) set.push('gap');
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
    set.push(i);
  }
  if (page < totalPages - 3) set.push('gap');
  set.push(totalPages - 1);
  return set;
}

export function TablePagination({
  page, totalPages, total, pageSize, onPageChange, className,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  const pageList = buildPageList(page, totalPages);

  return (
    <div
      className={cn('flex items-center justify-between px-4 py-3 flex-wrap gap-2', className)}
      role="navigation"
      aria-label="Paginação"
    >
      <p className="text-xs text-muted-foreground shrink-0">
        {start}–{end} de {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          disabled={page === 0}
          onClick={() => onPageChange(0)}
          aria-label="Primeira página"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline" size="icon" className="h-8 w-8"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {pageList.map((p, i) =>
          p === 'gap' ? (
            <span
              key={`gap-${i}`}
              className="h-8 w-6 flex items-center justify-center text-xs text-muted-foreground select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs',
                p === page && 'pointer-events-none font-bold',
              )}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p + 1}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p + 1}
            </Button>
          )
        )}

        <Button
          variant="outline" size="icon" className="h-8 w-8"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline" size="icon" className="h-8 w-8"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          aria-label="Última página"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
