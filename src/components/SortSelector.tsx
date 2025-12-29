import { Button } from '@/components/ui/button';
import { SORT_OPTIONS, type SortType } from '@/hooks/useModels';

interface SortSelectorProps {
  activeSort: SortType;
  onSortChange: (sort: SortType) => void;
  onConfirm?: () => void;
}

export function SortSelector({ activeSort, onSortChange, onConfirm }: SortSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center items-center gap-2">
      {SORT_OPTIONS.map((option) => (
        <Button
          key={option.key}
          variant={activeSort === option.key ? 'secondary' : 'outline'}
          size="xl"
          onClick={() => onSortChange(option.key)}
        >
          {option.label}
        </Button>
      ))}
      {onConfirm && (
        <Button size="xl" onClick={onConfirm}>
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
