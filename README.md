[![Release](https://github.com/nguyenthanhan/md-zen/actions/workflows/release.yml/badge.svg)](https://github.com/nguyenthanhan/md-zen/actions/workflows/release.yml)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black)](https://vercel.com/heimers-projects/md-zen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

# MDZen - Minimal Markdown Editor

A clean, fast, and responsive markdown editor built with React and CodeMirror.

## Features

- **Live Preview**: See your markdown rendered in real-time
- **Dark/Light Theme**: Toggle between themes
- **Font Size Control**: Adjust text size for better readability
- **Auto-save**: Automatically saves your content to localStorage
- **Export Options**: Download as Markdown, HTML, or PDF
- **Responsive Design**: Works on desktop and mobile devices
- **Enhanced Scrolling**: Improved scroll sensitivity and behavior

## Enhanced Scrolling

MDZen includes custom scroll behavior to address common scrolling issues:

### Scroll Sensitivity

- **Increased sensitivity**: Scroll moves content more with less wheel movement
- **Edge acceleration**: Reduced excessive scrolling when near top/bottom
- **Smooth scrolling**: Consistent scroll behavior across editor and preview

### Scroll Behavior Features

- **Thin scrollbars**: 8px width for better content visibility
- **Hover effects**: Scrollbar highlights on hover
- **Touch support**: Optimized for mobile devices
- **Performance**: 240fps scrolling with requestAnimationFrame
- **Sync**: Editor and preview scroll in perfect sync

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/nguyenthanhan/md-zen.git
cd md-zen
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm release` - Create a new release

## Tech Stack

- **Frontend**: React ^19.1.0, TypeScript
- **Editor**: CodeMirror 6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Known Limitations

### Relative links in Markdown

The preview sanitizer allows explicit relative URL prefixes: `#anchor`, `/path`, `./path`, and `../path`. Bare relative paths without a prefix — such as `images/photo.png` or `other-doc.md` — are stripped from `href` and `src` attributes.

This is intentional: MDZen is a web-based editor with no concept of a local file-system base URL, so bare relative paths cannot be resolved meaningfully and could be confused with protocol-relative URLs (`//evil.example`). Use explicit prefixes (`./images/photo.png`) or absolute HTTPS URLs for images and links.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [CodeMirror](https://codemirror.net/) for the excellent editor
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React](https://react.dev/) for the amazing UI library
