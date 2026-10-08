// The shape of everything the dashboard shows for one client. The sample
// clients in demo.ts fill it in today; after the move from the current
// site, the database fills in the same shape. Dates are ISO strings.

export type PlanId = "FULL_PLATFORM" | "WEBSITE_ONLY";

/** The Leads Tool on its own. Full Platform clients have it included. */
export type LeadsStatus = "NONE" | "TRIAL" | "ACTIVE";

/** The build, as a list of things that have happened. */
export type ProjectFacts = {
  agreementSignedAt?: string;
  setupFeePaidAt?: string;
  questionnaireSubmittedAt?: string;
  assetsCompleteAt?: string;
  blueprintApprovedAt?: string;
  designChosenAt?: string;
  /** Website Only: the link riders use to book today. */
  bookingLinkAddedAt?: string;
  /** Full Platform: payments, rates and drivers. */
  stripeConnectedAt?: string;
  ratesSetAt?: string;
  driversAddedAt?: string;
  previewReadyAt?: string;
  previewApprovedAt?: string;
  launchedAt?: string;
};

export type Website = {
  plan: PlanId;
  status: "ACTIVE" | "CANCELLING";
  monthly: number;
  setupFee: number;
  domain: string;
  startedAt: string;
  targetLaunch?: string;
  liveUrl?: string;
  previewUrl?: string;
  /** Full Platform: the booking software's admin. */
  bookingAdminUrl?: string;
  /** Monthly billing starts at launch. */
  nextBillingAt?: string;
  facts: ProjectFacts;
};

export type DocBlock = { heading: string; text: string };

export type Doc = {
  id: string;
  title: string;
  summary: string;
  status: "SIGNED" | "AWAITING";
  sentAt: string;
  signedAt?: string;
  signedBy?: string;
  body: DocBlock[];
};

export type Answers = Record<string, string | string[]>;

export type AssetLabel =
  "Logo" | "Fleet photo" | "Team photo" | "Brand guide" | "Other";

export type Asset = {
  id: string;
  name: string;
  label: AssetLabel;
  size: string;
  addedAt: string;
  /** A picture to show. Files without one show their type. */
  src?: string;
};

export type Comment = {
  id: string;
  from: "you" | "us";
  name: string;
  at: string;
  text: string;
};

export type SectionStatus = "DRAFT" | "REVIEW" | "APPROVED";

export type BlueprintSection = {
  id: string;
  title: string;
  status: SectionStatus;
  copy: string[];
  comments: Comment[];
};

export type BlueprintPage = {
  id: string;
  name: string;
  path: string;
  /** What the page is for, in a line. */
  purpose: string;
  /** The search it's written to rank for. */
  keyword?: string;
  sections: BlueprintSection[];
};

export type DesignId = "midnight" | "desert" | "studio";

export type DesignOption = {
  id: DesignId;
  name: string;
  mood: string;
  palette: { name: string; hex: string }[];
  type: string;
  notes: string[];
};

export type Designs = {
  readyAt?: string;
  options: DesignOption[];
  chosen?: DesignId;
  chosenAt?: string;
};

export type ChangeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";

export type ChangeRequest = {
  id: string;
  number: number;
  title: string;
  area: string;
  details: string;
  status: ChangeStatus;
  submittedAt: string;
  updatedAt?: string;
  reply?: string;
};

export type GrowthMonth = {
  /** The first day of the month. */
  month: string;
  target: number;
  actual?: number;
};

export type Growth = {
  months: GrowthMonth[];
  /** Visitors from search so far this month. */
  monthToDate: number;
  calls: { monthToDate: number; lastMonth: number };
  bookings: { label: string; monthToDate: number; lastMonth: number };
  reviews: { total: number; newThisMonth: number; rating: number };
  queries: {
    query: string;
    position: number;
    change: number;
    clicks: number;
  }[];
  notes: string[];
  habits: { id: string; text: string; detail: string }[];
};

export type Invoice = {
  id: string;
  number: string;
  date: string;
  description: string;
  amount: number;
  status: "PAID" | "DUE";
};

export type Card = { brand: string; last4: string; exp: string };

export type Message = {
  id: string;
  from: "you" | "us";
  name: string;
  at: string;
  text: string;
};

export type Thread = {
  id: string;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  unread?: boolean;
  messages: Message[];
};

export type ActivityKind =
  "build" | "change" | "document" | "growth" | "invoice" | "leads" | "support";

export type Activity = {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
  href?: string;
};

export type Client = {
  id: string;
  business: string;
  city: string;
  contact: { name: string; email: string; phone: string; role: string };
  website?: Website;
  leads: { status: LeadsStatus; startedAt?: string; trialEndsAt?: string };
  documents: Doc[];
  answers: Answers;
  assets: Asset[];
  blueprint: BlueprintPage[];
  designs: Designs;
  changes: ChangeRequest[];
  growth?: Growth;
  invoices: Invoice[];
  card?: Card;
  threads: Thread[];
  activity: Activity[];
};
