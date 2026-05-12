import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "div",
  "span",
  "pre",
  "code",
];

/** Sanitize rich HTML from the guide editor before rendering (client-only). */
export function sanitizeGuideHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  });
}
