import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked with security settings
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Configure DOMPurify to remove potentially dangerous elements
const sanitizeConfig = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "del",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "pre",
    "code",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "div",
    "span",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id"],
  // Allow:
  //   - absolute safe protocols: https?, mailto, tel
  //   - safe relative URLs: #anchors, /path (but NOT //protocol-relative), ./, ../
  //   data:image is intentionally excluded here; the uponSanitizeAttribute hook
  //   below handles it with forceKeepAttr only for <img src>, keeping the global
  //   allowlist tight.
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):|^(?:#|\/(?!\/)|\.\.?\/)/i,
  FORBID_TAGS: [
    "script",
    "object",
    "embed",
    "iframe",
    "form",
    "input",
    "button",
  ],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
};

// Register the uponSanitizeAttribute hook exactly once.
// A module-level variable resets on every Vite HMR re-evaluation, so we
// persist the flag on globalThis which survives across HMR cycles.
const _hmrKey = "__mdzen_dompurify_hook_registered__";
if (!(globalThis as Record<string, unknown>)[_hmrKey]) {
  (globalThis as Record<string, unknown>)[_hmrKey] = true;

  // Use uponSanitizeAttribute (fires before DOMPurify decides to keep/remove the
  // value) to enforce per-element rules for data: URIs:
  //   - <img src>  → safe base64 image data URIs are force-kept here (they are
  //                  intentionally absent from ALLOWED_URI_REGEXP so no other
  //                  tag/attr can accidentally inherit the allowance)
  //   - <a href>   → all data: URIs are removed (belt-and-suspenders)
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    const tag = (node as Element).tagName;
    const { attrName, attrValue } = data;

    if (tag === "IMG" && attrName === "src") {
      if (/^data:/i.test(attrValue)) {
        if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(attrValue)) {
          // Safe base64 image — explicitly allow it so DOMPurify keeps it
          data.forceKeepAttr = true;
        } else {
          // Any other data: URI on an image — remove the attribute entirely so
          // the browser doesn't fire a request for an empty src=""
          data.keepAttr = false;
        }
      }
    }

    if (tag === "A" && attrName === "href") {
      if (/^data:/i.test(attrValue)) {
        // Remove the attribute entirely — href="" navigates to the current page
        data.keepAttr = false;
      }
    }
  });
}

export async function parseMarkdown(markdown: string): Promise<string> {
  try {
    // Parse markdown to HTML
    const html = await marked(markdown);

    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);

    return sanitizedHtml;
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return "<p>Error parsing markdown</p>";
  }
}

export function validateMarkdownLength(text: string): boolean {
  return text.length <= 10000;
}

// Auto-save functionality
export function saveToLocalStorage(content: string): void {
  try {
    localStorage.setItem("mdzen-content", content);
    localStorage.setItem("mdzen-timestamp", new Date().toISOString());
  } catch (error) {
    console.warn("Failed to save to localStorage:", error);
  }
}

export function loadFromLocalStorage(): string {
  try {
    return localStorage.getItem("mdzen-content") || "";
  } catch (error) {
    console.warn("Failed to load from localStorage:", error);
    return "";
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem("mdzen-content");
    localStorage.removeItem("mdzen-timestamp");
  } catch (error) {
    console.warn("Failed to clear localStorage:", error);
  }
}
