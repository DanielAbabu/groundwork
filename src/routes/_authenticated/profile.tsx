import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import {
  dismissNudge,
  getActivity,
  getMyProfile,
  listNudges,
  searchUsers,
  sendNudge,
  updateProfile,
  type ActivityDay,
  type NudgeRow,
  type PublicProfile,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — streaks, stats and nudges" },
      {
        name: "description",
        content:
          "Track your Groundwork completion, average attempts to pass, daily consistency calendar, and nudge friends back on call.",
      },
      { property: "og:title", content: "Your profile — streaks, stats and nudges" },
      {
        property: "og:description",
        content:
          "Completion stats, a daily consistency calendar, and nudges between on-call friends.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchProgress = useServerFn(listProgress);
  const fetchActivity = useServerFn(getActivity);
  const fetchNudges = useServerFn(listNudges);
  const saveProfile = useServerFn(updateProfile);
  const findUsers = useServerFn(searchUsers);
  const nudge = useServerFn(sendNudge);
  const clearNudge = useServerFn(dismissNudge);

  const { data: profile } = useQuery<PublicProfile>({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });
  const { data: activity } = useQuery<ActivityDay[]>({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(),
  });
  const { data: nudges } = useQuery<NudgeRow[]>({
    queryKey: ["nudges"],
    queryFn: () => fetchNudges(),
  });

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setDisplayName(profile.display_name ?? "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => saveProfile({ data: { username, displayName } }),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const { data: results, isFetching } = useQuery<PublicProfile[]>({
    queryKey: ["user-search", debounced],
    queryFn: () => findUsers({ data: { query: debounced } }),
    enabled: debounced.trim().length >= 2,
  });

  const nudgeMutation = useMutation({
    mutationFn: (toUserId: string) => nudge({ data: { toUserId } }),
    onSuccess: () => {
      toast.success("Nudge sent.");
      queryClient.invalidateQueries({ queryKey: ["nudges"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nudge failed"),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => clearNudge({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nudges"] }),
  });

  const received = (nudges ?? []).filter((row) => row.direction === "received");
  const sent = (nudges ?? []).filter((row) => row.direction === "sent");

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link to="/incidents" className="font-mono text-xs text-primary hover:underline">
              ← groundwork board
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-foreground">
              {profile?.display_name || profile?.username || "Your profile"}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              @{profile?.username ?? "unnamed"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10">
        <ProgressSummary progress={progress ?? []} />
        <ActivityCalendar days={activity ?? []} />

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            identity
          </h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono text-xs">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="font-mono"
                placeholder="oncall_hero"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="font-mono text-xs">
                Display name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ada Lovelace"
              />
            </div>
            <Button type="submit" className="font-mono" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            find on-call friends
          </h2>
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by username…"
            className="mt-4 font-mono"
          />
          <ul className="mt-4 space-y-2">
            {debounced.trim().length >= 2 && !isFetching && (results?.length ?? 0) === 0 && (
              <li className="font-mono text-xs text-muted-foreground">No matching usernames.</li>
            )}
            {(results ?? []).map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-foreground">@{person.username}</p>
                  {person.display_name && (
                    <p className="text-xs text-muted-foreground">{person.display_name}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono"
                  disabled={nudgeMutation.isPending}
                  onClick={() => nudgeMutation.mutate(person.id)}
                >
                  Nudge
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            nudges
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                received
              </p>
              <ul className="mt-3 space-y-2">
                {received.length === 0 && (
                  <li className="font-mono text-xs text-muted-foreground">Nothing yet.</li>
                )}
                {received.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded border border-border bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-xs text-foreground">
                        @{row.counterpart?.username ?? "someone"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.message}</p>
                    </div>
                    <button
                      className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      onClick={() => dismissMutation.mutate(row.id)}
                    >
                      clear
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                sent
              </p>
              <ul className="mt-3 space-y-2">
                {sent.length === 0 && (
                  <li className="font-mono text-xs text-muted-foreground">
                    Nudge someone to get them back on call.
                  </li>
                )}
                {sent.map((row) => (
                  <li key={row.id} className="rounded border border-border bg-surface px-4 py-3">
                    <p className="font-mono text-xs text-foreground">
                      @{row.counterpart?.username ?? "someone"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
