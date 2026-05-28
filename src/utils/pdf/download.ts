import runnerUrl from "./runner.ts?url";
import { buildBaseHtmlDocument } from "../fileHelpers";

export function downloadAsPDF(
  htmlContent: string | Promise<string>,
  filename: string = "document.pdf",
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // PDF-specific styles that override the base styles
      const pdfStyles = `
        body { color: #333; background: #fff; }
        .html2pdf__header, .html2pdf__footer, [data-html2pdf-page-header], [data-html2pdf-page-footer] { display: none !important; }
        h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.6em; line-height: 1.25; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.6em; }
        h3 { font-size: 1.3em; }
        p { margin: 1em 0; }
        code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
        pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow: auto; }
        pre code { background: transparent; padding: 0; }
        blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #4a5568; background: #f7fafc; padding: 1rem; border-radius: 0 5px 5px 0; }
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin: 0.5em 0; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
        th { background: #f7fafc; font-weight: 600; }
        a { color: #3182ce; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
        img { max-width: 100%; height: auto; }
      `;

      // Open a dedicated PDF runner page in a new tab/window synchronously
      const features =
        "width=800,height=600,left=0,top=0,scrollbars=no,resizable=no,toolbar=0,location=0,menubar=0,status=0";
      const pdfWindow = window.open("", "_blank", features);

      if (!pdfWindow) {
        console.error("Could not open PDF window");
        resolve(false);
        return;
      }

      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      // Bootstrap the runner in the new window by injecting minimal HTML that imports the runner module
      try {
        const bootstrapHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>MDZen PDF</title></head><body><script type="module" src="${runnerUrl}"></script></body></html>`;
        pdfWindow.document.open();
        pdfWindow.document.write(bootstrapHtml);
        pdfWindow.document.close();
      } catch (e) {
        console.error("Failed to bootstrap PDF runner:", e);
      }

      // Safety timeout in case nothing comes back
      const globalTimeout = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        // Settle immediately so any in-flight postPayload promise sees
        // settled === true before it reaches postMessage.
        settle(false);
        try {
          // As a last resort, open the browser print dialog so the user can
          // still get a printout.
          pdfWindow.focus();
          pdfWindow.print();
        } catch {
          // ignore print errors
        }
        // Close the window after a short delay to let the print dialog open.
        setTimeout(() => {
          try {
            pdfWindow.close();
          } catch {
            // ignore close errors
          }
        }, 500);
      }, 10000);

      // Listen for completion and ready messages
      let runnerReady = false;
      // Guard against posting the payload more than once. All three trigger
      // paths (mdzen-pdf-ready, 200 ms fallback, onload) share this flag.
      let payloadSent = false;

      const onMessage = (event: MessageEvent) => {
        // Only accept messages from the PDF window we opened
        if (event.source !== pdfWindow) return;
        // Ensure message is from our own origin
        if (event.origin !== window.location.origin) return;

        const data = (event && event.data) || {};
        if (!data) return;
        if (data.type === "mdzen-pdf-ready") {
          runnerReady = true;
          // Once ready, send the payload
          postPayload();
          return;
        }
        if (data.type === "mdzen-pdf-done") {
          window.removeEventListener("message", onMessage);
          try {
            window.clearTimeout(globalTimeout);
          } catch {
            // ignore
          }
          try {
            pdfWindow.close();
          } catch {
            // ignore
          }
          settle(!!data.success);
        }
      };
      window.addEventListener("message", onMessage);

      // Post the payload to the new window when it's ready.
      // The guard ensures only the first caller (ready signal, 200 ms fallback,
      // or onload) actually sends — the others are no-ops.
      const postPayload = () => {
        if (payloadSent) return;
        // Also bail if the request has already timed out or otherwise settled —
        // e.g. pdfWindow.onload can fire within the 500 ms close delay after
        // the global timeout has already run.
        if (settled) return;
        payloadSent = true;

        // Resolve the HTML content if it's a Promise, then post the payload
        Promise.resolve(htmlContent)
          .then((resolvedHtmlContent) => {
            // Re-check settled here: the promise may have been resolving while
            // the global timeout fired. Without this check, postMessage would
            // still run during the 500 ms window between the timeout callback
            // and settle(false).
            if (settled) return;

            try {
              const options = {
                margin: [0.5, 0.5, 0.5, 0.5],
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: "#ffffff",
                },
                jsPDF: {
                  unit: "in",
                  format: "a4",
                  orientation: "portrait",
                  putOnlyUsedFonts: true,
                  floatPrecision: 16,
                },
                pagebreak: { mode: ["avoid-all", "css", "legacy"] },
              } as const;

              let htmlToSend: string;
              if (/^\s*<!DOCTYPE/i.test(resolvedHtmlContent)) {
                // Caller passed a full document. Strip any CSP meta tag before
                // forwarding — a CSP in the runner document would block the
                // dynamic import("html2pdf.js") that the runner needs.
                // Use DOMParser so attribute order doesn't matter (e.g. both
                // <meta http-equiv="CSP" content="..."> and
                // <meta content="..." http-equiv="CSP"> are handled correctly).
                try {
                  const doc = new DOMParser().parseFromString(
                    resolvedHtmlContent,
                    "text/html",
                  );
                  // Iterate all meta tags and compare http-equiv
                  // case-insensitively — the CSS `i` flag is not universally
                  // supported in older engines, and callers may use any casing.
                  doc.querySelectorAll("meta").forEach((el) => {
                    if (
                      el.getAttribute("http-equiv")?.toLowerCase() ===
                      "content-security-policy"
                    ) {
                      el.remove();
                    }
                  });
                  htmlToSend = doc.documentElement.outerHTML;
                } catch {
                  // DOMParser unavailable — fall back to the regex, accepting
                  // the known attribute-order limitation.
                  htmlToSend = resolvedHtmlContent.replace(
                    /<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi,
                    "",
                  );
                }
              } else {
                htmlToSend = buildBaseHtmlDocument(resolvedHtmlContent, {
                  title: "MDZen - PDF",
                  styles: pdfStyles,
                  // No CSP in the PDF runner document — the runner uses
                  // document.write() then dynamic import("html2pdf.js"),
                  // which would be blocked by default-src 'none'.
                  includeCsp: false,
                });
              }

              pdfWindow.postMessage(
                {
                  type: "mdzen-generate-pdf",
                  html: htmlToSend,
                  filename,
                  options,
                },
                window.location.origin,
              );
            } catch (err) {
              console.error("Failed to post PDF payload:", err);
              settle(false);
            }
          })
          .catch((err) => {
            console.error("Failed to resolve HTML content:", err);
            settle(false);
          });
      };

      // If runner doesn't signal ready soon, attempt to send after a short delay
      setTimeout(() => {
        if (!runnerReady) postPayload();
      }, 200);
      // Also attempt after the window's onload
      pdfWindow.onload = () => postPayload();
    } catch (error) {
      console.error("PDF generation error:", error);
      resolve(false);
    }
  });
}
