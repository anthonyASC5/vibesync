import React, { useCallback, useState } from 'react';
import { Upload, Music } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('audio/')) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div 
      className={`relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 text-center cursor-pointer
        ${isDragging 
          ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' 
          : 'border-gray-700 hover:border-purple-400 hover:bg-gray-800/50 bg-gray-900/50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('audio-upload')?.click()}
    >
      <input 
        type="file" 
        id="audio-upload" 
        className="hidden" 
        accept="audio/mp3,audio/wav,audio/mpeg"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full bg-gray-800 group-hover:bg-purple-900/50 transition-colors duration-300`}>
          <Upload className="w-8 h-8 text-purple-400 group-hover:text-purple-300" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white group-hover:text-purple-200">
            Upload Audio File
          </h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Drag & drop your track here, or click to browse. 
            <br/>
            <span className="text-xs text-gray-500">MP3, WAV up to 20MB</span>
          </p>
        </div>
      </div>

      {/* Decoration */}
      <div className="absolute top-4 right-4 opacity-20">
        <Music className="w-12 h-12 text-purple-500 transform rotate-12" />
      </div>
    </div>
  );
};