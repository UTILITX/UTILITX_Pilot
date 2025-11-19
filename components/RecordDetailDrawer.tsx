"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  MapPin,
  ZoomIn,
  Tag,
  Building2,
  Calendar,
  User,
  Image as ImageIcon,
  FileImage,
  Sparkles,
  Map,
  Globe,
  File,
  FileSpreadsheet,
  FileType,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSignedUrl } from "@/lib/supabase";
import { getThumbnail, getBlurThumb, getPreviewImage, getPdfThumbnail } from "@/lib/getThumbnail";

type RecordDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId?: string;
  filename?: string;
  thumbnail?: string;
  fileUrl?: string;
  filePath?: string;
  cloudinaryId?: string; // Cloudinary public_id for thumbnail generation
  intersectionGuess?: string;
  trustScore?: number;
  utilityType?: string;
  city?: string;
  textBlob?: string;
  geometryType?: string;
  recordType?: string;
  organization?: string;
  processedDate?: string;
  uploadedBy?: string;
  onZoomToRecord?: () => void;
  onViewFile?: () => void;
  isLoading?: boolean;
};

export function RecordDetailDrawer({
  open,
  onOpenChange,
  recordId,
  filename,
  thumbnail,
  fileUrl,
  filePath,
  intersectionGuess,
  trustScore,
  utilityType,
  city,
  textBlob,
  geometryType,
  recordType,
  organization,
  processedDate,
  uploadedBy,
  onZoomToRecord,
  onViewFile,
  isLoading = false,
  cloudinaryId,
}: RecordDetailDrawerProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  // Determine file type from filename or path
  const getFileType = (name?: string, path?: string): string => {
    const file = name || path || "";
    const ext = file.toLowerCase().split('.').pop() || "";
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return 'image';
    } else if (ext === 'pdf') {
      return 'pdf';
    } else if (['doc', 'docx'].includes(ext)) {
      return 'document';
    } else if (['xls', 'xlsx'].includes(ext)) {
      return 'spreadsheet';
    } else if (['txt', 'csv'].includes(ext)) {
      return 'text';
    } else if (['dwg', 'dxf'].includes(ext)) {
      return 'cad';
    }
    return 'unknown';
  };

  // Load thumbnail - prioritize Cloudinary, fallback to Supabase
  useEffect(() => {
    if (open && (cloudinaryId || filePath || fileUrl || thumbnail)) {
      setImageError(false);
      setImageLoading(true);
      setThumbnailUrl(null);
      
      // Determine file type
      const detectedType = getFileType(filename, filePath);
      setFileType(detectedType);

      // Generate thumbnail URL
      const loadThumbnail = async () => {
        try {
          // Priority 1: Cloudinary thumbnail (best quality, auto-generated)
          if (cloudinaryId) {
            const detectedType = getFileType(filename, filePath);
            if (detectedType === 'pdf') {
              // PDF: Get first page as image
              const pdfThumb = getPdfThumbnail(cloudinaryId, 800, 600);
              if (pdfThumb) {
                setThumbnailUrl(pdfThumb);
                setImageLoading(false);
                return;
              }
            } else {
              // Images and other files: Get optimized preview
              const previewUrl = getPreviewImage(cloudinaryId, 800, 600);
              if (previewUrl) {
                setThumbnailUrl(previewUrl);
                setImageLoading(false);
                return;
              }
            }
          }

          // Priority 2: Thumbnail prop (base64 or URL)
          if (thumbnail) {
            setThumbnailUrl(thumbnail);
            setImageLoading(false);
            return;
          }

          // Priority 3: Supabase signed URL (fallback)
          if (filePath) {
            const signedUrl = await getSignedUrl(filePath, 3600);
            setThumbnailUrl(signedUrl);
            setImageLoading(false);
          } else if (fileUrl && fileUrl.startsWith("http")) {
            setThumbnailUrl(fileUrl);
            setImageLoading(false);
          } else {
            // No file available
            setImageError(true);
            setImageLoading(false);
          }
        } catch (error) {
          console.error("Error loading thumbnail:", error);
          setImageError(true);
          setImageLoading(false);
        }
      };

      loadThumbnail();
    } else if (!open) {
      // Reset when drawer closes
      setThumbnailUrl(null);
      setImageError(false);
      setImageLoading(true);
      setFileType(null);
    }
  }, [open, cloudinaryId, filePath, fileUrl, thumbnail, filename]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTrustScore = (score?: number) => {
    if (score === undefined || score === null) return "N/A";
    return `${Math.round(score * 100)}%`;
  };

  const getTrustScoreColor = (score?: number) => {
    if (score === undefined || score === null) return "text-gray-500";
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const isPdf = fileType === 'pdf';
  const isImage = fileType === 'image';
  const isDocument = fileType === 'document';
  const isSpreadsheet = fileType === 'spreadsheet';
  const isText = fileType === 'text';
  const isCad = fileType === 'cad';
  const isUnknown = fileType === 'unknown' || !fileType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="group w-full sm:w-[420px] lg:w-[480px] overflow-y-auto p-6 bg-white border-l border-[var(--utilitx-gray-200)] animate-slideInRight animate-fadeIn"
        style={{ boxShadow: "var(--utilitx-shadow-md)" }}
      >
        <SheetHeader className="mb-4 animate-slideUpFade">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold text-[var(--utilitx-gray-900)] flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {recordId ? `Record: ${recordId}` : "Record Details"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-sm text-[var(--utilitx-gray-600)]">
            {filename || "View record information"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {isLoading ? (
            // Loading state with shimmer/skeleton
            <div className="space-y-4 animate-slideUpFade">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Thumbnail/Preview */}
              {(thumbnailUrl || fileUrl || filePath) && (
                <div className="animate-slideUpFade" style={{ animationDelay: "0.1s" }}>
                  <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-3">Preview</h3>
                  <div className="relative w-full h-[320px] sm:h-[380px] bg-white rounded-xl overflow-hidden border border-[var(--utilitx-gray-200)] shadow-[0_8px_30px_rgba(1,30,49,0.08)] group transition-all">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--utilitx-gray-50)] z-10">
                        <Skeleton className="h-full w-full" />
                      </div>
                    )}
                    {!imageError && thumbnailUrl ? (
                      <>
                        {isPdf ? (
                          <object
                            data={thumbnailUrl}
                            type="application/pdf"
                            className={cn(
                              "w-full h-full",
                              imageLoading && "opacity-0"
                            )}
                            onLoad={() => setImageLoading(false)}
                            onError={() => {
                              // Fallback to iframe if object tag fails
                              setImageError(false);
                              setImageLoading(false);
                            }}
                          >
                            <iframe
                              src={thumbnailUrl}
                              className="w-full h-full"
                              title={filename || "PDF preview"}
                              onLoad={() => setImageLoading(false)}
                            />
                          </object>
                        ) : isImage ? (
                          <img
                            src={thumbnailUrl}
                            alt={filename || "Record preview"}
                            className={cn(
                              "w-full h-full object-contain transition-opacity duration-300",
                              imageLoading && "opacity-0"
                            )}
                            onLoad={() => setImageLoading(false)}
                            onError={() => {
                              setImageError(true);
                              setImageLoading(false);
                            }}
                          />
                        ) : (
                          // For non-image, non-PDF files, show file type icon with clickable overlay
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                            <div className="mb-3">
                              {isDocument && <FileText className="h-16 w-16 text-[var(--utilitx-gray-400)]" />}
                              {isSpreadsheet && <FileSpreadsheet className="h-16 w-16 text-[var(--utilitx-gray-400)]" />}
                              {isText && <FileType className="h-16 w-16 text-[var(--utilitx-gray-400)]" />}
                              {isCad && <FileCode className="h-16 w-16 text-[var(--utilitx-gray-400)]" />}
                              {isUnknown && <File className="h-16 w-16 text-[var(--utilitx-gray-400)]" />}
                            </div>
                            <p className="text-sm text-[var(--utilitx-gray-600)] text-center break-all px-2">
                              {filename || "File preview"}
                            </p>
                            <p className="text-xs text-[var(--utilitx-gray-500)] mt-1">
                              Click "View File" to open
                            </p>
                          </div>
                        )}
                        {/* Click overlay to view full file - only for images */}
                        {onViewFile && isImage && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onViewFile();
                            }}
                            className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center z-20"
                            aria-label="View full file"
                          >
                            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium text-[var(--utilitx-gray-900)]">
                              <FileText className="h-4 w-4" />
                              View Full File
                            </div>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--utilitx-gray-400)] p-4">
                        <FileImage className="h-12 w-12 mb-2" />
                        <p className="text-sm text-center">
                          {imageError ? "Preview unavailable" : "Loading preview..."}
                        </p>
                        {filename && (
                          <p className="text-xs text-[var(--utilitx-gray-500)] mt-1 text-center break-all px-2">
                            {filename}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-[var(--utilitx-gray-200)]" />

              {/* Details Section */}
              <div className="space-y-4 animate-slideUpFade" style={{ animationDelay: "0.15s" }}>
                {/* Intersection Guess */}
                {intersectionGuess && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">
                        Intersection Guess
                      </h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{intersectionGuess}</p>
                    </div>
                  </div>
                )}

                {/* Trust Score */}
                {trustScore !== undefined && trustScore !== null && (
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Trust Score</h3>
                      <p className={cn("text-sm font-medium", getTrustScoreColor(trustScore))}>
                        {formatTrustScore(trustScore)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Utility Type */}
                {utilityType && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Utility Type</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{utilityType}</p>
                    </div>
                  </div>
                )}

                {/* City */}
                {city && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">City</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{city}</p>
                    </div>
                  </div>
                )}

                {/* Geometry Type */}
                {geometryType && (
                  <div className="flex items-start gap-3">
                    <Map className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Geometry Type</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{geometryType}</p>
                    </div>
                  </div>
                )}

                {/* Record Type */}
                {recordType && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Record Type</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{recordType}</p>
                    </div>
                  </div>
                )}

                {/* Organization */}
                {organization && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Organization</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{organization}</p>
                    </div>
                  </div>
                )}

                {/* Processed Date */}
                {processedDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Processed Date</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{formatDate(processedDate) || processedDate}</p>
                    </div>
                  </div>
                )}

                {/* Uploaded By */}
                {uploadedBy && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-[var(--utilitx-gray-500)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-1">Uploaded By</h3>
                      <p className="text-sm text-[var(--utilitx-gray-900)]">{uploadedBy}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Summary (text_blob) */}
              {textBlob && (
                <div className="animate-slideUpFade" style={{ animationDelay: "0.2s" }}>
                  <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-2">AI Summary</h3>
                  <div className="bg-[var(--utilitx-gray-50)] border border-[var(--utilitx-gray-200)] rounded-lg p-3 min-h-[60px]">
                    <p className="text-sm text-[var(--utilitx-gray-700)] whitespace-pre-wrap leading-relaxed">
                      {textBlob}
                    </p>
                  </div>
                </div>
              )}

              <Separator className="bg-[var(--utilitx-gray-200)]" />

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 animate-slideUpFade" style={{ animationDelay: "0.25s" }}>
                {onZoomToRecord && (
                  <Button
                    onClick={onZoomToRecord}
                    className="w-full bg-[var(--utilitx-blue)] hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <ZoomIn className="h-4 w-4 mr-2" />
                    Zoom to Record
                  </Button>
                )}
                {onViewFile && (fileUrl || filePath) && (
                  <Button
                    onClick={onViewFile}
                    variant="outline"
                    className="w-full border-[var(--utilitx-gray-200)] text-[var(--utilitx-gray-900)] hover:bg-[var(--utilitx-gray-100)] transition-all duration-200"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View File
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

