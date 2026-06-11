/**
 * lib/advisor-completeness.ts
 *
 * Public re-export alias for the profile-completeness module.
 * The canonical implementation lives at lib/advisor-portal/profile-completeness.ts.
 * Import from here when working outside the advisor-portal directory, or from
 * the canonical path when inside it.
 */
export {
  deriveProfileCompleteness,
  COMPLETENESS_FIELDS,
  WIZARD_STEPS,
} from "@/lib/advisor-portal/profile-completeness";
export type {
  CompletenessFieldDef,
  CompletenessResult,
  FieldStatus,
  StepStatus,
  WizardStepDef,
  WizardStepId,
} from "@/lib/advisor-portal/profile-completeness";
