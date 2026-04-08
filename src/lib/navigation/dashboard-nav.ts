import type { DashboardNavItem } from "@/components/layout/dashboard-shell";
import type { AppRole } from "@/types/roles";

/** Route prefixes — keep in sync with `src/app/(role)/...` segments. */
export const ROUTES = {
  home: "/",
  login: "/login",
  manager: {
    root: "/manager",
    dashboard: "/manager/dashboard",
    locations: "/manager/locations",
    members: "/manager/members",
    memberNew: "/manager/members/new",
    member: (id: string) => `/manager/members/${id}`,
    memberEdit: (id: string) => `/manager/members/${id}/edit`,
    schedule: "/manager/schedule",
    programs: "/manager/programs",
    programsAssign: "/manager/programs/assign",
    programTemplateNew: "/manager/programs/templates/new",
    programTemplate: (templateId: string) =>
      `/manager/programs/templates/${templateId}`,
    programClient: (programId: string) => `/manager/programs/clients/${programId}`,
    reports: "/manager/reports",
    library: "/manager/library",
  },
  trainer: {
    root: "/trainer",
    dashboard: "/trainer/dashboard",
    clients: "/trainer/clients",
    client: (clientId: string) => `/trainer/clients/${clientId}`,
    schedule: "/trainer/schedule",
    session: (sessionId: string) => `/trainer/sessions/${sessionId}`,
    sessionStart: (appointmentId: string) => `/trainer/sessions/start/${appointmentId}`,
    library: "/trainer/library",
  },
  client: {
    root: "/client",
    dashboard: "/client/dashboard",
    plan: "/client/plan",
    log: "/client/log",
    book: "/client/book",
    appointments: "/client/appointments",
    progress: "/client/progress",
    profile: "/client/profile",
    session: (sessionId: string) => `/client/sessions/${sessionId}`,
  },
} as const;

const managerNav: DashboardNavItem[] = [
  { label: "Dashboard", href: ROUTES.manager.dashboard },
  { label: "Locations", href: ROUTES.manager.locations },
  { label: "Members", href: ROUTES.manager.members },
  { label: "Schedule", href: ROUTES.manager.schedule },
  { label: "Programs", href: ROUTES.manager.programs },
  { label: "Reports", href: ROUTES.manager.reports },
  { label: "Exercise library", href: ROUTES.manager.library },
];

const trainerNav: DashboardNavItem[] = [
  { label: "Today", href: ROUTES.trainer.dashboard },
  { label: "Clients", href: ROUTES.trainer.clients },
  { label: "Schedule", href: ROUTES.trainer.schedule },
  { label: "Exercise library", href: ROUTES.trainer.library },
];

const clientNav: DashboardNavItem[] = [
  { label: "Dashboard", href: ROUTES.client.dashboard },
  { label: "My plan", href: ROUTES.client.plan },
  { label: "Log workout", href: ROUTES.client.log },
  { label: "Appointments", href: ROUTES.client.appointments },
  { label: "Progress", href: ROUTES.client.progress },
  { label: "Profile", href: ROUTES.client.profile },
];

export function getDashboardNav(role: AppRole): DashboardNavItem[] {
  switch (role) {
    case "manager":
      return managerNav;
    case "trainer":
      return trainerNav;
    case "client":
      return clientNav;
    default:
      return [];
  }
}
