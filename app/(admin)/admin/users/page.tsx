import { getServerServices } from "@/core/server";
import { UsersClient, AdminUserListItem } from "./users-client";

export default async function AdminUsersPage() {
  const services = await getServerServices();

  let mappedUsers: AdminUserListItem[] = [];

  try {
    const profiles = await services.profile.listProfiles(100).catch(() => []);
    if (profiles && profiles.length > 0) {
      mappedUsers = await Promise.all(
        profiles.map(async (p) => {
          const workspace = await services.workspace.getWorkspaceByOwnerId(p.id).catch(() => null);
          return {
            id: p.id,
            fullName: p.fullName || "Unnamed Creator",
            email: `creator_${p.id.slice(0, 5)}@cinespace.film`,
            avatarUrl: p.avatarUrl,
            platformRole: (p.platformRole as any) || "user",
            workspaceName: workspace?.brandName,
            workspaceSlug: workspace?.slug,
            planName: "Pro",
            storageUsedGB: workspace?.storageUsedBytes ? Math.round(workspace.storageUsedBytes / (1024 * 1024 * 1024)) : 0,
            projectsCount: 4,
            lastLoginAt: p.lastLoginAt,
            lastLoginIp: p.lastLoginIp,
            createdAt: p.createdAt,
          };
        })
      );
    }
  } catch (err) {
    console.warn("Error fetching profiles in admin users:", err);
  }
  // Showcase fallback data if database is fresh


  const users =
    mappedUsers.length > 0
      ? mappedUsers
      : [];

  return <UsersClient users={users} />;
}
