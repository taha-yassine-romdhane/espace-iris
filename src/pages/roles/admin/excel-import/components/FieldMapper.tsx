import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Shuffle, 
  X,
  FileSpreadsheet,
  Zap,
  AlertTriangle,
  Info,
  Eye,
  List,
  Table
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Field {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  description?: string;
  example?: string;
}

interface FieldMapperProps {
  excelHeaders: string[];
  excelData?: any[];
  targetFields: Field[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  onCancel: () => void;
  entityName: string;
}

interface MappingItem {
  targetField: Field;
  mappedExcelColumn: string | null;
  confidence: number;
  suggestedColumn?: string;
}

export default function FieldMapper({
  excelHeaders,
  excelData = [],
  targetFields,
  onMappingComplete,
  onCancel,
  entityName
}: FieldMapperProps) {
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [previewColumn, setPreviewColumn] = useState<string | null>(null);
  const [splitColumns, setSplitColumns] = useState<Record<string, { fields: string[], separator: string }>>({});

  // Detect if a column contains full names (multiple words)
  const detectFullNameColumn = (columnName: string): boolean => {
    const columnIndex = excelHeaders.indexOf(columnName);
    if (columnIndex === -1) return false;
    
    // Sample first 20 non-empty values
    const samples = excelData
      .slice(0, 20)
      .map(row => row[columnIndex])
      .filter(value => value && typeof value === 'string' && value.trim() !== '');
    
    if (samples.length < 3) return false;
    
    // Count how many samples have multiple words
    const multiWordCount = samples.filter(value => {
      const words = value.trim().split(/\s+/);
      return words.length >= 2 && words.every((word: string) => word.length > 1);
    }).length;
    
    // If more than 60% have multiple words, it's likely a full name column
    return multiWordCount / samples.length > 0.6;
  };

  // Initialize mappings with auto-detection
  useEffect(() => {
    const initialMappings: MappingItem[] = targetFields.map(field => {
      // Try to auto-detect matching columns
      const exactMatch = excelHeaders.find(header => {
        if (!header || typeof header !== 'string') return false;
        const headerLower = header.toLowerCase().trim();
        return headerLower === field.label.toLowerCase() ||
               headerLower === field.key.toLowerCase();
      });

      if (exactMatch) {
        return {
          targetField: field,
          mappedExcelColumn: exactMatch,
          confidence: 100,
          suggestedColumn: exactMatch
        };
      }

      // Try partial matches
      const partialMatch = excelHeaders.find(header => {
        if (!header || typeof header !== 'string') return false;
        const headerLower = header.toLowerCase().trim();
        const fieldLower = field.label.toLowerCase();
        const keyLower = field.key.toLowerCase();
        
        return headerLower.includes(fieldLower) || 
               fieldLower.includes(headerLower) ||
               headerLower.includes(keyLower) ||
               keyLower.includes(headerLower);
      });

      if (partialMatch) {
        return {
          targetField: field,
          mappedExcelColumn: null,
          confidence: 60,
          suggestedColumn: partialMatch
        };
      }

      return {
        targetField: field,
        mappedExcelColumn: null,
        confidence: 0
      };
    });

    setMappings(initialMappings);

    // Auto-detect full name columns
    const detectedSplits: Record<string, { fields: string[], separator: string }> = {};
    
    excelHeaders.forEach(header => {
      if (!header || typeof header !== 'string') return;
      const headerLower = header.toLowerCase();
      
      // Check if this might be a full name column
      if ((headerLower.includes('name') || headerLower.includes('nom') || 
           headerLower.includes('complet') || headerLower === 'nom complet' ||
           headerLower === 'full name' || headerLower === 'fullname') && 
          !headerLower.includes('first') && !headerLower.includes('last') &&
          !headerLower.includes('prénom') && !headerLower.includes('famille') &&
          !headerLower.includes('prenom')) {
        
        if (detectFullNameColumn(header)) {
          // Check if we have firstName and lastName fields available
          const firstNameField = targetFields.find(f => f.key === 'firstName');
          const lastNameField = targetFields.find(f => f.key === 'lastName');
          
          if (firstNameField && lastNameField) {
            detectedSplits[header] = {
              fields: ['firstName', 'lastName'],
              separator: ' '
            };
          }
        }
      }
    });
    
    setSplitColumns(detectedSplits);
  }, [excelHeaders, targetFields, excelData]);

  const handleColumnDrop = (fieldKey: string, excelColumn: string) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.targetField.key === fieldKey) {
        return { ...mapping, mappedExcelColumn: excelColumn };
      }
      // Remove column from other mappings if it was already mapped
      if (mapping.mappedExcelColumn === excelColumn) {
        return { ...mapping, mappedExcelColumn: null };
      }
      return mapping;
    }));
  };

  const handleRemoveMapping = (fieldKey: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.targetField.key === fieldKey 
        ? { ...mapping, mappedExcelColumn: null }
        : mapping
    ));
  };

  const handleAutoMap = () => {
    setMappings(prev => prev.map(mapping => {
      if (!mapping.mappedExcelColumn && mapping.suggestedColumn) {
        return { ...mapping, mappedExcelColumn: mapping.suggestedColumn };
      }
      return mapping;
    }));
  };

  const handleAcceptSuggestion = (fieldKey: string) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.targetField.key === fieldKey && mapping.suggestedColumn) {
        return { ...mapping, mappedExcelColumn: mapping.suggestedColumn };
      }
      return mapping;
    }));
  };

  const unmappedHeaders = excelHeaders.filter(header => {
    if (!header) return false;
    
    // Check if header is directly mapped
    const directlyMapped = mappings.some(m => m.mappedExcelColumn === header);
    
    // Check if header is used in split columns
    const usedInSplit = Object.keys(splitColumns).includes(header);
    
    return !directlyMapped && !usedInSplit;
  });

  const requiredFieldsMapped = mappings
    .filter(m => m.targetField.required)
    .every(m => m.mappedExcelColumn !== null);

  const totalMapped = mappings.filter(m => m.mappedExcelColumn !== null).length;
  const requiredCount = mappings.filter(m => m.targetField.required).length;
  const mappedRequiredCount = mappings.filter(m => m.targetField.required && m.mappedExcelColumn).length;

  const handleSplitColumn = (columnName: string, fields: string[]) => {
    setSplitColumns(prev => ({
      ...prev,
      [columnName]: { fields, separator: ' ' }
    }));
    
    // Map the fields and remove the column from unmapped headers
    setMappings(prev => prev.map(mapping => {
      if (fields.includes(mapping.targetField.key)) {
        return { ...mapping, mappedExcelColumn: `${columnName}[split]` };
      }
      // Remove other mappings to this column if they exist
      if (mapping.mappedExcelColumn === columnName) {
        return { ...mapping, mappedExcelColumn: null };
      }
      return mapping;
    }));
  };

  const handleRemoveSplit = (columnName: string) => {
    const split = splitColumns[columnName];
    if (!split) return;
    
    // Remove mappings for split fields
    setMappings(prev => prev.map(mapping => {
      if (split.fields.includes(mapping.targetField.key)) {
        return { ...mapping, mappedExcelColumn: null };
      }
      return mapping;
    }));
    
    // Remove split configuration
    setSplitColumns(prev => {
      const newSplits = { ...prev };
      delete newSplits[columnName];
      return newSplits;
    });
  };

  const handleComplete = () => {
    const mappingResult: Record<string, string> = {};
    mappings.forEach(mapping => {
      if (mapping.mappedExcelColumn) {
        mappingResult[mapping.targetField.key] = mapping.mappedExcelColumn;
      }
    });
    
    // Add split column information to the mapping
    mappingResult['_splitColumns'] = JSON.stringify(splitColumns);
    
    onMappingComplete(mappingResult);
  };

  // Get sample data from a column
  const getColumnData = (columnName: string, limit: number = 10) => {
    const columnIndex = excelHeaders.indexOf(columnName);
    if (columnIndex === -1) return [];
    
    return excelData
      .slice(0, limit)
      .map((row, index) => ({
        rowIndex: index + 2, // Excel rows start at 1, plus header
        value: row[columnIndex] || ''
      }))
      .filter(item => item.value !== '');
  };

  // Get unique values count for a column
  const getColumnStats = (columnName: string) => {
    const columnIndex = excelHeaders.indexOf(columnName);
    if (columnIndex === -1) return { total: 0, unique: 0, empty: 0 };
    
    const values = excelData.map(row => row[columnIndex]);
    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
    const unique = new Set(nonEmpty).size;
    const empty = values.length - nonEmpty.length;
    
    return {
      total: values.length,
      unique,
      empty,
      filled: nonEmpty.length
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration de l'importation</h2>
          <p className="text-gray-600 mt-1">
            Associez les colonnes Excel aux champs {entityName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFieldsDialog(true)}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Voir tous les champs ({targetFields.length})
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression du mapping</span>
            <span className="text-sm text-gray-600">
              {totalMapped} / {targetFields.length} champs mappés
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(totalMapped / targetFields.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                Champs requis: {mappedRequiredCount}/{requiredCount}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                Champs optionnels: {totalMapped - mappedRequiredCount}/{targetFields.length - requiredCount}
              </span>
            </div>
            {mappings.some(m => !m.mappedExcelColumn && m.suggestedColumn) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoMap}
                className="flex items-center gap-2"
              >
                <Zap className="h-3 w-3" />
                Auto-mapper les suggestions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Excel Columns */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Colonnes Excel disponibles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {/* Split Columns Section */}
            {Object.keys(splitColumns).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-purple-700 mb-2">Colonnes divisées:</h4>
                {Object.entries(splitColumns).map(([columnName, config]) => (
                  <div
                    key={columnName}
                    className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg mb-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-purple-900">{columnName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-purple-700"
                        onClick={() => setPreviewColumn(columnName)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-purple-700">
                      Divisé en: {config.fields.map(field => {
                        const targetField = targetFields.find(f => f.key === field);
                        return targetField?.label || field;
                      }).join(' + ')}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs mt-2 border-purple-300 text-purple-700 hover:bg-purple-200"
                      onClick={() => handleRemoveSplit(columnName)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Annuler la division
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {unmappedHeaders.length === 0 && Object.keys(splitColumns).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Toutes les colonnes sont mappées</p>
              </div>
            ) : (
              unmappedHeaders.map(header => {
                const stats = getColumnStats(header);
                const headerLower = header.toLowerCase();
                const isSplittable = detectFullNameColumn(header) && 
                  ((headerLower.includes('name') || headerLower.includes('nom') || 
                    headerLower.includes('complet') || headerLower === 'nom complet' ||
                    headerLower === 'full name' || headerLower === 'fullname') && 
                   !headerLower.includes('first') && !headerLower.includes('last') &&
                   !headerLower.includes('prénom') && !headerLower.includes('famille') &&
                   !headerLower.includes('prenom'));
                const isSplit = !!splitColumns[header];
                
                return (
                  <div
                    key={header}
                    draggable={!isSplit}
                    onDragStart={() => !isSplit && setDraggedColumn(header)}
                    onDragEnd={() => setDraggedColumn(null)}
                    className={cn(
                      "p-3 bg-gray-50 rounded-lg transition-colors",
                      isSplit ? "border-2 border-purple-300 bg-purple-50" : "cursor-move hover:bg-gray-100 border-2 border-transparent hover:border-blue-300",
                      draggedColumn === header && "opacity-50 border-blue-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{header}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewColumn(header);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {stats.filled}/{stats.total} valeurs
                    </div>
                    
                    {/* Split column indicator */}
                    {isSplittable && !isSplit && (
                      <div className="mt-2 p-2 bg-purple-100 rounded border border-purple-200">
                        <div className="text-xs text-purple-700 font-medium mb-1">
                          Colonne de nom complet détectée!
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs border-purple-300 text-purple-700 hover:bg-purple-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSplitColumn(header, ['firstName', 'lastName']);
                          }}
                        >
                          <Shuffle className="h-3 w-3 mr-1" />
                          Diviser en prénom + nom
                        </Button>
                      </div>
                    )}
                    
                    {isSplit && (
                      <div className="mt-2 p-2 bg-purple-100 rounded border border-purple-200">
                        <div className="text-xs text-purple-700 font-medium mb-1">
                          Divisé en:
                        </div>
                        <div className="text-xs text-purple-600">
                          → Prénom (1er mot)<br/>
                          → Nom (reste)
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs mt-2 border-purple-300 text-purple-700 hover:bg-purple-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSplit(header);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Annuler la division
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Target Fields */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Champs de destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {mappings.map(mapping => {
              const { targetField, mappedExcelColumn, suggestedColumn, confidence } = mapping;
              const isMapped = mappedExcelColumn !== null;
              const hasSuggestion = !isMapped && suggestedColumn;

              return (
                <div
                  key={targetField.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoveredField(targetField.key);
                  }}
                  onDragLeave={() => setHoveredField(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedColumn) {
                      handleColumnDrop(targetField.key, draggedColumn);
                    }
                    setHoveredField(null);
                  }}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    isMapped ? "bg-green-50 border-green-200" : "bg-white border-gray-200",
                    hoveredField === targetField.key && "border-blue-400 bg-blue-50",
                    targetField.required && !isMapped && "border-red-200 bg-red-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{targetField.label}</span>
                        {targetField.required && (
                          <Badge variant="destructive" className="text-xs">
                            Requis
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {targetField.type}
                        </Badge>
                      </div>
                      
                      {targetField.description && (
                        <p className="text-xs text-gray-600 mb-2">{targetField.description}</p>
                      )}

                      <div className="flex items-center gap-2">
                        {isMapped ? (
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            {mappedExcelColumn?.includes('[split]') ? (
                              <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700">
                                <Shuffle className="h-3 w-3" />
                                {mappedExcelColumn.replace('[split]', '')} (divisé)
                                <button
                                  onClick={() => handleRemoveMapping(targetField.key)}
                                  className="ml-1 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                {mappedExcelColumn}
                                <button
                                  onClick={() => handleRemoveMapping(targetField.key)}
                                  className="ml-1 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            )}
                          </div>
                        ) : hasSuggestion ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Suggestion:</span>
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-blue-100"
                              onClick={() => handleAcceptSuggestion(targetField.key)}
                            >
                              {suggestedColumn}
                              <span className="ml-1 text-blue-600">
                                ({confidence}% match)
                              </span>
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <AlertCircle className="h-4 w-4" />
                            <span>Glissez une colonne Excel ici</span>
                          </div>
                        )}
                      </div>

                      {targetField.example && (
                        <p className="text-xs text-gray-500 mt-1">
                          Exemple: {targetField.example}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          {!requiredFieldsMapped && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Tous les champs requis doivent être mappés
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={!requiredFieldsMapped}
          >
            Continuer avec ce mapping
          </Button>
        </div>
      </div>

      {/* Fields List Dialog */}
      <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Liste complète des champs {entityName}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Champ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom interne
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requis
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exemple
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {targetFields.map(field => {
                  const mapping = mappings.find(m => m.targetField.key === field.key);
                  const isMapped = mapping?.mappedExcelColumn !== null;
                  
                  return (
                    <tr key={field.key} className={isMapped ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {field.label}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {field.key}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {field.required ? (
                          <Badge variant="destructive" className="text-xs">
                            Requis
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Optionnel
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {field.example || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {isMapped ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">
                              Mappé → {mapping?.mappedExcelColumn}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>Non mappé</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-red-600">{requiredCount}</span> champs requis,{' '}
              <span className="font-medium text-gray-600">{targetFields.length - requiredCount}</span> champs optionnels
            </div>
            <Button variant="outline" onClick={() => setShowFieldsDialog(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Preview Dialog */}
      <Dialog open={!!previewColumn} onOpenChange={() => setPreviewColumn(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu de la colonne: {previewColumn}
            </DialogTitle>
          </DialogHeader>
          {previewColumn && (
            <div className="space-y-4">
              {/* Stats */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Statistiques</h4>
                  {(() => {
                    const stats = getColumnStats(previewColumn);
                    return (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Total de lignes: <span className="font-medium">{stats.total}</span></div>
                        <div>Valeurs remplies: <span className="font-medium">{stats.filled}</span></div>
                        <div>Valeurs vides: <span className="font-medium">{stats.empty}</span></div>
                        <div>Valeurs uniques: <span className="font-medium">{stats.unique}</span></div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Sample Data */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Échantillon de données (10 premières valeurs)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Ligne Excel
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Valeur
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getColumnData(previewColumn, 10).map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.rowIndex}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setPreviewColumn(null)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}