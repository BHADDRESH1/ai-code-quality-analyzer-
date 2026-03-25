import { Router, type IRouter } from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { AnalyzeCodeResponse } from "@workspace/api-zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router: IRouter = Router();

// Use memory storage — we only need file contents, not disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit per file
  // Accept all files here; we'll validate extensions in the handler so we can return
  // consistent 400 errors for unsupported types/languages.
  fileFilter: (_req, _file, cb) => cb(null, true),
});

router.post(
  "/analyze",
  upload.fields([
    { name: "file1", maxCount: 1 },
    { name: "file2", maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || !files["file1"] || !files["file2"]) {
      res.status(400).json({ error: "Both file1 and file2 are required" });
      return;
    }

    const file1 = files["file1"][0];
    const file2 = files["file2"][0];

    const source1 = file1.buffer.toString("utf8");
    const source2 = file2.buffer.toString("utf8");

    const getLanguageFromName = (name: string) => {
      const lower = (name || "").toLowerCase();
      if (lower.endsWith(".py")) return "Python";
      if (lower.endsWith(".c")) return "C++";
      if (lower.endsWith(".cpp")) return "C++";
      if (lower.endsWith(".java")) return "Java";
      return null;
    };

    const language1 = getLanguageFromName(file1.originalname);
    const language2 = getLanguageFromName(file2.originalname);

    if (!language1 || !language2) {
      res.status(400).json({ error: "Only Python, C, C++, and Java are supported" });
      return;
    }

    if (language1 !== language2) {
      res.status(400).json({ error: "Both files must be the same language" });
      return;
    }

    if (!source1.trim() || !source2.trim()) {
      res.status(400).json({ error: "One or both files are empty" });
      return;
    }

    const payload = JSON.stringify({
      source1,
      source2,
      name1: file1.originalname,
      name2: file2.originalname,
    });

    // Path to the Python analysis script
    const scriptPath = path.resolve(__dirname, "analyze.py");

    // Spawn Python process
    const python = spawn("python3", [scriptPath]);

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    python.on("close", (code: number) => {
      if (code !== 0) {
        // The python script prints JSON {"error": "..."} to stdout even when it fails.
        try {
          const parsedErr = JSON.parse(stdout);
          if (parsedErr?.error) {
            res.status(400).json({ error: parsedErr.error });
            return;
          }
        } catch {
          // fall through to generic error
        }

        req.log.error({ stderr, code }, "Python analysis script failed");
        res.status(500).json({ error: "Analysis failed: " + (stderr || "Unknown error") });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);

        if (parsed.error) {
          res.status(400).json({ error: parsed.error });
          return;
        }

        const validated = AnalyzeCodeResponse.parse(parsed);
        res.json(validated);
      } catch (err) {
        req.log.error({ err, stdout }, "Failed to parse Python output");
        res.status(500).json({ error: "Failed to parse analysis results" });
      }
    });

    python.on("error", (err: Error) => {
      req.log.error({ err }, "Failed to spawn Python process");
      res.status(500).json({ error: "Python interpreter not found. Please ensure python3 is installed." });
    });

    // Send the payload to the Python process via stdin
    python.stdin.write(payload);
    python.stdin.end();
  }
);

export default router;
