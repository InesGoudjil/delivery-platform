"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Building2, Film, PanelRight, Search, User } from "lucide-react";
import type { AdminSearchResults } from "@/core/admin/types";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchAdminAction } from "@/app/actions/admin";
import type { AdminNavItem } from "../_modules/registry";

const noSubscription = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform);

interface SearchState {
  term: string;
  results: AdminSearchResults | null;
  error: string | null;
}

/**
 * ⌘K (Ctrl+K) search over the admin panel: its pages, then workspaces, users and deliveries
 * (by title or exact share token), searched on the server as you type.
 */
export function AdminCommandMenu({ items }: { items: AdminNavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // The last answer, and the search it answers: anything else on screen is still loading.
  const [answer, setAnswer] = useState<SearchState | null>(null);
  // The server renders "Ctrl K"; Apple devices switch to "⌘K" after hydrating.
  const shortcut = useSyncExternalStore(noSubscription, () => (isApple() ? "⌘K" : "Ctrl K"), () => "Ctrl K");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchTerm = query.trim();
  useEffect(() => {
    if (searchTerm.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const response = await searchAdminAction(searchTerm);
      if (cancelled) return;
      setAnswer(
        response.success
          ? { term: searchTerm, results: response.results, error: null }
          : { term: searchTerm, results: null, error: response.error }
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const current = searchTerm.length >= 2 && answer?.term === searchTerm ? answer : null;
  const results = current?.results ?? null;
  const error = current?.error ?? null;
  const loading = searchTerm.length >= 2 && current === null;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const term = searchTerm.toLowerCase();
  const pages = items.filter((item) => item.label.toLowerCase().includes(term));
  const nothingYet = term.length < 2 ? "Type at least 2 characters to search." : "No matches.";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" /> Search
        </span>
        <kbd className="rounded border border-border px-1 text-[10px]">{shortcut}</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search the admin panel"
        description="Find a workspace, user or delivery, or go to a page."
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Workspace, email, delivery title or share token…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "Searching…" : (error ?? nothingYet)}</CommandEmpty>

            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((item) => (
                  <CommandItem key={item.id} value={`page-${item.id}`} onSelect={() => go(item.href)}>
                    <PanelRight /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results && results.workspaces.length > 0 && (
              <CommandGroup heading="Workspaces">
                {results.workspaces.map((workspace) => (
                  <CommandItem key={workspace.id} value={`workspace-${workspace.id}`} onSelect={() => go(`/admin/workspaces/${workspace.id}`)}>
                    <Building2 />
                    <span className="min-w-0 truncate">
                      {workspace.name} <span className="text-muted-foreground">/{workspace.slug}</span>
                    </span>
                    {workspace.ownerEmail && <span className="ml-auto truncate text-xs text-muted-foreground">{workspace.ownerEmail}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results && results.users.length > 0 && (
              <CommandGroup heading="Users">
                {results.users.map((user) => (
                  <CommandItem key={user.id} value={`user-${user.id}`} onSelect={() => go(`/admin/users/${user.id}`)}>
                    <User />
                    <span className="min-w-0 truncate">{user.name || user.email || "Unnamed user"}</span>
                    {user.name && user.email && <span className="ml-auto truncate text-xs text-muted-foreground">{user.email}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results && results.deliveries.length > 0 && (
              <CommandGroup heading="Deliveries">
                {results.deliveries.map((delivery) => (
                  <CommandItem key={delivery.id} value={`delivery-${delivery.id}`} onSelect={() => go(`/admin/workspaces/${delivery.workspaceId}`)}>
                    <Film />
                    <span className="min-w-0 truncate">
                      {delivery.title}
                      {delivery.matchedShareToken && <span className="text-muted-foreground"> · share token</span>}
                    </span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{delivery.workspaceName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
