import React, { useState, useRef } from "react";
import LazyEditor from "@components/LazyEditor";
import Preview from "@components/Preview";
import Header from "@components/Header";
import { saveToLocalStorage, loadFromLocalStorage } from "@lib/markdown";
import {
  downloadHtml,
  downloadFile,
  copyToClipboard,
} from "@utils/fileHelpers";
import { downloadAsPDF } from "@utils/pdf/download";
import { parseMarkdown } from "@lib/markdown";
import { getBaseFilename } from "@utils/common";
import { STORAGE_KEYS, FILE_CONFIG, EDITOR_CONFIG } from "@utils/constants";
import type { EditorRef } from "@components/Editor";

const App: React.FC = () => {
  const [filename, setFilename] = useState(
    localStorage.getItem(STORAGE_KEYS.filename) ||
      `${FILE_CONFIG.defaultFilename}${FILE_CONFIG.extensions.markdown}`,
  );
  const [content, setContent] = useState(
    loadFromLocalStorage() ||
      `# Welcome to MDZen - Minimal Markdown Editor!

Start typing your **Markdown** here and see the live preview on the right!

## Markdown Formatting Examples

### Headers
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

### Text Formatting
**Bold text** or __bold text__
*Italic text* or _italic text_
***Bold and italic*** or ___bold and italic___
~~Strikethrough text~~
\`inline code\`

### Lists
#### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

#### Ordered List
1. First item
2. Second item
3. Third item

### Links and Images
[Link text](https://example.com)
![Alt text](https://example.com/image.jpg)

### Code Blocks
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

### Blockquotes
> This is a blockquote
> 
> It can span multiple lines
> 
> > And be nested

### Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Horizontal Rules
---

### Task Lists
- [x] Completed task
- [ ] Pending task
- [ ] Another task

**Happy writing!** 🚀`,
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if dark mode was previously enabled
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.isDarkMode);
    const prefersDark =
      savedDarkMode === "true" ||
      (!savedDarkMode &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Apply dark class immediately on load
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }

    return prefersDark;
  });
  const [fontSize, setFontSize] = useState<number>(
    EDITOR_CONFIG.fontSize.default,
  );
  const [autoSave, setAutoSave] = useState(true);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const editorRef = useRef<EditorRef | null>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (autoSave) {
      saveToLocalStorage(newContent);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // Toggle dark class on html element
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Save preference
    localStorage.setItem(STORAGE_KEYS.isDarkMode, String(newDarkMode));
  };

  const handleFilenameChange = (newFilename: string) => {
    setFilename(newFilename);
    // Auto-save filename to localStorage
    localStorage.setItem(STORAGE_KEYS.filename, newFilename);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
  };

  const handleAutoSaveToggle = () => {
    setAutoSave(!autoSave);
  };

  // Download handlers
  const handleDownloadMarkdown = () => {
    const baseFilename = getBaseFilename(filename);
    downloadFile(
      baseFilename + FILE_CONFIG.extensions.markdown,
      content,
      FILE_CONFIG.mimeTypes.markdown,
    );
  };

  const handleDownloadHtml = async () => {
    const bodyHtml = await parseMarkdown(content);
    const baseFilename = getBaseFilename(filename);
    downloadHtml(baseFilename + FILE_CONFIG.extensions.html, bodyHtml);
  };

  const handleCopyContent = async () => {
    try {
      const success = await copyToClipboard(content);
      if (success) {
        console.log("✅ Content copied to clipboard!");
      } else {
        console.error("❌ Failed to copy content");
      }
    } catch (error) {
      console.error("❌ Copy error:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      console.log("Generating PDF...");

      const baseFilename = getBaseFilename(filename);
      const pdfFilename = baseFilename + FILE_CONFIG.extensions.pdf;

      const success = await downloadAsPDF(parseMarkdown(content), pdfFilename);

      if (success) {
        console.log("✅ PDF generated successfully!");
        console.log(`📄 PDF saved as: ${pdfFilename}`);
      } else {
        console.error("❌ Failed to generate PDF");
        console.log(
          "💡 Tip: Try using browser's print function (Ctrl+P) as alternative",
        );
      }
    } catch (error) {
      console.error("❌ PDF download error:", error);
      console.log(
        "💡 Tip: Try using browser's print function (Ctrl+P) as alternative",
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calculate content stats
  const lineCount = content.split("\n").length;
  const wordCount =
    content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const charCount = content.length;

  return (
    <div className="h-screen flex flex-col">
      <Header
        filename={filename}
        onFilenameChange={handleFilenameChange}
        wordCount={wordCount}
        charCount={charCount}
        lineCount={lineCount}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
        showDownloadDropdown={showDownloadDropdown}
        showSettingsDropdown={showSettingsDropdown}
        onDownloadToggle={() => setShowDownloadDropdown(!showDownloadDropdown)}
        onSettingsToggle={() => setShowSettingsDropdown(!showSettingsDropdown)}
        onDownloadMarkdown={handleDownloadMarkdown}
        onDownloadHtml={handleDownloadHtml}
        onDownloadPDF={handleDownloadPDF}
        onCopyContent={handleCopyContent}
        isGeneratingPDF={isGeneratingPDF}
        fontSize={fontSize}
        autoSave={autoSave}
        onFontSizeChange={handleFontSizeChange}
        onAutoSaveToggle={handleAutoSaveToggle}
      />

      <div className="flex flex-1 min-h-0">
        {/* Editor Panel */}
        <div className="w-1/2 border-r-2 border-gray-300 dark:border-gray-600 flex flex-col min-h-0">
          <LazyEditor
            ref={editorRef}
            content={content}
            onContentChange={handleContentChange}
            fontSize={fontSize}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 flex flex-col min-h-0">
          <Preview content={content} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
};

export default App;
