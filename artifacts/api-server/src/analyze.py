"""
Python Code Plagiarism and Quality Analyzer
Uses AST (Abstract Syntax Tree) to compare code structure
and check for quality issues in Python files.
"""

import ast
import sys
import json
import re


def normalize_ast(tree):
    """
    Normalize AST by replacing variable names with generic placeholders.
    This allows comparison based on structure, ignoring variable naming.
    """
    for node in ast.walk(tree):
        # Replace all Name nodes (variables) with a generic name
        if isinstance(node, ast.Name):
            node.id = "VAR"
        # Replace all function argument names with generic names
        elif isinstance(node, ast.arg):
            node.arg = "ARG"
        # Replace all function definition names with generic names
        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            node.name = "FUNC"
        # Replace all class names
        elif isinstance(node, ast.ClassDef):
            node.name = "CLASS"
        # Replace string constants
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            node.value = "STR"
        # Replace numeric constants
        elif isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            node.value = 0
    return tree


def ast_to_sequence(tree):
    """
    Convert AST to a flat sequence of node types for comparison.
    This sequence captures the structural pattern of the code.
    """
    sequence = []
    for node in ast.walk(tree):
        sequence.append(type(node).__name__)
    return sequence


def calculate_similarity(seq1, seq2):
    """
    Calculate similarity between two sequences using LCS (Longest Common Subsequence).
    Returns a percentage from 0 to 100.
    """
    if not seq1 and not seq2:
        return 100.0
    if not seq1 or not seq2:
        return 0.0

    # Use dynamic programming for LCS
    m, n = len(seq1), len(seq2)

    # For large sequences, sample to avoid memory issues
    MAX_LEN = 500
    if m > MAX_LEN:
        step = m // MAX_LEN
        seq1 = seq1[::step]
        m = len(seq1)
    if n > MAX_LEN:
        step = n // MAX_LEN
        seq2 = seq2[::step]
        n = len(seq2)

    # DP table for LCS
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if seq1[i - 1] == seq2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    lcs_length = dp[m][n]
    # Similarity as ratio of LCS to the average of both lengths
    similarity = (2 * lcs_length) / (m + n) * 100
    return round(similarity, 2)


def get_plagiarism_level(similarity):
    """
    Classify plagiarism level based on similarity percentage.
    Low: 0-40%, Medium: 40-70%, High: 70-100%
    """
    if similarity < 40:
        return "Low"
    elif similarity < 70:
        return "Medium"
    else:
        return "High"


def check_short_variable_names(tree, source_lines):
    """
    Check for short (single or double letter) variable names, excluding common loop vars.
    """
    common_short = {"i", "j", "k", "n", "x", "y", "z", "a", "b", "c"}
    short_vars = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            if len(node.id) <= 2 and node.id.lower() in common_short:
                short_vars.add(node.id)
    return short_vars


def check_has_functions(tree):
    """Check if the code defines any functions."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return True
    return False


def count_lines(source):
    """Count non-empty, non-comment lines."""
    lines = [l for l in source.splitlines() if l.strip() and not l.strip().startswith("#")]
    return len(lines)


def analyze_quality(source, filename):
    """
    Analyze code quality and return a list of improvement suggestions.
    """
    suggestions = []

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        suggestions.append(f"Syntax error in file: {e}")
        return suggestions

    # Check for short variable names
    short_vars = check_short_variable_names(tree, source.splitlines())
    if short_vars:
        suggestions.append(
            "Use meaningful variable names instead of a, b, x, y"
        )

    # Check for lack of functions (modularity)
    has_functions = check_has_functions(tree)
    line_count = count_lines(source)
    if not has_functions and line_count > 10:
        suggestions.append(
            "Consider breaking your code into functions for better modularity and readability"
        )

    # Check for too many lines
    if line_count > 200:
        suggestions.append(
            f"File has {line_count} lines of code (recommended max: 200). "
            "Consider splitting into multiple modules"
        )

    # Check for missing docstrings in functions
    missing_docs = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if not (node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant)):
                missing_docs.append(node.name)
    if missing_docs:
        names = ", ".join(missing_docs[:3])
        extra = f" and {len(missing_docs) - 3} more" if len(missing_docs) > 3 else ""
        suggestions.append(f"Add docstrings to functions: {names}{extra}")

    # Check for missing comments
    has_comments = any(l.strip().startswith("#") for l in source.splitlines())
    if not has_comments and line_count > 15:
        suggestions.append("Add comments to explain what your code does")

    # Check for magic numbers (raw numbers in expressions)
    magic_numbers = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            if node.value not in (0, 1, -1, 2, True, False) and node.value is not None:
                magic_numbers.append(node.value)
    if len(magic_numbers) > 3:
        suggestions.append(
            "Consider using named constants instead of magic numbers "
            f"(e.g., {magic_numbers[0]}, {magic_numbers[1]}...)"
        )

    if not suggestions:
        suggestions.append("Code quality looks good! No major issues found.")

    return suggestions


def main():
    """Main entry point — reads file paths from stdin JSON, outputs results as JSON."""
    try:
        data = json.loads(sys.stdin.read())
        source1 = data["source1"]
        source2 = data["source2"]
        name1 = data.get("name1", "file1.py")
        name2 = data.get("name2", "file2.py")

        # Parse ASTs
        try:
            tree1 = ast.parse(source1)
        except SyntaxError as e:
            print(json.dumps({"error": f"Syntax error in {name1}: {e}"}))
            sys.exit(1)

        try:
            tree2 = ast.parse(source2)
        except SyntaxError as e:
            print(json.dumps({"error": f"Syntax error in {name2}: {e}"}))
            sys.exit(1)

        # Normalize ASTs (ignore variable names for structural comparison)
        normalize_ast(tree1)
        normalize_ast(tree2)

        # Convert to node type sequences
        seq1 = ast_to_sequence(tree1)
        seq2 = ast_to_sequence(tree2)

        # Calculate similarity
        similarity = calculate_similarity(seq1, seq2)
        plagiarism_level = get_plagiarism_level(similarity)

        # Re-parse originals for quality analysis (without normalization)
        tree1_orig = ast.parse(source1)
        tree2_orig = ast.parse(source2)

        suggestions1 = analyze_quality(source1, name1)
        suggestions2 = analyze_quality(source2, name2)

        result = {
            "similarity": similarity,
            "plagiarismLevel": plagiarism_level,
            "suggestionsFile1": suggestions1,
            "suggestionsFile2": suggestions2,
            "file1Name": name1,
            "file2Name": name2,
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
