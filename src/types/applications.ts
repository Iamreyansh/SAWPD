export type SalesCadence = "daily" | "weekly" | "monthly";
export type Niche = "fashion" | "beauty" | "home" | "art" | "jewelry" | "other";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type Plan = "weekly" | "monthly";

export type ApplicationInput = {
  fullName: string;
  instagramHandle: string;
  email: string;
  phone: string;
  storeName: string;
  niche: Niche;
  followerCount: number;
  salesCadence: SalesCadence;
  salesCount: number;
  averageOrderValue: number;
  currentSetup: string;
  websiteUrl?: string;
  topProducts: string;
  referralSource: string;
  motivation: string;
};

export type Application = ApplicationInput & {
  id: string;
  createdAt: string;
  status: ApplicationStatus;
  reviewedAt?: string;
  reviewerNote?: string;
  trialEndsAt?: string;
  plan?: Plan;
  /**
   * Foreign key into data/sellers.json. Set when the applicant is
   * signed in at submit time, so the application can be linked back
   * to the seller's account for onboarding.
   */
  sellerId?: string;
};

export type ApplicationStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  activeTrials: number;
  trialsEndingSoon: number;
};
