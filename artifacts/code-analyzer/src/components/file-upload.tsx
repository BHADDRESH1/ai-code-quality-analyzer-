import React, { useRef, useState } from "react";
import { UploadCloud, FileCode, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  supportedExtensions?: string[];
  onInvalidFile?: (message: string) => void;
  className?: string;
}

export function FileUpload({
  label,
  file,
  onFileSelect,
  accept = ".py",
  supportedExtensions = [".py"],
  onInvalidFile,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const lowerName = selectedFile.name.toLowerCase();
    const isSupported = supportedExtensions.some((ext) =>
      lowerName.endsWith(ext.toLowerCase()),
    );

    if (!isSupported) {
      const msg = "Only Python, C, C++, and Java are supported";
      if (onInvalidFile) onInvalidFile(msg);
      else alert(msg);
      return;
    }
    onFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <span className="font-medium text-sm text-primary uppercase tracking-wider">{label}</span>
      
      {!file ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer bg-card overflow-hidden group",
            isDragging 
              ? "border-primary bg-primary/5 shadow-[0_0_0_4px_rgba(var(--primary),0.1)]" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <UploadCloud className={cn("w-10 h-10 mb-4 transition-colors", isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")} />
          <p className="text-sm font-medium text-foreground text-center">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Supported files ({accept})
          </p>
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 border rounded-2xl bg-card shadow-sm shadow-black/5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileCode className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
