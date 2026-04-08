import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default function ManagerIndexPage() {
  redirect(ROUTES.manager.dashboard);
}
