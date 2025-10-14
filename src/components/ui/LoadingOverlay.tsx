import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center transition-opacity duration-300">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-700 font-medium">Chargement de la page...</p>
      </div>
    </div>
  );
}

export default LoadingOverlay;
