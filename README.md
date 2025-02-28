# LockIn

A desktop application built with Electron and React to help users stay focused on their tasks. LockIn allows you to create a list of tasks and monitors your screen activity to ensure you stay on track.

## Features

- ✨ Modern, clean UI built with React and Tailwind CSS
- 🎯 Task list creation and management
- ⚡ Real-time task progress tracking
- 🔄 Drag-and-drop task reordering
- 🌙 Dark mode by default

## Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LockIn.git
cd LockIn
```

2. Install dependencies:
```bash
cd app-desktop
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start both the webpack dev server and the Electron application.

### Building

To create a production build:

```bash
npm run build
```

## Project Structure

```
app-desktop/
├── src/
│   ├── main/         # Electron main process
│   └── renderer/     # React application (renderer process)
│       ├── components/
│       ├── styles/
│       └── utils/
├── package.json
├── webpack.config.js
└── tsconfig.json
```

## Technologies

- Electron
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Webpack

## License

MIT 