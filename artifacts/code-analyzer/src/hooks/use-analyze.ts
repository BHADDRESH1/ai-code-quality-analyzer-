import { useMutation } from "@tanstack/react-query";
import { type AnalysisResult } from "@workspace/api-client-react";

export function useAnalyzeCode() {
  return useMutation({
    mutationFn: async ({ file1, file2 }: { file1: File; file2: File }): Promise<AnalysisResult> => {
      const formData = new FormData();
      formData.append("file1", file1);
      formData.append("file2", file2);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, browser will set it automatically with boundary for FormData
      });

      if (!res.ok) {
        let errorMsg = `Failed to analyze code (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData && typeof errorData.error === "string") {
            errorMsg = errorData.error;
          }
        } catch {
          // ignore parse error, use default message
        }
        throw new Error(errorMsg);
      }

      return res.json();
    },
  });
}
