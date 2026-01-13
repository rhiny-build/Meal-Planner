# Quick Start Guide

Get your Family Meal Planner running in 5 minutes!

## Prerequisites

- Node.js 18+ installed ([Download here](https://nodejs.org/))
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure OpenAI API Key
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Replace "your-openai-api-key-here" with your actual key
```

Your `.env` file should look like:
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"
```

### 3. Setup Database
```bash
# Generate Prisma client
npm run db:generate

# Create database
npm run db:push

# Add example recipes
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Your Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## What to Try First

1. **Browse Recipes** - Click "Recipes" in the header to see the 10 example recipes
2. **Add a Recipe** - Click "Add Recipe" and try the AI import feature
3. **Generate Meal Plan** - Click "Meal Plan" → "Generate New Meal Plan"
4. **Modify Plan** - Try natural language: "swap Tuesday for something faster"

## Troubleshooting

### Issue: Database errors
**Solution:** Delete `dev.db` and run the setup commands again

### Issue: AI features not working
**Solution:** Check your `.env` file has a valid OpenAI API key

### Issue: Port 3000 already in use
**Solution:** Stop other apps using port 3000, or edit `package.json` to use a different port

## Next Steps

- Read [README.md](./README.md) for complete documentation
- Explore the code starting with [app/page.tsx](./app/page.tsx)
- Check out [lib/ai.ts](./lib/ai.ts) to understand the AI integration

## Need Help?

- Check the full [README.md](./README.md) for detailed explanations
- Look at code comments - every file is documented
- The TypeScript types in [types/index.ts](./types/index.ts) explain data structures
