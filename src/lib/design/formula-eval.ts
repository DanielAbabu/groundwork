/**
 * Evaluates math expressions safely for capacity estimation inputs.
 * Accepts expressions like "50,000,000 / 86,400", "580 * 5", "(5,000 * 365 * 5 * 500) / 1,000,000,000".
 */

export interface FormulaEvalResult {
  value: number | null;
  expression: string;
  isFormula: boolean;
  error?: string | undefined;
}

export function evaluateFormula(input: string | number | null | undefined): FormulaEvalResult {
  if (input == null) {
    return { value: null, expression: "", isFormula: false };
  }

  if (typeof input === "number") {
    return { value: input, expression: String(input), isFormula: false };
  }

  const raw = input.trim();
  if (!raw) {
    return { value: null, expression: "", isFormula: false };
  }

  // Remove commas used as thousand separators, e.g. "50,000,000" -> "50000000"
  const sanitized = raw.replace(/,/g, "");

  // Check if purely numeric
  if (!Number.isNaN(Number(sanitized))) {
    return { value: Number(sanitized), expression: sanitized, isFormula: false };
  }

  // Security check: ensure string contains ONLY numbers, operators (+, -, *, /, .), spaces, and parentheses
  if (/[^0-9\s.+\-*/()]/g.test(sanitized)) {
    return {
      value: null,
      expression: raw,
      isFormula: true,
      error: "Invalid characters in expression. Use numbers and +, -, *, /, ( )",
    };
  }

  try {
    // Evaluate sanitized math expression safely
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const result = new Function(`"use strict"; return (${sanitized})`)() as unknown;
    if (typeof result === "number" && !Number.isNaN(result) && Number.isFinite(result)) {
      return {
        value: result,
        expression: raw,
        isFormula: true,
      };
    }
    return {
      value: null,
      expression: raw,
      isFormula: true,
      error: "Could not evaluate expression",
    };
  } catch {
    return {
      value: null,
      expression: raw,
      isFormula: true,
      error: "Syntax error in expression",
    };
  }
}
