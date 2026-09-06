export type MembershipStatus = "active" | "finished" | "cancelled";

export type MembershipUsage = {
  id: string;
  membershipId: string;
  appointmentId?: string | null;
  serviceName: string;
  barberName: string;
  usedAt: string;
  note: string;
  createdAt: string;
};

export type Membership = {
  id: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  planName: string;
  totalVisits: number;
  usedVisits: number;
  remainingVisits: number;
  accessCode: string;
  startDate: string;
  expiresDate?: string | null;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  usages: MembershipUsage[];
};

export function membershipStatusLabel(status: MembershipStatus) {
  return {
    active: "Ativo",
    finished: "Finalizado",
    cancelled: "Cancelado",
  }[status];
}
