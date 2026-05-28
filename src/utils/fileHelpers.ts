export function downloadFile(
  filename: string,
  content: string,
  contentType: string,
) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Wrap plain body HTML into a complete HTML document for downloads
export function buildBaseHtmlDocument(
  body: string,
  options: {
    title?: string;
    styles?: string;
    /** Set to false to omit the Content-Security-Policy meta tag.
     *  Must be false for documents used internally (e.g. PDF runner) where
     *  the CSP would block dynamic script imports needed by html2pdf.js. */
    includeCsp?: boolean;
  } = {},
): string {
  const {
    title = "MDZen - Minimal Markdown Editor",
    styles = "",
    includeCsp = true,
  } = options;

  // Escape title to prevent HTML injection via document title
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // CSP for user-facing exported files. img-src includes both https: and http:
  // to match what the sanitizer allows, plus data: for base64 images.
  const cspTag = includeCsp
    ? `\n  <!-- CSP restricts what the exported file can load when opened in a browser -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline';" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />${cspTag}
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
    ${styles}
  </style>
  </head>
  <body>
    ${body}
  </body>
  </html>`;
}

// Download HTML by accepting either a full document or body HTML.
// We always re-wrap through buildBaseHtmlDocument so the CSP meta tag is
// guaranteed to be present. If the caller passes a full document, we use
// DOMParser to extract the <body> content reliably before re-wrapping.
export function downloadHtml(filename: string, bodyOrFullHtml: string) {
  const looksLikeDoc =
    /^\s*<!DOCTYPE/i.test(bodyOrFullHtml) || /<html[\s>]/i.test(bodyOrFullHtml);

  let bodyContent: string;
  if (looksLikeDoc) {
    // Use DOMParser for reliable extraction — handles missing <body>, complex
    // attributes, and self-closing tags that trip up regex-based approaches.
    try {
      const doc = new DOMParser().parseFromString(bodyOrFullHtml, "text/html");
      bodyContent = doc.body?.innerHTML ?? bodyOrFullHtml;
    } catch {
      bodyContent = bodyOrFullHtml;
    }
  } else {
    bodyContent = bodyOrFullHtml;
  }

  const html = buildBaseHtmlDocument(bodyContent);
  downloadFile(filename, html, "text/html;charset=utf-8");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error("Could not copy text:", error);
    return false;
  }
}
