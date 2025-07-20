# Vercel Deployment Guide

## Prerequisites

1. **Environment Variables**: Set these in your Vercel project dashboard:
   - `LLM_PROVIDER`: Set to `anthropic` for production (or `llama` for local Ollama)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (required if using Anthropic)
   - `NODE_ENV`: Set to `production`

## Deployment Steps

### Method 1: Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from the backend directory
cd backend
vercel

# Set environment variables
vercel env add LLM_PROVIDER production
vercel env add ANTHROPIC_API_KEY production
vercel env add NODE_ENV production
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Import the repository in Vercel dashboard
3. Set the root directory to `backend`
4. Add environment variables in the project settings
5. Deploy

## API Endpoints

After deployment, your API will be available at:
- `https://your-project.vercel.app/api/health`
- `https://your-project.vercel.app/api/analyze-topic`
- `https://your-project.vercel.app/api/generate-thread`
- `https://your-project.vercel.app/api/generate-with-context`

## Local Development

For local development, continue using:
```bash
npm run dev
```

This will start the traditional HTTP server on `localhost:3001`.

## Configuration Files

- `vercel.json`: Vercel deployment configuration
- `api/`: Serverless function routes for Vercel
- `src/`: Source code (also works locally)
- `.vercelignore`: Files to exclude from deployment

## Troubleshooting

1. **Build Errors**: Ensure TypeScript is in dependencies (not devDependencies)
2. **Import Errors**: Check that paths in API files correctly reference `../src/`
3. **Environment Variables**: Verify all required env vars are set in Vercel dashboard
4. **CORS Issues**: API routes include CORS headers for frontend access

## Notes

- The existing `src/server.ts` is kept for local development
- Vercel uses the `api/` directory for serverless functions
- Each API route is a separate serverless function
- Function timeout is set to 60 seconds for generation endpoints 