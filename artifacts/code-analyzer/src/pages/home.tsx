import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUpload } from "@/components/file-upload";
import { Progress } from "@/components/ui/progress";
import { useAnalyzeCode } from "@/hooks/use-analyze";
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  Download, 
  RefreshCcw, 
  FileSearch,
  CheckCircle2,
  FileText
} from "lucide-react";
import { type AnalysisResult } from "@workspace/api-client-react";

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  
  const { mutate: analyze, data: result, isPending, error, reset } = useAnalyzeCode();

  const handleAnalyze = () => {
    if (!file1 || !file2) return;
    analyze({ file1, file2 });
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    reset();
  };

  const generateReportText = (data: AnalysisResult) => {
    const divider = "================================================================";
    const smallDivider = "----------------------------------------------------------------";
    
    return `
${divider}
AI CODE PLAGIARISM & QUALITY ANALYZER REPORT
${divider}
Date: ${new Date().toLocaleString()}

SUMMARY
${smallDivider}
Files Analyzed:
1. ${data.file1Name}
2. ${data.file2Name}

Similarity Score: ${data.similarity}%
Plagiarism Risk Level: ${data.plagiarismLevel}

CODE QUALITY ANALYSIS
${smallDivider}

[ File: ${data.file1Name} ]
${data.suggestionsFile1.length > 0 
  ? data.suggestionsFile1.map(s => `* ${s}`).join("\n") 
  : "No major issues found. Good structure."}

[ File: ${data.file2Name} ]
${data.suggestionsFile2.length > 0 
  ? data.suggestionsFile2.map(s => `* ${s}`).join("\n") 
  : "No major issues found. Good structure."}

${divider}
End of Report
`;
  };

  const downloadReport = () => {
    if (!result) return;
    const text = generateReportText(result);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Analysis_Report_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelConfig = (level: string) => {
    switch (level) {
      case "Low":
        return { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50", progressColor: "bg-emerald-500", label: "Low Risk" };
      case "Medium":
        return { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", progressColor: "bg-amber-500", label: "Moderate Risk" };
      case "High":
        return { icon: ShieldAlert, color: "text-rose-500", bg: "bg-rose-50", progressColor: "bg-rose-500", label: "High Risk" };
      default:
        return { icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", progressColor: "bg-primary", label: "Unknown" };
    }
  };

  return (
    <div className="min-h-screen w-full relative pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/academic-bg.png`}
          alt="" 
          className="w-full h-full object-cover opacity-50 mix-blend-multiply"
        />
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 relative z-10">
        
        {/* Header Section */}
        <header className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl shadow-primary/5 mb-6 ring-1 ring-border">
            <FileSearch className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 tracking-tight">
            Code Integrity Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans">
            Upload academic programming submissions to instantly evaluate structural similarity and identify areas for code quality improvement.
          </p>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {!result && !isPending && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-border/50 p-6 md:p-10 max-w-3xl mx-auto"
              >
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                  <FileUpload 
                    label="Submission 1" 
                    file={file1} 
                    onFileSelect={setFile1} 
                  />
                  <FileUpload 
                    label="Submission 2" 
                    file={file2} 
                    onFileSelect={setFile2} 
                  />
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{error.message}</p>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleAnalyze}
                    disabled={!file1 || !file2}
                    className="
                      flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg
                      bg-primary text-primary-foreground 
                      shadow-lg shadow-primary/25
                      hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5
                      active:translate-y-0 active:shadow-md
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                      transition-all duration-200 ease-out
                    "
                  >
                    Analyze Submissions
                  </button>
                </div>
              </motion.div>
            )}

            {isPending && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileSearch className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">Analyzing AST Structures</h3>
                <p className="text-muted-foreground text-sm max-w-sm text-center">
                  Extracting syntactic trees and normalizing variable names to compute structural similarity...
                </p>
              </motion.div>
            )}

            {result && !isPending && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-8 max-w-4xl mx-auto"
              >
                {/* Top Stats Row */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Score Card */}
                  <div className="md:col-span-2 bg-white rounded-3xl shadow-xl shadow-primary/5 border border-border/50 p-8 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Structural Similarity</h3>
                    <div className="flex items-end gap-4 mb-4">
                      <span className="text-6xl font-serif font-bold text-primary leading-none">
                        {result.similarity}<span className="text-4xl text-muted-foreground">%</span>
                      </span>
                    </div>
                    <Progress 
                      value={result.similarity} 
                      className="h-3 bg-secondary" 
                      indicatorColor={getLevelConfig(result.plagiarismLevel).progressColor}
                    />
                  </div>

                  {/* Risk Level Card */}
                  <div className={`rounded-3xl border p-8 flex flex-col items-center justify-center text-center transition-colors ${getLevelConfig(result.plagiarismLevel).bg} border-${getLevelConfig(result.plagiarismLevel).color.split('-')[1]}-200`}>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 opacity-80">Assessment</h3>
                    {React.createElement(getLevelConfig(result.plagiarismLevel).icon, { 
                      className: `w-16 h-16 mb-4 ${getLevelConfig(result.plagiarismLevel).color}` 
                    })}
                    <span className={`text-2xl font-bold ${getLevelConfig(result.plagiarismLevel).color}`}>
                      {getLevelConfig(result.plagiarismLevel).label}
                    </span>
                  </div>
                </div>

                {/* Code Quality Section */}
                <div className="bg-white rounded-3xl shadow-xl shadow-primary/5 border border-border/50 overflow-hidden">
                  <div className="p-6 border-b border-border bg-secondary/30">
                    <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Code Quality Feedback
                    </h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                    {/* File 1 Suggestions */}
                    <div className="p-6 md:p-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-mono font-medium mb-6">
                        {result.file1Name}
                      </div>
                      <ul className="space-y-4">
                        {result.suggestionsFile1.length > 0 ? (
                          result.suggestionsFile1.map((suggestion, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-foreground">
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2"></span>
                              <span className="leading-relaxed">{suggestion}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex gap-3 text-sm text-muted-foreground items-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            No major quality issues detected.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* File 2 Suggestions */}
                    <div className="p-6 md:p-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-mono font-medium mb-6">
                        {result.file2Name}
                      </div>
                      <ul className="space-y-4">
                        {result.suggestionsFile2.length > 0 ? (
                          result.suggestionsFile2.map((suggestion, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-foreground">
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2"></span>
                              <span className="leading-relaxed">{suggestion}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex gap-3 text-sm text-muted-foreground items-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            No major quality issues detected.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    onClick={downloadReport}
                    className="
                      flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-primary
                      bg-white border-2 border-primary/20
                      hover:border-primary hover:bg-primary/5 hover:-translate-y-0.5
                      active:translate-y-0
                      transition-all duration-200 w-full sm:w-auto
                    "
                  >
                    <Download className="w-5 h-5" />
                    Download Report
                  </button>
                  <button
                    onClick={handleReset}
                    className="
                      flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white
                      bg-primary shadow-lg shadow-primary/20
                      hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5
                      active:translate-y-0
                      transition-all duration-200 w-full sm:w-auto
                    "
                  >
                    <RefreshCcw className="w-5 h-5" />
                    Analyze New Files
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
