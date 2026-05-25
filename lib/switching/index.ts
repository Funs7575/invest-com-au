/**
 * lib/switching — barrel export.
 *
 * Switching-as-a-service: factual step-by-step checklists + cost-of-staying
 * estimates for broker, super, and savings account switching.
 *
 * AFSL-safe: factual process guidance + cost estimates only.
 * No personal recommendation is ever made here.
 */

export {
  BROKER_CHECKLIST,
  SUPER_CHECKLIST,
  SAVINGS_CHECKLIST,
  SWITCH_TYPES,
  getChecklist,
} from "./checklist";

export type { SwitchStep, SwitchChecklist, SwitchType } from "./checklist";

export {
  parseFee,
  calcBrokerSaving,
  calcSuperSaving,
  calcSavingsSaving,
} from "./savings";

export type {
  BrokerFeeInputs,
  BrokerSavingResult,
  SuperFeeInputs,
  SuperSavingResult,
  SavingsFeeInputs,
  SavingsSavingResult,
} from "./savings";
