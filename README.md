# Tweety - AI Technical Thread Generator

> AI-powered Twitter thread generator for B2B SaaS entrepreneurs and technical professionals to build authority through high-quality, technical content.

## 🚀 Features

- **AI-Powered Generation**: Uses Ollama + Llama 3.2 for intelligent thread creation
- **Technical Focus**: Specializes in database topics and B2B SaaS content
- **Clean UI**: Typefully-inspired minimalist design for distraction-free writing
- **Real-time Editing**: Inline editing with character counting and validation
- **Copy to Clipboard**: Easy sharing of individual tweets or entire threads
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🏗️ Tech Stack

- **Backend**: Node.js + TypeScript (Pure HTTP, no Express)
- **Frontend**: Vanilla TypeScript + Tailwind CSS + Vite
- **AI Model**: Ollama + Llama 3.2
- **Architecture**: Session-based (no database required)

## 📋 Prerequisites

- Node.js 18+ 
- [Ollama](https://ollama.ai/) installed and running
- Llama 3.2 model downloaded (`ollama pull llama3.2`)

## 🔧 Installation

1. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd tweety
   npm run setup
   ```

2. **Start Ollama (if not already running):**
   ```bash
   ollama serve
   # In another terminal:
   ollama pull llama3.2
   ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3001/api

## 🎯 Usage

1. **Enter a Technical Topic**: Database indexing, HTTP/2, API design, etc.
2. **Add Context** (optional): Specific angles or details you want included
3. **Generate Thread**: AI creates 5-7 technical tweets with emojis and examples
4. **Edit & Refine**: Click on any tweet to edit inline
5. **Copy & Share**: Copy individual tweets or the entire thread

## 📖 Example Topics

- "Database indexing strategies for high-traffic applications"
- "HTTP/2 multiplexing benefits and implementation"
- "API rate limiting patterns and best practices"
- "PostgreSQL vs MongoDB for B2B SaaS"
- "Microservices communication patterns"

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
tweety/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Main HTTP server
│   │   └── services/
│   │       └── threadGenerator.ts # Ollama integration
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.ts                # Frontend logic
│   │   └── styles.css             # Tailwind + custom styles
│   ├── index.html                 # Main HTML
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── package.json                   # Root package for scripts
```

## 🔌 API Endpoints

### Generate Thread
```
POST /api/generate-thread
Content-Type: application/json

{
  "topic": "Database indexing strategies",
  "context": "Focus on B-tree vs Hash indexes",
  "tone": "professional"
}
```

### Health Check
```
GET /api/health
```

## 🎨 UI Design Philosophy

Inspired by Typefully's clean, minimal approach:
- **Distraction-free**: No feeds, notifications, or clutter
- **Focus on writing**: Clean typography and spacious layouts
- **Character counting**: Real-time feedback with visual warnings
- **Smooth interactions**: Subtle animations and responsive design

## 🚧 Troubleshooting

### Common Issues

1. **"Failed to generate thread"**
   - Ensure Ollama is running: `ollama serve`
   - Verify llama3.2 is installed: `ollama list`

2. **Backend connection errors**
   - Check if backend is running on port 3001
   - Verify CORS settings in server.ts

3. **Frontend build issues**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run build`

## 🔮 Roadmap

- [ ] Tweet regeneration functionality
- [ ] Multiple tone options
- [ ] Thread templates
- [ ] Visual diagram integration
- [ ] Export to various formats
- [ ] User preference saving
- [ ] Thread analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real thread generation
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

---

**Built for B2B SaaS entrepreneurs and technical professionals who want to share expertise and build authority through high-quality Twitter threads.** 