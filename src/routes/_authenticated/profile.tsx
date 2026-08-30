import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
      { title: "Profile — RawSkill" },
      {
        name: "description",
        content:
          "Track your RawSkill completion, average attempts to pass, daily consistency calendar, and nudge friends back on call.",
      },
      { property: "og:title", content: "Profile — RawSkill" },
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
    <div className="min-h-[calc(100vh-56px)] bg-[#0B0F19] text-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="border-b border-[#1E293B] bg-[#0F172A] px-6 sm:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
              DOSSIER // ENGINEER CREDENTIAL
            </span>
            <span className="text-[#1E293B]">/</span>
            <span className="font-display text-xs text-[#64748B]">WORKSHOP PROFILE</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
            {profile?.display_name || profile?.username || "Your Profile"}
          </h1>
          <p className="font-display text-sm text-[#38BDF8] font-bold">
            @{profile?.username ?? "engineer"}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 sm:gap-10 px-6 sm:px-10 py-8 sm:py-12">
        <ProgressSummary progress={progress ?? []} />

        <div className="overflow-x-auto rounded-sm border border-[#1E293B] bg-[#0F172A] p-7 shadow-sm space-y-4">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#64748B]">
            LOGBOOK // ACTIVITY HISTORY
          </h2>
          <ActivityCalendar days={activity ?? []} />
        </div>

        {/* Identity Credentials */}
        <section className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-7 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
              FILE // IDENTITY CREDENTIALS
            </h2>
            <span className="font-display text-xs text-[#64748B]">STAMPED RECORD</span>
          </div>
          <form
            className="mt-4 grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2.5">
              <Label htmlFor="username" className="font-display text-xs font-semibold text-[#94A3B8]">
                Username Handle
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="font-display text-sm bg-[#0B0F19] border-[#1E293B] text-[#F8FAFC] py-2.5 px-4"
                placeholder="oncall_hero"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="font-mono text-xs text-[#94A3B8]">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="font-sans text-xs bg-[#0B0F19] border-[#1E293B] text-[#F8FAFC]"
                placeholder="Ada Lovelace"
              />
            </div>
            <Button
              type="submit"
              className="font-mono text-xs font-bold bg-[#38BDF8] text-[#0B0F19] hover:bg-[#7DD3FC]"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save Record"}
            </Button>
          </form>
        </section>

        {/* Search Engineers */}
        <section className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 space-y-4 shadow-sm">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#64748B]">
            ON-CALL ROSTER // FIND ENGINEERS
          </h2>
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by handle or name…"
            className="mt-2 font-mono text-xs bg-[#0B0F19] border-[#1E293B] text-[#F8FAFC]"
          />
          <ul className="mt-4 space-y-2">
            {debounced.trim().length >= 2 && !isFetching && (results?.length ?? 0) === 0 && (
              <li className="font-mono text-xs text-[#64748B]">
                No matching engineer handles found.
              </li>
            )}
            {(results ?? []).map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-[#1E293B] bg-[#0B0F19] px-4 py-3"
              >
                <div>
                  <p className="font-mono text-xs font-bold text-[#F8FAFC]">@{person.username}</p>
                  {person.display_name && (
                    <p className="font-sans text-xs text-[#94A3B8]">{person.display_name}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs border-[#334155] bg-[#1E293B] text-[#38BDF8] hover:border-[#38BDF8]"
                  disabled={nudgeMutation.isPending}
                  onClick={() => nudgeMutation.mutate(person.id)}
                >
                  Send Nudge
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {/* Nudge Activity */}
        <section className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 space-y-4 shadow-sm">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#64748B]">
            COMMUNICATIONS // NUDGE LOG
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#38BDF8]">
                RECEIVED NUDGES
              </p>
              <ul className="mt-3 space-y-2">
                {received.length === 0 && (
                  <li className="font-mono text-xs text-[#64748B]">No incoming nudges logged.</li>
                )}
                {received.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-sm border border-[#1E293B] bg-[#0B0F19] px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-[#38BDF8]">
                        @{row.counterpart?.username ?? "someone"}
                      </p>
                      <p className="mt-1 font-sans text-xs text-[#94A3B8]">{row.message}</p>
                    </div>
                    <button
                      className="font-mono text-[10px] uppercase tracking-widest text-[#64748B] hover:text-[#F8FAFC]"
                      onClick={() => dismissMutation.mutate(row.id)}
                    >
                      CLEAR
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                SENT NUDGES
              </p>
              <ul className="mt-3 space-y-2">
                {sent.length === 0 && (
                  <li className="font-mono text-xs text-[#64748B]">
                    Nudge teammates to remind them of on-call rotation.
                  </li>
                )}
                {sent.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-sm border border-[#1E293B] bg-[#0B0F19] px-4 py-3"
                  >
                    <p className="font-mono text-xs font-bold text-[#F8FAFC]">
                      @{row.counterpart?.username ?? "someone"}
                    </p>
                    <p className="mt-1 font-sans text-xs text-[#94A3B8]">{row.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
