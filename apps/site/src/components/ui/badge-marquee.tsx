import React from 'react';
import { Input } from './input';
import { Search } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';

interface BadgeMarqueeProps<T> {
  items: T[];
  variant?: ButtonProps['variant'];
  onSelected?: (item: T) => void;
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getItemTitle(item: any): string {
  // Check common title properties
  return (
    item.title ||
    item.name ||
    item.label ||
    item.text ||
    item.displayName ||
    item.heading ||
    ''
  );
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getItemImageUrl(item: any): string {
  return item.imageUrl || item.image || item.avatar || item.icon || '';
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getItemDescription(item: any): string {
  return item.description || item.desc || item.summary || '';
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getItemPrice(item: any): string | number {
  return item.price || item.cost || item.amount || '';
}

export function BadgeMarquee<T>({
  items,
  variant = 'ghost',
  onSelected,
}: BadgeMarqueeProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isUserScrolling, setIsUserScrolling] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const displayItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const title = getItemTitle(item).toLowerCase();
      return title.includes(query);
    });
  }, [items, searchQuery]);

  const handleScroll = React.useCallback(() => {
    setIsUserScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Resume auto-scroll after 2 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleItemClick = (item: T) => {
    setSelectedItem(item);
  };

  const handleSelectProduct = () => {
    if (selectedItem && onSelected) {
      onSelected(selectedItem);
    }
    setSelectedItem(null);
  };

  return (
    <>
      <div className="flex items-center gap-8 w-full overflow-hidden">
        <div className="flex-shrink-0 w-auto flex-1">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        {/* Marquee Container */}
        <div
          ref={containerRef}
          className="flex-3 relative overflow-x-auto scrollbar-hide no-scrollbar"
          onScroll={handleScroll}
        >
          <div
            className={`flex gap-3 ${!isUserScrolling ? 'animate-marquee' : ''}`}
          >
            {/** biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup */}
            {displayItems?.map((item: any, index: number) => (
              <Button
                key={`${getItemTitle(item)}-${index}`}
                variant={variant}
                className="whitespace-nowrap flex-shrink-0 flex gap-1 cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                {/** biome-ignore lint/a11y/useAltText: lint debt cleanup */}
                <img
                  src={getItemImageUrl(item)}
                  className="h-6 w-6 rounded-full"
                />
                {getItemTitle(item)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog for displaying item details */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? getItemTitle(selectedItem) : ''}
            </DialogTitle>
            <DialogDescription className="mt-2">
              <div className="flex flex-col items-center">
                {selectedItem && getItemImageUrl(selectedItem) && (
                  <img
                    src={getItemImageUrl(selectedItem)}
                    alt={getItemTitle(selectedItem)}
                    className="w-32 h-32 object-contain mb-4 rounded-lg"
                  />
                )}
                {selectedItem && getItemDescription(selectedItem) && (
                  <p className="text-gray-700 mb-2">
                    {getItemDescription(selectedItem)}
                  </p>
                )}
                {selectedItem && getItemPrice(selectedItem) && (
                  <p className="text-lg font-bold text-primary">
                    Rs. {getItemPrice(selectedItem)}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSelectProduct}>Use</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <Input
      type="search"
      placeholder="Search..."
      value={searchQuery}
      className="w-full"
      onChange={handleSearch}
      leadingIcon={<Search className="h-4 w-4" />}
    />
  );
}
