import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { markdown } from "@codemirror/lang-markdown";
import { validateMarkdownLength } from "@lib/markdown";
import { colors } from "./colors";

/**
 * Create CodeMirror extensions.
 * Pass `themeCompartment` and `highlightCompartment` so the caller can
 * hot-swap theme/highlight later via `compartment.reconfigure(...)` without
 * destroying and recreating the entire EditorView.
 */
export const createEditorExtensions = (
  fontSize: number,
  isDarkMode: boolean,
  onContentChange: (content: string) => void,
  onScroll: (event: Event) => void,
  contentChangeTimeoutRef: { current: number | null },
  themeCompartment: Compartment = new Compartment(),
  highlightCompartment: Compartment = new Compartment(),
) => {
  const extensions = [
    // Core extensions
    lineNumbers(),
    foldGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    highlightCompartment.of(
      syntaxHighlighting(createHighlightStyle(isDarkMode)),
    ),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    markdown(),

    // Keymap
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),

    // Content change listener
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (contentChangeTimeoutRef.current) {
          clearTimeout(contentChangeTimeoutRef.current);
        }

        contentChangeTimeoutRef.current = window.setTimeout(() => {
          const newContent = update.state.doc.toString();
          const valid = validateMarkdownLength(newContent);
          if (valid) {
            onContentChange(newContent);
          }
        }, 50);
      }
    }),

    // Scroll synchronization
    EditorView.domEventHandlers({
      scroll: onScroll,
    }),

    // Theme (wrapped in compartment for hot-swap reconfiguration)
    themeCompartment.of(createEditorTheme(fontSize, isDarkMode)),
  ];

  return extensions;
};

/**
 * Create syntax highlighting style
 */
export const createHighlightStyle = (isDarkMode: boolean) => {
  return HighlightStyle.define([
    {
      tag: tags.heading1,
      color: isDarkMode ? "#e5e7eb" : "#1f2937",
      fontWeight: "800",
      fontSize: "1.5em",
    },
    {
      tag: tags.heading2,
      color: isDarkMode ? "#e5e7eb" : "#1f2937",
      fontWeight: "700",
      fontSize: "1.3em",
    },
    {
      tag: tags.heading3,
      color: isDarkMode ? "#e5e7eb" : "#374151",
      fontWeight: "600",
      fontSize: "1.15em",
    },
    {
      tag: tags.heading,
      color: isDarkMode ? "#d1d5db" : "#374151",
      fontWeight: "600",
    },
    {
      tag: tags.strong,
      color: isDarkMode ? "#fbbf24" : "#92400e",
      fontWeight: "700",
    },
    {
      tag: tags.emphasis,
      color: isDarkMode ? "#d1d5db" : "#4b5563",
      fontStyle: "italic",
    },
    {
      tag: tags.link,
      color: isDarkMode ? "#93c5fd" : "#3b82f6",
      textDecoration: "underline",
    },
    { tag: tags.url, color: isDarkMode ? "#86efac" : "#16a34a" },
    {
      tag: tags.monospace,
      color: isDarkMode ? "#fca5a1" : "#b91c1c",
      backgroundColor: isDarkMode ? "#1e293b" : "#f9fafb",
    },
    {
      tag: tags.quote,
      color: isDarkMode ? "#9ca3af" : "#6b7280",
      fontStyle: "italic",
    },
    { tag: tags.list, color: isDarkMode ? "#d1d5db" : "#4b5563" },
    { tag: tags.contentSeparator, color: isDarkMode ? "#6b7280" : "#d1d5db" },
    {
      tag: tags.strikethrough,
      color: isDarkMode ? "#9ca3af" : "#9ca3af",
      textDecoration: "line-through",
    },
  ]);
};

/**
 * Create editor theme
 */
export const createEditorTheme = (
  fontSize: number,
  isDarkMode: boolean = false,
) => {
  return EditorView.theme({
    "&": {
      fontSize: `${fontSize}px`,
      height: "100%",
      backgroundColor: isDarkMode ? "#0f172a" : "#f9fafb",
    },
    ".cm-gutters": {
      backgroundColor: isDarkMode ? "#0f172a" : "#f3f4f6",
      color: isDarkMode ? "#9ca3af" : "#6b7280",
      border: "none",
    },
    ".cm-content": {
      padding: "1rem",
      fontFamily:
        "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      lineHeight: "1.5",
      color: isDarkMode ? "#e5e7eb" : "#1f2937",
    },
    ".cm-line": {
      color: isDarkMode ? "#e5e7eb" : "#1f2937",
    },
    ".cm-content[contenteditable]": {
      "-webkit-user-select": "text",
      "-moz-user-select": "text",
      "-ms-user-select": "text",
      "user-select": "text",
      spellcheck: "false",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-editor": {
      height: "100%",
    },
    ".cm-scroller": {
      height: "100%",
    },
    ".cm-foldGutter": {
      width: "20px",
      paddingRight: "4px",
    },
    ".cm-foldGutter .cm-gutterElement": {
      textAlign: "center",
      fontSize: "14px",
    },
    ".cm-foldPlaceholder": {
      margin: "0 6px",
      padding: "2px 4px",
      borderRadius: "3px",
      backgroundColor: colors.overlay.light,
      border: `1px solid ${colors.overlay.medium}`,
      cursor: "pointer",
    },
  });
};
