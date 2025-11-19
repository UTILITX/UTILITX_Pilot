"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import type { UtilityType, RecordType } from "@/components/dual-record-selector";
import type { GeometryType } from "@/lib/types";
import { uploadFilesToSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type FileUrlData = { url: string; path: string };

type UploadSectionContextValue = {
  selectedUtilityType: UtilityType | null;
  setSelectedUtilityType: (value: UtilityType | null) => void;
  selectedRecordType: RecordType | null;
  setSelectedRecordType: (value: RecordType | null) => void;
  selectedGeometryType: GeometryType | null;
  setSelectedGeometryType: (value: GeometryType | null) => void;
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  files: FileList | null;
  setFiles: React.Dispatch<React.SetStateAction<FileList | null>>;
  fileUrls: Map<File, FileUrlData>;
  setFileUrls: React.Dispatch<React.SetStateAction<Map<File, FileUrlData>>>;
  isDraggingAttach: boolean;
  onAttachDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
  onAttachDragOver: React.DragEventHandler<HTMLDivElement>;
  onAttachDragLeave: React.DragEventHandler<HTMLDivElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  resetUploadFlow: () => void;
};

const UploadSectionContext = createContext<UploadSectionContextValue | undefined>(undefined);

export function UploadSectionProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const attachDragDepthRef = useRef(0);
  const [selectedUtilityType, setSelectedUtilityType] = useState<UtilityType | null>(null);
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType | null>(null);
  const [selectedGeometryType, setSelectedGeometryType] = useState<GeometryType | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileUrls, setFileUrls] = useState<Map<File, FileUrlData>>(new Map());
  const [isDraggingAttach, setIsDraggingAttach] = useState(false);

  const uploadFiles = useCallback(
    async (newFiles: File[], sourceFiles?: FileList | null) => {
      toast({
        title: "Uploading files...",
        description: `Uploading ${newFiles.length} file(s) to storage...`,
      });

      const uploadResults = await uploadFilesToSupabase(newFiles);

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      if (sourceFiles) {
        setFiles(sourceFiles);
      }

      setFileUrls((prev) => {
        const next = new Map(prev);
        uploadResults.forEach((result) => {
          next.set(result.file, { url: result.url, path: result.path });
        });
        return next;
      });

      toast({
        title: "Files uploaded",
        description: `${newFiles.length} file(s) uploaded to storage. Update metadata and click "Draw on Map" to georeference.`,
      });
    },
    [toast],
  );

  const onAttachDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      attachDragDepthRef.current = 0;
      setIsDraggingAttach(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      const droppedFiles: File[] = [];
      if (dt.items && dt.items.length) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) droppedFiles.push(file);
          }
        }
      } else if (dt.files && dt.files.length) {
        droppedFiles.push(...Array.from(dt.files));
      }
      if (droppedFiles.length === 0) return;
      try {
        await uploadFiles(droppedFiles, dt.files);
      } catch (error: any) {
        console.error("Error uploading files to Supabase:", error);
        toast({
          title: "Upload failed",
          description: error?.message || "Failed to upload files to storage. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, uploadFiles],
  );

  const onAttachDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    attachDragDepthRef.current += 1;
    setIsDraggingAttach(true);
  }, []);

  const onAttachDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    attachDragDepthRef.current = Math.max(attachDragDepthRef.current - 1, 0);
    if (attachDragDepthRef.current === 0) {
      setIsDraggingAttach(false);
    }
  }, []);

  const onFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const newFiles = Array.from(e.target.files);
      try {
        await uploadFiles(newFiles, e.target.files);
      } catch (error: any) {
        console.error("Error uploading files to Supabase:", error);
        toast({
          title: "Upload failed",
          description: error?.message || "Failed to upload files to storage. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, uploadFiles],
  );

  const resetUploadFlow = useCallback(() => {
    setSelectedUtilityType(null);
    setSelectedRecordType(null);
    setSelectedGeometryType(null);
    setUploadedFiles([]);
    setFiles(null);
    setFileUrls(new Map());
    setIsDraggingAttach(false);
  }, []);

  return (
    <UploadSectionContext.Provider
      value={{
        selectedUtilityType,
        setSelectedUtilityType,
        selectedRecordType,
        setSelectedRecordType,
        selectedGeometryType,
        setSelectedGeometryType,
        uploadedFiles,
        setUploadedFiles,
        files,
        setFiles,
        fileUrls,
        setFileUrls,
        isDraggingAttach,
        onAttachDrop,
        onAttachDragOver,
        onAttachDragLeave,
        onFileInputChange,
        resetUploadFlow,
      }}
    >
      {children}
    </UploadSectionContext.Provider>
  );
}

export function useUploadSection() {
  const context = useContext(UploadSectionContext);
  if (!context) {
    throw new Error("useUploadSection must be used within an UploadSectionProvider");
  }
  return context;
}

