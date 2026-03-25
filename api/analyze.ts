import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const detectLanguageFromName = (name: string | undefined): "Python" | "C++" | "Java" | null => {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.endsWith(".py")) return "Python";
  if (lower.endsWith(".c") || lower.endsWith(".cpp")) return "C++";
  if (lower.endsWith(".java")) return "Java";
  return null;
};

const normalizeText = (text: string) => {
  return text.replace(/\/\*[^]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").trim();
};

const computeSimilarity = (a: string, b: string): number => {
  const ta = normalizeText(a).split(/\s+/).filter(Boolean);
  const tb = normalizeText(b).split(/\s+/).filter(Boolean);
  if (ta.length === 0 && tb.length === 0) return 100;
  if (ta.length === 0 || tb.length === 0) return 0;
  let match = 0;
  const minlen = Math.min(ta.length, tb.length);
  for (let i = 0; i < minlen; i += 1) {
    if (ta[i] === tb[i]) match += 1;
  }
  const ratio = (2 * match) / (ta.length + tb.length);
  return Math.round(ratio * 10000) / 100;
};

const plagiarismLevel = (sim: number): "Low" | "Medium" | "High" => {
  if (sim < 40) return "Low";
  if (sim < 70) return "Medium";
  return "High";
};

const analyzeQuality = (source: string, language: string) => {
  if (!source.trim()) return ["File is empty. Please provide code content."];
  const suggestions: string[] = [];
  const lines = source.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > 20 && !/def\s+\w+\s*\(/.test(source) && language === "Python") {
    suggestions.push("Consider splitting code into functions for readability.");
  }
  if (!/\/\//.test(source) && !/\#/ .test(source)) {
    suggestions.push("Add comments to explain non-trivial logic.");
  }
  if (lines.some((line) => line.length > 120)) {
    suggestions.push("Break long lines to improve readability.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Code quality looks good. No major issues found.");
  }
  return suggestions;
};

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) {
      return res.status(400).json({ error: "Invalid form data" });
    }

    const file1 = files?.file1 as formidable.File | formidable.File[] | undefined;
    const file2 = files?.file2 as formidable.File | formidable.File[] | undefined;

    if (!file1 || !file2) {
      return res.status(400).json({ error: "Both file1 and file2 are required" });
    }

    const f1 = Array.isArray(file1) ? file1[0] : file1;
    const f2 = Array.isArray(file2) ? file2[0] : file2;

    if (!f1 || !f2 || !f1.filepath || !f2.filepath) {
      return res.status(400).json({ error: "Both file1 and file2 are required" });
    }

    const language1 = detectLanguageFromName(f1.originalFilename ?? undefined);
    const language2 = detectLanguageFromName(f2.originalFilename ?? undefined);

    if (!language1 || !language2) {
      return res.status(400).json({ error: "Only Python, C, C++, and Java are supported" });
    }
    if (language1 !== language2) {
      return res.status(400).json({ error: "Both files must be the same language" });
    }

    const source1 = fs.readFileSync(f1.filepath, "utf8");
    const source2 = fs.readFileSync(f2.filepath, "utf8");

    if (!source1.trim() || !source2.trim()) {
      return res.status(400).json({ error: "One or both files are empty" });
    }

    const similarity = computeSimilarity(source1, source2);
    const result = {
      similarity,
      plagiarismLevel: plagiarismLevel(similarity),
      suggestionsFile1: analyzeQuality(source1, language1),
      suggestionsFile2: analyzeQuality(source2, language2),
      file1Name: f1.originalFilename ?? "file1",
      file2Name: f2.originalFilename ?? "file2",
    };

    return res.status(200).json(result);
  });
}
