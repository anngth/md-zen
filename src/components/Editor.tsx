import React, { useRef, useEffect, useLayoutEffect } from "react";
import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { undo, redo } from "@codemirror/commands";
import { validateMarkdownLength } from "@lib/markdown";
import {
  createEditorExtensions,
  createEditorTheme,
  createHighlightStyle,
} from "@utils/editorExtensions";
import { syntaxHighlighting } from "@codemirror/language";
import { ScrollSyncManager } from "@utils/scrollSync";
import { colors } from "@utils/colors";

interface EditorProps {
  content: string;
  onContentChange: (content: string) => void;
  fontSize: number;
  isDarkMode: boolean;
}

export interface EditorRef {
  insertText: (text: string) => void;
  undo: () => void;
  redo: () => void;
}

const Editor = React.forwardRef<EditorRef, EditorProps>(
  ({ content, onContentChange, fontSize, isDarkMode }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const contentChangeTimeoutRef = useRef<number | null>(null);
    const scrollSyncManager = useRef(new ScrollSyncManager());
    // Compartments allow hot-swapping theme/highlight without recreating the editor
    const themeCompartment = useRef(new Compartment());
    const highlightCompartment = useRef(new Compartment());
    // Keep a stable ref to onContentChange so the CodeMirror update listener
    // always calls the latest version without needing to recreate the editor.
    // useLayoutEffect runs synchronously after DOM mutations, before paint,
    // closing the tiny window where a passive useEffect could be stale.
    const onContentChangeRef = useRef(onContentChange);
    useLayoutEffect(() => {
      onContentChangeRef.current = onContentChange;
    });

    // Handle scroll synchronization
    const handleScroll = (event: Event) => {
      const editorElement = event.target as HTMLElement;
      scrollSyncManager.current.syncEditorToPreview(editorElement);
    };

    // Initialize CodeMirror once on mount. The empty dep array is intentional:
    // theme/fontSize are handled by the Compartment effect below, and
    // onContentChange is accessed via onContentChangeRef so it never goes stale.
    useEffect(() => {
      if (!editorRef.current || viewRef.current) {
        return;
      }

      const extensions = createEditorExtensions(
        fontSize,
        isDarkMode,
        (newContent) => onContentChangeRef.current(newContent),
        handleScroll,
        contentChangeTimeoutRef,
        themeCompartment.current,
        highlightCompartment.current,
      );

      const view = new EditorView({
        doc: content,
        parent: editorRef.current,
        extensions,
      });

      viewRef.current = view;

      // Copy mutable refs to local variables so the cleanup closure captures
      // a stable snapshot — satisfies react-hooks/exhaustive-deps.
      const timeoutRef = contentChangeTimeoutRef;
      const syncManager = scrollSyncManager.current;

      return () => {
        if (viewRef.current) {
          viewRef.current.destroy();
          viewRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        syncManager.cleanup();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional mount-only init, see comment above

    // Update content when prop changes
    useEffect(() => {
      if (viewRef.current && viewRef.current.state.doc.toString() !== content) {
        const transaction = viewRef.current.state.update({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: content,
          },
        });
        viewRef.current.dispatch(transaction);
      }
    }, [content]);

    // Reconfigure theme and font size via Compartments — preserves undo history,
    // selection, and scroll position instead of destroying/recreating the editor.
    useEffect(() => {
      if (!viewRef.current) return;

      viewRef.current.dispatch({
        effects: [
          themeCompartment.current.reconfigure(
            createEditorTheme(fontSize, isDarkMode),
          ),
          highlightCompartment.current.reconfigure(
            syntaxHighlighting(createHighlightStyle(isDarkMode)),
          ),
        ],
      });
    }, [isDarkMode, fontSize]);

    // Public methods for toolbar actions
    const insertText = (text: string) => {
      if (viewRef.current) {
        const view = viewRef.current;
        const selection = view.state.selection.main;
        // Read the live document from CodeMirror — not the React `content` prop
        // which may lag behind due to the debounced update listener.
        const currentDoc = view.state.doc.toString();
        const newContent =
          currentDoc.substring(0, selection.from) +
          text +
          currentDoc.substring(selection.to);

        if (validateMarkdownLength(newContent)) {
          const transaction = view.state.update({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: text,
            },
            selection: {
              anchor: selection.from + text.length,
            },
          });
          view.dispatch(transaction);
          view.focus();
        }
      }
    };

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
      insertText,
      undo: () => {
        if (viewRef.current) {
          undo(viewRef.current);
        }
      },
      redo: () => {
        if (viewRef.current) {
          redo(viewRef.current);
        }
      },
    }));

    return (
      <div
        className="h-full flex flex-col"
        style={{
          backgroundColor: isDarkMode ? colors.gray[900] : colors.white,
        }}
      >
        <div className="flex-1 min-h-0">
          <div
            ref={editorRef}
            className="h-full w-full"
            style={{ minHeight: "400px" }}
          />
        </div>
      </div>
    );
  },
);

Editor.displayName = "Editor";

export default Editor;
