// The shape of everything the dashboard shows for one client, put together
// from the database by src/lib/data/clients.ts. Dates are ISO strings and
// money is in dollars.

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
  /** Website Only: they asked to move to the Full Platform. */
  upgradeRequestedAt?: string;
};

export type Website = {
  plan: PlanId;
  /** PAST_DUE: the last monthly charge failed. CANCELLED: it has ended. */
  status: "ACTIVE" | "PAST_DUE" | "CANCELLING" | "CANCELLED";
  monthly: number;
  setupFee: number;
  domain: string;
  startedAt: string;
  targetLaunch?: string;
  liveUrl?: string;
  previewUrl?: string;
  /** Full Platform: the booking software's admin. */
  bookingAdminUrl?: string;
  /** The next 1st. Monthly billing starts the 1st after the setup fee. */
  nextBillingAt?: string;
  facts: ProjectFacts;
};

export type DocBlock = { heading: string; text: string };

export type Doc = {
  id: string;
  title: string;
  summary: string;
  /** The agreement is a build step; anything else is extra. */
  kind: "AGREEMENT" | "OTHER";
  /** INFO: for their records, nothing to sign. */
  status: "SIGNED" | "AWAITING" | "INFO";
  sentAt: string;
  signedAt?: string;
  signedBy?: string;
  body: DocBlock[];
  /** A PDF, for documents sent as a file. */
  fileUrl?: string;
  fileName?: string;
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
  /** The file itself, to download. */
  url?: string;
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

export type DesignId = string;

export type DesignOption = {
  id: DesignId;
  name: string;
  mood: string;
  palette: { name: string; hex: string }[];
  type: string;
  notes: string[];
  /** Screenshots of the design. */
  images?: string[];
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
  /** The habits ticked off, for the week that starts on `week`. */
  habitsDone?: { week: string; ids: string[] };
};

export type Invoice = {
  id: string;
  /** Sequential and never reused, e.g. "FNF-1004". */
  number: string;
  date: string;
  description: string;
  /** For a monthly plan: the month it covers. */
  period?: { from: string; to: string };
  amount: number;
  status: "PAID" | "DUE";
  paidAt?: string;
  /** How it was paid, e.g. "Visa ending 4242". */
  method?: string;
};

export type Card = {
  brand: string;
  last4: string;
  exp: string;
  expired?: boolean;
};

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
  contact: {
    name: string;
    email: string;
    phone: string;
    role: string;
    /** They've clicked the link we emailed when they signed up. */
    verified?: boolean;
  };
  /** Clients sign themselves up; website plans then wait for approval. */
  signedUpAt: string;
  /** When an admin approved them and set their plan and prices. */
  approvedAt?: string;
  /** What they asked for when they signed up. */
  request?: { plan?: PlanId | "LEADS"; message?: string };
  /** Admin-only notes. Clients never see these. */
  notes?: string;
  /** Archived: hidden, signed out, billing stopped. In the future: scheduled. */
  archivedAt?: string;
  website?: Website;
  leads: {
    /** On a trial, on (paid), or off. A trial past its end is off. */
    status: LeadsStatus;
    /** Exactly where billing is. */
    raw: "NONE" | "TRIAL" | "ACTIVE" | "CANCELLING" | "PAST_DUE" | "ENDED";
    startedAt?: string;
    trialEndsAt?: string;
    /** The next bill, or when it stops if cancelling. */
    nextBillingAt?: string;
    endedAt?: string;
    /** A card is set up to keep it after the trial. */
    subscribed: boolean;
    /** The studio's switch: off shows "being set up". */
    enabled: boolean;
  };
  documents: Doc[];
  answers: Answers;
  assets: Asset[];
  blueprint: BlueprintPage[];
  designs: Designs;
  changes: ChangeRequest[];
  growth?: Growth;
  invoices: Invoice[];
  card?: Card;
  /** They have a customer in Stripe. */
  stripeLinked?: boolean;
  threads: Thread[];
  activity: Activity[];
};
