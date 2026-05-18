/**
 * Generic Decision Flow types — used by the DecisionFlowShell component and
 * all DF-stream decision tree configs (buy-vs-rent, salary-sacrifice, SMSF setup).
 */

export type DecisionOption = {
  label: string;
  detail?: string;
  nextId: string;
};

export type DecisionQuestionNode = {
  type: "question";
  id: string;
  question: string;
  detail?: string;
  options: DecisionOption[];
};

export type DecisionOutcomeNode = {
  type: "outcome";
  id: string;
  title: string;
  summary: string;
  recommendation: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  advisorCta?: boolean;
};

export type DecisionNode = DecisionQuestionNode | DecisionOutcomeNode;

export type DecisionFlow = {
  title: string;
  description: string;
  startId: string;
  nodes: Record<string, DecisionNode>;
};
