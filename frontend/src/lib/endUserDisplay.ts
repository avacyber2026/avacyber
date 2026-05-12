export type EndUserOption = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export function endUserDisplayName(u: Pick<EndUserOption, "email" | "firstName" | "lastName">): string {
  const f = (u.firstName ?? "").trim();
  const l = (u.lastName ?? "").trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  const local = (u.email || "").split("@")[0] || u.email || "";
  return local || u.email;
}

function capitalizeWord(w: string): string {
  const t = w.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Builds "First L." from the part before @ (split by . _ -), without showing the domain.
 * e.g. jan.novak@x → Jan N.; single segment → capitalized word.
 */
export function pickerLabelFromEmailLocal(email: string): string {
  const local = (email || "").split("@")[0]?.trim() ?? "";
  if (!local) return "";
  const parts = local.split(/[._-]+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return `${capitalizeWord(parts[0])} ${parts[1].charAt(0).toUpperCase()}.`;
  }
  if (parts.length === 1) {
    return capitalizeWord(parts[0]);
  }
  return capitalizeWord(local);
}

/**
 * First name + first initial when profile has names; otherwise label from email local part only (no domain).
 */
export function endUserPickerLabel(u: Pick<EndUserOption, "email" | "firstName" | "lastName">): string {
  const f = (u.firstName ?? "").trim();
  const l = (u.lastName ?? "").trim();
  if (f && l) return `${f} ${l.charAt(0).toUpperCase()}.`;
  if (f) return f;
  if (l) return l;
  return pickerLabelFromEmailLocal(u.email);
}

export function endUserPickerLabelOrFallback(
  u: Pick<EndUserOption, "email" | "firstName" | "lastName">,
  fallback = "—"
): string {
  const s = endUserPickerLabel(u);
  return s || fallback;
}

export function normalizeEndUserSearch(s: string): string {
  return s.trim().toLowerCase();
}

export function endUserMatchesQuery(u: EndUserOption, qRaw: string): boolean {
  const q = normalizeEndUserSearch(qRaw);
  if (!q) return true;
  const name = endUserDisplayName(u).toLowerCase();
  const picker = endUserPickerLabel(u).toLowerCase();
  const email = (u.email || "").toLowerCase();
  const f = (u.firstName ?? "").trim().toLowerCase();
  const l = (u.lastName ?? "").trim().toLowerCase();
  return (
    (picker && picker.includes(q)) ||
    name.includes(q) ||
    email.includes(q) ||
    f.includes(q) ||
    l.includes(q) ||
    `${f} ${l}`.trim().includes(q)
  );
}

/** Accepts new API objects or legacy string[] from cache/old responses */
export function normalizeEndUsersResponse(raw: unknown): EndUserOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): EndUserOption | null => {
      if (typeof row === "string") {
        const email = row.trim();
        return email ? { email, firstName: null, lastName: null } : null;
      }
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        const email = String(r.email ?? "").trim();
        if (!email) return null;
        const fn = r.firstName ?? r.first_name;
        const ln = r.lastName ?? r.last_name;
        return {
          email,
          firstName: typeof fn === "string" && fn.trim() ? fn.trim() : null,
          lastName: typeof ln === "string" && ln.trim() ? ln.trim() : null,
        };
      }
      return null;
    })
    .filter((u): u is EndUserOption => u != null);
}
