import { useMutation, useQuery, useAction } from "convex/react";
import {
  Upload,
  FileText,
  Loader2,
  Search,
  Trash2,
  ExternalLink,
  Briefcase,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Zap,
  Globe,
  ArrowRight,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";

const statusSteps = [
  { key: "uploading", label: "Uploading", progress: 10 },
  { key: "parsing", label: "Reading CV", progress: 30 },
  { key: "extracting", label: "Analyzing Profile", progress: 55 },
  { key: "searching", label: "Searching Jobs", progress: 80 },
  { key: "complete", label: "Complete", progress: 100 },
];

function getStatusInfo(status: string) {
  return statusSteps.find((s) => s.key === status) || statusSteps[0];
}

export function JobScannerPage() {
  const sessionId = getSessionId();
  const scans = useQuery(api.scans.listScans, { sessionId }) || [];
  const generateUploadUrl = useMutation(api.scans.generateUploadUrl);
  const createScan = useMutation(api.scans.createScan);
  const processScan = useAction(api.scans.processScan);
  const deleteScan = useMutation(api.scans.deleteScan);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-select the latest scan
  useEffect(() => {
    if (scans.length > 0 && !selectedScanId) {
      setSelectedScanId(scans[0]._id);
    }
  }, [scans, selectedScanId]);

  const activeScan = scans.find((s) => s._id === selectedScanId);
  const isProcessing = activeScan && !["complete", "error"].includes(activeScan.status);

  const handleFile = useCallback(
    async (file: File) => {
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
        toast.error("Please upload a PDF or DOCX file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }

      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        const scanId = await createScan({
          sessionId,
          fileName: file.name,
          fileId: storageId,
        });
        toast.success("CV uploaded! Scanning for jobs...");
        setSelectedScanId(scanId);
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
        processScan({ scanId }).catch((err) => {
          console.error("Processing error:", err);
        });
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl, createScan, processScan, sessionId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDelete = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteScan({ scanId: scanId as any });
      if (selectedScanId === scanId) {
        setSelectedScanId(scans.length > 1 ? scans.find((s) => s._id !== scanId)?._id || null : null);
      }
      toast.success("Scan deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Zap className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
              JobScan
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Globe className="size-4" />
            <span className="hidden sm:inline">AI-Powered Job Matching</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent" />
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
            <Sparkles className="size-4" />
            No sign-up required — just upload and go
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Drop your CV,
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              discover matching jobs
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Our AI reads your resume, understands your skills and experience, then searches the web for real job openings that match your profile.
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 -mt-2 pb-12">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer
            transition-all duration-300 ease-out group
            ${isDragging
              ? "border-violet-500 bg-violet-50 scale-[1.02] shadow-xl shadow-violet-100"
              : "border-slate-300 hover:border-violet-400 hover:bg-violet-50/50 hover:shadow-lg hover:shadow-violet-100/50"
            }
            ${isUploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {isUploading ? (
            <div className="space-y-4">
              <div className="size-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto">
                <Loader2 className="size-8 animate-spin text-violet-600" />
              </div>
              <p className="text-lg font-semibold text-violet-700">Uploading your CV...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                <Upload className="size-8 text-violet-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">
                  Drop your CV here or{" "}
                  <span className="text-violet-600 underline underline-offset-4 decoration-violet-300">
                    browse files
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1.5">
                  Supports PDF and DOCX • Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* How it works pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {[
            { icon: FileText, text: "Upload your CV" },
            { icon: ArrowRight, text: "" },
            { icon: Sparkles, text: "AI extracts skills" },
            { icon: ArrowRight, text: "" },
            { icon: Search, text: "Finds matching jobs" },
          ].map((item, i) =>
            item.text ? (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-600 shadow-sm">
                <item.icon className="size-4 text-violet-500" />
                {item.text}
              </div>
            ) : (
              <div key={i} className="flex items-center text-slate-300">
                <item.icon className="size-4" />
              </div>
            ),
          )}
        </div>
      </section>

      {/* Results Section */}
      <div ref={resultsRef} />
      {scans.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          {/* Scan History Tabs */}
          {scans.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
              {scans.map((scan) => (
                <button
                  key={scan._id}
                  onClick={() => setSelectedScanId(scan._id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                    transition-all duration-200 group/tab
                    ${selectedScanId === scan._id
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                    }
                  `}
                >
                  <FileText className="size-4" />
                  <span className="max-w-[150px] truncate">{scan.fileName}</span>
                  {scan.status === "complete" && (
                    <CheckCircle2 className={`size-4 ${selectedScanId === scan._id ? "text-violet-200" : "text-emerald-500"}`} />
                  )}
                  {!["complete", "error"].includes(scan.status) && (
                    <Loader2 className={`size-4 animate-spin ${selectedScanId === scan._id ? "text-violet-200" : "text-violet-500"}`} />
                  )}
                  {scan.status === "error" && (
                    <AlertCircle className={`size-4 ${selectedScanId === scan._id ? "text-violet-200" : "text-red-500"}`} />
                  )}
                  <button
                    onClick={(e) => handleDelete(scan._id, e)}
                    className={`size-5 rounded-full flex items-center justify-center opacity-0 group-hover/tab:opacity-100 transition-opacity
                      ${selectedScanId === scan._id ? "hover:bg-violet-500" : "hover:bg-slate-200"}
                    `}
                  >
                    <X className="size-3" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Processing State */}
          {activeScan && isProcessing && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-10 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto">
                  <Loader2 className="size-10 animate-spin text-violet-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {getStatusInfo(activeScan.status).label}...
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {activeScan.status === "parsing" && "Reading and extracting text from your resume..."}
                    {activeScan.status === "extracting" && "Analyzing your skills, experience, and qualifications..."}
                    {activeScan.status === "searching" && "Searching the web for matching job openings..."}
                    {activeScan.status === "uploading" && "Uploading your file..."}
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${getStatusInfo(activeScan.status).progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 px-1">
                  {statusSteps.slice(0, -1).map((step) => (
                    <span
                      key={step.key}
                      className={activeScan.status === step.key ? "text-violet-600 font-semibold" : ""}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {activeScan && activeScan.status === "error" && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-10 text-center">
              <AlertCircle className="size-12 text-red-400 mx-auto" />
              <h3 className="text-lg font-bold text-red-800 mt-4">Processing Failed</h3>
              <p className="text-sm text-red-600 mt-2 max-w-md mx-auto">
                {activeScan.errorMessage || "Something went wrong. Please try uploading again."}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Complete State */}
          {activeScan && activeScan.status === "complete" && (
            <div className="space-y-6">
              {/* Profile Card */}
              {activeScan.extractedProfile && (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                      <Sparkles className="size-5" />
                      Your Profile
                    </h2>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar */}
                      <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        {activeScan.extractedProfile.name
                          ? activeScan.extractedProfile.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div className="space-y-1">
                        {activeScan.extractedProfile.name && (
                          <h3 className="text-xl font-bold text-slate-800">
                            {activeScan.extractedProfile.name}
                          </h3>
                        )}
                        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                          {activeScan.extractedProfile.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {activeScan.extractedProfile.location}
                            </span>
                          )}
                          {activeScan.extractedProfile.email && (
                            <span className="flex items-center gap-1">
                              <Globe className="size-3.5" />
                              {activeScan.extractedProfile.email}
                            </span>
                          )}
                        </div>
                        {activeScan.extractedProfile.summary && (
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            {activeScan.extractedProfile.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    {activeScan.extractedProfile.skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {activeScan.extractedProfile.skills.slice(0, 20).map((skill: string, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100"
                            >
                              {skill}
                            </span>
                          ))}
                          {activeScan.extractedProfile.skills.length > 20 && (
                            <span className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium border border-slate-200">
                              +{activeScan.extractedProfile.skills.length - 20} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Experience & Education in 2 cols */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      {activeScan.extractedProfile.experience?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Briefcase className="size-3.5" /> Experience
                          </p>
                          <div className="space-y-2.5">
                            {activeScan.extractedProfile.experience.slice(0, 4).map((exp: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <Building2 className="size-4 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">{exp.title}</p>
                                  <p className="text-xs text-slate-400">
                                    {exp.company}{exp.duration ? ` · ${exp.duration}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeScan.extractedProfile.education?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <GraduationCap className="size-3.5" /> Education
                          </p>
                          <div className="space-y-2.5">
                            {activeScan.extractedProfile.education.slice(0, 3).map((edu: any, i: number) => (
                              <div key={i} className="flex gap-3">
                                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <GraduationCap className="size-4 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">{edu.degree}</p>
                                  {edu.institution && (
                                    <p className="text-xs text-slate-400">{edu.institution}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Job Results */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <Briefcase className="size-5" />
                    Matching Jobs
                  </h2>
                  {activeScan.jobs && (
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                      {activeScan.jobs.length} found
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {(!activeScan.jobs || activeScan.jobs.length === 0) && (
                    <div className="p-12 text-center">
                      <Search className="size-10 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500 mt-3">
                        No matching jobs found. Try uploading a more detailed resume.
                      </p>
                    </div>
                  )}
                  {activeScan.jobs?.map((job: any, i: number) => (
                    <div
                      key={i}
                      className="p-5 hover:bg-slate-50/80 transition-colors group/job"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="size-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                              <Building2 className="size-5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 leading-snug">{job.title}</h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                <span className="flex items-center gap-1 text-sm text-slate-500">
                                  <Building2 className="size-3.5" />
                                  {job.company}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-slate-500">
                                  <MapPin className="size-3.5" />
                                  {job.location}
                                </span>
                                {job.source && (
                                  <span className="text-xs text-slate-400">via {job.source}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 ml-13">
                            {job.description}
                          </p>
                          {job.matchReason && (
                            <p className="text-xs text-violet-600 flex items-center gap-1 ml-13">
                              <Sparkles className="size-3" />
                              {job.matchReason}
                            </p>
                          )}
                        </div>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 opacity-80 group-hover/job:opacity-100"
                          >
                            Apply
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Single scan delete button */}
              {scans.length === 1 && (
                <div className="text-center">
                  <button
                    onClick={(e) => handleDelete(activeScan._id, e)}
                    className="text-sm text-slate-400 hover:text-red-500 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Delete this scan
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Zap className="size-3.5 text-white" />
            </div>
            <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">JobScan</span>
          </div>
          <p>AI-powered job matching • No account needed</p>
        </div>
      </footer>
    </div>
  );
}
