'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { id: number | string; name: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  onAddNew,
  addNewLabel = 'Add new',
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = options.find((opt) => String(opt.id) === value);
  
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) => 
      opt.name.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setOpen(false);
    setSearch('');
  };

  const handleAddNew = () => {
    setOpen(false);
    setSearch('');
    onAddNew?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal bg-input border-border hover:bg-input/80',
            !selectedOption && 'text-muted-foreground',
            className
          )}
        >
          {selectedOption?.name || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex flex-col">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-8 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Add new option - always at top */}
          {onAddNew && (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/10 border-b border-border transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">{addNewLabel}</span>
            </button>
          )}

          {/* Options list */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelect(String(option.id))}
                  className={cn(
                    'flex w-full items-center px-3 py-2.5 text-sm hover:bg-secondary/50 transition-colors',
                    String(option.id) === value && 'bg-secondary'
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      String(option.id) === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
