import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Package, FileText, Calendar, Activity, X, Building } from 'lucide-react';
import { useRouter } from 'next/router';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// Define search result types
export type SearchResultType = 'patient' | 'product' | 'diagnostic' | 'company' | 'sale' | 'rental' | 'user' | 'medicalDevice';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchResultType;
  url: string;
}


interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  className,
  placeholder = "Rechercher par code, nom, numéro..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  // Group results by type
  const groupedResults = [
    {
      type: 'patient' as SearchResultType,
      label: 'Patients',
      icon: <User className="h-4 w-4" />,
      results: results.filter(r => r.type === 'patient')
    },
    {
      type: 'company' as SearchResultType,
      label: 'Entreprises',
      icon: <Building className="h-4 w-4" />,
      results: results.filter(r => r.type === 'company')
    },
    {
      type: 'product' as SearchResultType,
      label: 'Produits',
      icon: <Package className="h-4 w-4" />,
      results: results.filter(r => r.type === 'product')
    },
    {
      type: 'medicalDevice' as SearchResultType,
      label: 'Appareils Médicaux',
      icon: <Activity className="h-4 w-4" />,
      results: results.filter(r => r.type === 'medicalDevice')
    },
    {
      type: 'diagnostic' as SearchResultType,
      label: 'Diagnostics',
      icon: <Activity className="h-4 w-4" />,
      results: results.filter(r => r.type === 'diagnostic')
    },
    {
      type: 'sale' as SearchResultType,
      label: 'Ventes',
      icon: <FileText className="h-4 w-4" />,
      results: results.filter(r => r.type === 'sale')
    },
    {
      type: 'rental' as SearchResultType,
      label: 'Locations',
      icon: <Calendar className="h-4 w-4" />,
      results: results.filter(r => r.type === 'rental')
    },
    {
      type: 'user' as SearchResultType,
      label: 'Utilisateurs',
      icon: <User className="h-4 w-4" />,
      results: results.filter(r => r.type === 'user')
    }
  ].filter(group => group.results && group.results.length > 0);

  // Calculate total results count
  const totalResults = results.length;

  // Fetch search results when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await response.json();
        setResults(data.results);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Close on escape
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      // Open search with keyboard shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
        return;
      }

      // Navigate results with arrow keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < totalResults - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : totalResults - 1
        );
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < totalResults) {
        e.preventDefault();
        
        // Find the selected result across all groups
        let currentIndex = 0;
        for (const group of groupedResults) {
          for (const result of group.results) {
            if (currentIndex === selectedIndex) {
              handleResultClick(result);
              return;
            }
            currentIndex++;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalResults, groupedResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
  };

  // Get icon for result type
  const getIconForType = (type: SearchResultType) => {
    switch (type) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'product':
        return <Package className="h-4 w-4" />;
      case 'diagnostic':
        return <Activity className="h-4 w-4" />;
      case 'sale':
        return <FileText className="h-4 w-4" />;
      case 'rental':
        return <Calendar className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-600" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 0) {
              setIsOpen(true);
            }
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-100 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent placeholder-gray-400 transition-all"
        />
        {query && (
          <button 
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4 text-gray-600 hover:text-gray-800" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-2 max-h-[70vh] overflow-y-auto z-50">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Recherche en cours...</span>
            </div>
          )}

          {/* No Results */}
          {!isLoading && query.length > 1 && totalResults === 0 && (
            <div className="px-4 py-6 text-center">
              <Search className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Aucun résultat trouvé pour "{query}"</p>
              <p className="text-xs text-gray-600 mt-1">Essayez avec d'autres termes de recherche</p>
            </div>
          )}

          {/* Results by Group */}
          {!isLoading && groupedResults.map((group, groupIndex) => (
            <div key={group.type} className="mb-2">
              <div className="px-3 py-1 text-xs text-gray-500 font-medium bg-gray-50 border-b border-gray-100">
                <div className="flex items-center">
                  {group.icon}
                  <span className="ml-2">{group.label}</span>
                  <span className="ml-1 text-gray-600">({group.results.length})</span>
                </div>
              </div>
              {group.results.map((result, resultIndex) => {
                // Calculate the absolute index across all groups
                let absoluteIndex = 0;
                for (let i = 0; i < groupIndex; i++) {
                  absoluteIndex += groupedResults[i].results.length;
                }
                absoluteIndex += resultIndex;
                
                return (
                  <div
                    key={result.id}
                    className={cn(
                      "px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors",
                      selectedIndex === absoluteIndex && "bg-blue-50 text-[#1e3a8a]"
                    )}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        <div className="p-1 bg-blue-100 rounded-full text-blue-600">
                          {getIconForType(result.type)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-gray-500">{result.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Keyboard Shortcuts Help */}
          {!isLoading && totalResults > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded mr-1">↑</span>
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded mr-1">↓</span>
                  <span>Naviguer</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded mr-1">Enter</span>
                  <span>Sélectionner</span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded mr-1">Esc</span>
                <span>Fermer</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
