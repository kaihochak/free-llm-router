import { Button } from '@/components/ui/button';
import { SORT_OPTIONS, type SortType } from '@/hooks/useModels';

interface SortSelectorProps {
  activeSort: SortType;
  onSortChange: (sort: SortType) => void;
  onConfirm?: () => void;
}

export function SortSelector({ activeSort, onSortChange, onConfirm }: SortSelectorProps) {
  return (
    <div className="flex justify-center items-center gap-3">
      <select
        value={activeSort}
        onChange={(e) => onSortChange(e.target.value as SortType)}
        className="rounded-xl border-2 border-border bg-card px-6 py-3 text-lg font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      {onConfirm && (
        <Button size="lg" onClick={onConfirm}>
          Get Code
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Button>
      )}
    </div>
  );
}
