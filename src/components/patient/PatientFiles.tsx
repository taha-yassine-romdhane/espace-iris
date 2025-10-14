import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileImage } from 'lucide-react';

interface PatientFilesProps {
  files: { url: string; type: string }[];
  onViewFile: (files: { url: string; type: string }[]) => void;
}

export const PatientFiles = ({ files = [], onViewFile }: PatientFilesProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5 text-blue-500" />
          Documents et fichiers
        </CardTitle>
        <CardDescription>
          Tous les documents associés à ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files && files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file: { url: string; type: string }, index: number) => (
              <div 
                key={index} 
                className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onViewFile([file])}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium truncate">
                    {file.url.split('/').pop()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {file.type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun fichier associé à ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientFiles;
