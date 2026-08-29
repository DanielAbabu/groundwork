import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listNudges,
  dismissNudge,
  searchUsers,
  sendNudge,
  type NudgeRow,
  type PublicProfile,
} from "@/lib/profile.functions";

export function NudgePopover() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "send">("received");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const fetchNudges = useServerFn(listNudges);
  const clearNudge = useServerFn(dismissNudge);
  const findUsers = useServerFn(searchUsers);
  const triggerNudge = useServerFn(sendNudge);

  const { data: nudges } = useQuery<NudgeRow[]>({
    queryKey: ["nudges"],
    queryFn: () => fetchNudges(),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults, isFetching } = useQuery<PublicProfile[]>({
    queryKey: ["user-search-popover", debouncedTerm],
    queryFn: () => findUsers({ data: { query: debouncedTerm } }),
    enabled: debouncedTerm.trim().length >= 2,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => clearNudge({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nudges"] }),
  });

  const nudgeMutation = useMutation({
    mutationFn: (toUserId: string) => triggerNudge({ data: { toUserId } }),
    onSuccess: () => {
      toast.success("Nudge sent");
      queryClient.invalidateQueries({ queryKey: ["nudges"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send nudge"),
  });

  const received = (nudges ?? []).filter((n) => n.direction === "received");
  const unreadCount = received.length;

  const sentNudges = (nudges ?? []).filter((n) => n.direction === "sent");
  const previouslyNudged = Array.from(
    new Map(
      sentNudges.filter((n) => n.counterpart?.id).map((n) => [n.counterpart!.id, n.counterpart!]),
    ).values(),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell / Nudge Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center rounded border border-[#3A342C] bg-[#1D1A17] p-2 text-[#B8AE9C] transition-all hover:border-[#C8912B] hover:text-[#F2ECE1]"
        title="On-Call Nudges"
        aria-label="Nudges"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#C8912B] font-mono text-[9px] font-bold text-[#161412] brass-emboss">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Nudge Dropdown Popup */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded border border-[#3A342C] bg-[#1D1A17] p-4 shadow-xl z-50 font-mono">
          <div className="flex items-center justify-between border-b border-[#3A342C] pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-[#C8912B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F2ECE1]">
                On-Call Nudges
              </h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[#7C7364] hover:text-[#F2ECE1]"
            >
              ✕
            </button>
          </div>

          {/* Sub Tabs */}
          <div className="mt-3 flex rounded bg-[#161412] p-0.5 border border-[#3A342C] text-xs">
            <button
              onClick={() => setActiveTab("received")}
              className={`flex-1 rounded py-1.5 text-center font-medium transition-all ${
                activeTab === "received"
                  ? "bg-[#C8912B] text-[#161412] font-bold brass-emboss"
                  : "text-[#7C7364] hover:text-[#F2ECE1]"
              }`}
            >
              Received ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab("send")}
              className={`flex-1 rounded py-1.5 text-center font-medium transition-all ${
                activeTab === "send"
                  ? "bg-[#C8912B] text-[#161412] font-bold brass-emboss"
                  : "text-[#7C7364] hover:text-[#F2ECE1]"
              }`}
            >
              Send Nudge
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-3 max-h-80 overflow-y-auto pr-1">
            {activeTab === "received" ? (
              received.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#7C7364]">
                  <p>No incoming nudges right now.</p>
                  <p className="mt-1 text-[10px]">Your on-call rotation is quiet! ☕</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {received.map((nudge) => (
                    <li
                      key={nudge.id}
                      className="rounded border border-[#3A342C] bg-[#161412] p-3 transition-colors hover:border-[#4E4638]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#C8912B]">
                            @{nudge.counterpart?.username ?? "engineer"}
                          </p>
                          <p className="mt-1 font-sans text-xs leading-relaxed text-[#F2ECE1]">
                            {nudge.message}
                          </p>
                        </div>
                        <button
                          onClick={() => dismissMutation.mutate(nudge.id)}
                          className="text-[10px] text-[#7C7364] hover:text-[#C4593F]"
                          title="Dismiss"
                        >
                          Clear
                        </button>
                      </div>
                      {nudge.counterpart?.id && (
                        <button
                          onClick={() => nudgeMutation.mutate(nudge.counterpart!.id)}
                          className="mt-2 text-[10px] font-bold text-[#C8912B] hover:underline"
                        >
                          Nudge back
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search engineer by username…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded border border-[#3A342C] bg-[#161412] px-3 py-1.5 text-xs text-[#F2ECE1] placeholder:text-[#7C7364] focus:border-[#C8912B] focus:outline-none"
                />

                {debouncedTerm.trim().length >= 2 &&
                  !isFetching &&
                  (searchResults?.length ?? 0) === 0 && (
                    <p className="py-2 text-center text-xs text-[#7C7364]">No matching users.</p>
                  )}

                {/* Search Results */}
                {debouncedTerm.trim().length >= 2 && (searchResults?.length ?? 0) > 0 && (
                  <ul className="space-y-2 border-b border-[#3A342C] pb-3">
                    {(searchResults ?? []).map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center justify-between rounded border border-[#3A342C] bg-[#161412] p-2.5"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#F2ECE1]">@{user.username}</p>
                          {user.display_name && (
                            <p className="text-[10px] text-[#7C7364]">{user.display_name}</p>
                          )}
                        </div>
                        <button
                          onClick={() => nudgeMutation.mutate(user.id)}
                          disabled={nudgeMutation.isPending}
                          className="rounded bg-[#C8912B] px-2.5 py-1 text-[10px] font-bold text-[#161412] hover:bg-[#E8B04A] brass-emboss"
                        >
                          Nudge
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* People You Nudged Before Section */}
                {previouslyNudged.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C7364] mb-2">
                      People You Nudged Before
                    </p>
                    <ul className="space-y-2">
                      {previouslyNudged.map((user) => (
                        <li
                          key={user.id}
                          className="flex items-center justify-between rounded border border-[#3A342C] bg-[#161412] p-2.5"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#F2ECE1]">@{user.username}</p>
                            {user.display_name && (
                              <p className="text-[10px] text-[#7C7364]">{user.display_name}</p>
                            )}
                          </div>
                          <button
                            onClick={() => nudgeMutation.mutate(user.id)}
                            disabled={nudgeMutation.isPending}
                            className="rounded border border-[#C8912B]/40 bg-[#C8912B]/10 px-2.5 py-1 text-[10px] font-bold text-[#C8912B] hover:bg-[#C8912B] hover:text-[#161412] transition-all"
                          >
                            Nudge again
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NudgePopover;
