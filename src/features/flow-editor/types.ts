export interface FlowError {
  errorDescription: string;
  operationName: string;
  ruleId: string;
  fixInstructions: {
    markdownText: string;
    htmlText: string;
  };
}
