import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  UserCheck,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import type { OAuthAuthorizationDetails, OAuthRedirect } from "@supabase/auth-js";

type ConsentSearch = {
  authorization_id?: string | undefined;
};

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (search: Record<string, unknown>): ConsentSearch => {
    const authId = search["authorization_id"];
    return {
      authorization_id: typeof authId === "string" ? authId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Authorize Application — RawSkill" },
      {
        name: "description",
        content: "Authorize third-party application access to your RawSkill account.",
      },
    ],
  }),
  component: OAuthConsentPage,
});

function OAuthConsentPage() {
  const search = Route.useSearch();
  const authorizationId = search.authorization_id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initConsentFlow() {
      if (!authorizationId) {
        console.error("[OAuth Consent Error] Missing authorization_id parameter in request URL.", {
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
        setError("Missing authorization_id parameter in request.");
        setLoading(false);
        return;
      }

      try {
        // 1. Verify user session
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          console.warn(
            "[OAuth Consent Notice] Unauthenticated access attempt to consent screen. Redirecting to sign in.",
            {
              authorizationId,
              userError,
              timestamp: new Date().toISOString(),
            },
          );
          toast.error("Please sign in to process the authorization request.");
          // Redirect to sign in, preserving search params
          navigate({
            to: "/auth",
          });
          return;
        }

        if (isMounted) {
          setUserEmail(userData.user.email ?? "Authenticated User");
        }

        // 2. Fetch OAuth authorization details from Supabase
        const { data, error: detailsError } =
          await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

        if (detailsError) {
          console.error(
            "[OAuth Consent Error] Supabase returned error fetching authorization details:",
            {
              authorizationId,
              error: detailsError,
              errorMessage: detailsError.message,
              timestamp: new Date().toISOString(),
            },
          );
          throw detailsError;
        }

        if (!data) {
          console.error(
            "[OAuth Consent Error] Received null response when fetching authorization details:",
            {
              authorizationId,
              timestamp: new Date().toISOString(),
            },
          );
          throw new Error("No authorization details returned.");
        }

        // Check if user already consented or auto-redirected
        if ("redirect_url" in data && typeof (data as OAuthRedirect).redirect_url === "string") {
          window.location.href = (data as OAuthRedirect).redirect_url;
          return;
        }

        if ("authorization_id" in data) {
          if (isMounted) {
            setDetails(data as OAuthAuthorizationDetails);
          }
        }
      } catch (err) {
        console.error("[OAuth Consent Error] Initialization failed:", {
          authorizationId,
          error: err,
          errorMessage: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load authorization details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initConsentFlow();

    return () => {
      isMounted = false;
    };
  }, [authorizationId, navigate]);

  const handleApprove = async () => {
    if (!authorizationId) return;
    setActionBusy("approve");
    try {
      const { data, error: approveErr } =
        await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (approveErr) throw approveErr;

      toast.success("Access granted. Redirecting back to application...");
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err) {
      console.error("[OAuth Consent Error] Approval request failed:", {
        authorizationId,
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      toast.error(err instanceof Error ? err.message : "Failed to approve authorization.");
      setActionBusy(null);
    }
  };

  const handleDeny = async () => {
    if (!authorizationId) return;
    setActionBusy("deny");
    try {
      const { data, error: denyErr } = await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (denyErr) throw denyErr;

      toast.info("Access denied. Redirecting back...");
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err) {
      console.error("[OAuth Consent Error] Denial request failed:", {
        authorizationId,
        error: err,
        errorMessage: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      toast.error(err instanceof Error ? err.message : "Failed to deny authorization.");
      setActionBusy(null);
    }
  };

  // Scope label formatter
  const formatScope = (scope: string) => {
    switch (scope.toLowerCase()) {
      case "openid":
        return { title: "OpenID Identity", desc: "Verify your unique identity via OpenID Connect" };
      case "profile":
        return { title: "Basic Profile", desc: "Read your public profile details and metadata" };
      case "email":
        return { title: "Email Address", desc: "Read your primary email address" };
      default:
        return { title: scope, desc: `Access permission for '${scope}'` };
    }
  };

  const parsedScopes = details?.scope ? details.scope.split(" ").filter(Boolean) : [];

  return (
    <main className="grid-noise flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#171717] pb-4">
          <BrandLogo href="/" />
          <div className="flex items-center gap-1.5 rounded-sm border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-0.5 text-[10px] font-mono text-[#10B981] font-bold">
            <Lock className="h-3 w-3" />
            <span>OAuth 2.1</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="font-mono text-xs text-muted-foreground">
              Retrieving authorization request details...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Authorization Error</h2>
              <p className="text-xs text-muted-foreground font-mono">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/" })}
              className="w-full font-mono text-xs mt-2"
            >
              Return to RawSkill Dashboard
            </Button>
          </div>
        )}

        {/* Consent Details State */}
        {!loading && !error && details && (
          <div className="space-y-6">
            {/* App Request Info */}
            <div className="text-center space-y-2">
              {details.client.logo_uri ? (
                <img
                  src={details.client.logo_uri}
                  alt={details.client.name}
                  className="mx-auto h-14 w-14 rounded-lg border border-border bg-secondary object-cover"
                />
              ) : (
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary font-mono text-xl font-bold">
                  {details.client.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Authorize <span className="text-primary">{details.client.name}</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                An external application wants permission to access your RawSkill account.
              </p>
              {details.client.uri && (
                <a
                  href={details.client.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>{details.client.uri}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Account Info Badge */}
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-secondary/30 p-3 text-xs">
              <span className="text-muted-foreground font-mono">Signing in as</span>
              <div className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{userEmail}</span>
              </div>
            </div>

            {/* Requested Scopes */}
            <div className="space-y-2.5">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Requested Permissions
              </h2>
              <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3">
                {parsedScopes.length > 0 ? (
                  parsedScopes.map((scope) => {
                    const formatted = formatScope(scope);
                    return (
                      <div key={scope} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground font-mono">{formatted.title}</p>
                          <p className="text-[11px] text-muted-foreground">{formatted.desc}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Basic read access</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              By authorizing, you allow{" "}
              <span className="text-foreground font-semibold">{details.client.name}</span> to access
              your identity details according to their terms. You can revoke access at any time.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                variant="outline"
                disabled={actionBusy !== null}
                onClick={handleDeny}
                className="w-full sm:w-1/2 font-mono text-xs border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                {actionBusy === "deny" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </div>
                )}
              </Button>

              <Button
                disabled={actionBusy !== null}
                onClick={handleApprove}
                className="w-full sm:w-1/2 font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                {actionBusy === "approve" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Authorize</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
