import { redirect } from "next/navigation";

export default async function HelpRedirectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  redirect(`/${workspaceSlug}`);
}
