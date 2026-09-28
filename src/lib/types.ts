import type { StatusKey } from "./lore";

export type RequestDTO = {
  id: number;
  code: string;
  title: string;
  emergencyType: string;
  island: string;
  locationDetail: string;
  severity: number;
  description: string;
  callerName: string;
  peopleAffected: number;
  status: StatusKey;
  crewId: number | null;
  crewName: string | null;
  crewColor: string | null;
  priorityScore: number;
  priorityTier: string;
  resolutionNote: string | null;
  createdAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
  priorityUpdatedAt: string;
};

export type EventDTO = {
  id: number;
  requestId: number;
  kind: string;
  message: string;
  actor: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  requestCode?: string;
  requestTitle?: string;
  requestSeverity?: number;
};

export type CrewDTO = {
  id: number;
  slug: string;
  name: string;
  captain: string;
  ship: string;
  specialty: string;
  color: string;
  motto: string;
  activeCount: number;
  resolvedCount: number;
  activeCodes: string[];
};

export type DashboardData = {
  generatedAt: string;
  active: RequestDTO[];
  resolved: RequestDTO[];
  crews: CrewDTO[];
  events: EventDTO[];
  stats: {
    active: number;
    unclaimed: number;
    critical: number;
    resolvedTotal: number;
    resolved24h: number;
    avgResolveMin: number | null;
    avgClaimMin: number | null;
    crewsAvailable: number;
    peopleAtRisk: number;
  };
};

export type RequestDetail = {
  request: RequestDTO;
  events: EventDTO[];
  crews: CrewDTO[];
  queuePosition: number | null;
};

export type HistoryData = {
  requests: RequestDTO[];
  events: EventDTO[];
  crews: CrewDTO[];
};
