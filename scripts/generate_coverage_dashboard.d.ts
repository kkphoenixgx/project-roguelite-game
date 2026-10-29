export interface MetricSummary {
  total: number;
  covered: number;
  skipped?: number;
  pct: number;
}

export interface RawFileMetrics {
  lines?: MetricSummary;
  functions?: MetricSummary;
  statements?: MetricSummary;
  branches?: MetricSummary;
}

export interface RawCoverageSummary {
  total: RawFileMetrics;
  [filePath: string]: RawFileMetrics;
}

export interface FileAnalysisEntry {
  path: string;
  module: string;
  lines: MetricSummary;
  branches: MetricSummary;
  functions: MetricSummary;
  statements: MetricSummary;
  avgPct: number;
  isPassing: boolean;
}

export interface ModuleAnalysis {
  name: string;
  filesCount: number;
  linesTotal: number;
  linesCovered: number;
  branchesTotal: number;
  branchesCovered: number;
  functionsTotal: number;
  functionsCovered: number;
  statementsTotal: number;
  statementsCovered: number;
}

export interface CoverageAnalysisResult {
  total: RawFileMetrics;
  files: FileAnalysisEntry[];
  modules: Record<string, ModuleAnalysis>;
  failingFiles: FileAnalysisEntry[];
  passingFiles: FileAnalysisEntry[];
  meetsThreshold: boolean;
}

export declare const THRESHOLD: number;
export declare function analyzeCoverage(rawSummary: RawCoverageSummary): CoverageAnalysisResult;
export declare function generateHtml(analysis: CoverageAnalysisResult): string;
export declare function main(): void;
