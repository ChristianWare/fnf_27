// The operators you're calling: where each one is, what a call can end in,
// and what happens next. Safe anywhere.

export const PROSPECT_STAGES = [
  "NEW",
  "CALLING",
  "INTERESTED",
  "INVITED",
  "TRIAL",
  "PROPOSAL",
  "WON",
  "LOST",
  "PARKED",
  "DO_NOT_CALL",
] as const;
export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const STAGE_LABELS: Record<ProspectStage, string> = {
  NEW: "New",
  CALLING: "Calling",
  INTERESTED: "Interested",
  INVITED: "Invited",
  TRIAL: "On a trial",
  PROPOSAL: "Proposal sent",
  WON: "Client",
  LOST: "Not now",
  PARKED: "Parked",
  DO_NOT_CALL: "Do not call",
};

/** Stages that never come up in the call queue. */
export const CLOSED_STAGES: ProspectStage[] = [
  "WON",
  "LOST",
  "PARKED",
  "DO_NOT_CALL",
];

export const CALL_OUTCOMES = [
  "NO_ANSWER",
  "VOICEMAIL",
  "CALLBACK",
  "INTERESTED",
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "DO_NOT_CALL",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  NO_ANSWER: "No answer",
  VOICEMAIL: "Left a voicemail",
  CALLBACK: "Call back on a date",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not interested",
  WRONG_NUMBER: "Wrong number",
  DO_NOT_CALL: "Asked not to be called",
};

/** No answer this many times in a row and they're parked. */
export const MAX_TRIES = 3;
/** Days until the next try, after each outcome. */
export const RETRY_DAYS = { NO_ANSWER: 2, VOICEMAIL: 3, INTERESTED: 2 };
/** Not interested: try once more after this many days. */
export const LOST_DAYS = 90;

export const PROSPECT_ACTIVITY = [
  "CALL",
  "NOTE",
  "EMAIL",
  "STAGE",
  "IMPORT",
  "SIGNUP",
] as const;
export type ProspectActivityKind = (typeof PROSPECT_ACTIVITY)[number];

/** Calls a day, until you set your own on the page. */
export const DEFAULT_DAILY_GOAL = 25;
export const GOAL_KEY = "prospectsDailyGoal";
