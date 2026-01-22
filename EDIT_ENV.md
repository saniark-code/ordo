# How to Edit .env.local (Ignored File)

The `.env.local` file is intentionally ignored by git (pattern `*.local` in `.gitignore`) for security reasons. Here are several ways to edit it:

## Method 1: Terminal Commands

Open your terminal and run:

```bash
cd /Users/saniarahman/ordo
nano .env.local
```

Then:
1. Replace `your_api_key_here` with your actual API key
2. Press `Ctrl+X` to exit
3. Press `Y` to save
4. Press `Enter` to confirm

## Method 2: VS Code / Cursor (Command Line)

```bash
code .env.local --no-ignore
```

Or in Cursor:
```bash
cursor .env.local --no-ignore
```

## Method 3: Direct Terminal Edit

Replace `YOUR_ACTUAL_KEY_HERE` with your key:

```bash
cd /Users/saniarahman/ordo
echo "GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE" > .env.local
```

## Method 4: Using vim

```bash
cd /Users/saniarahman/ordo
vim .env.local
```

Then:
- Press `i` to enter insert mode
- Edit the file
- Press `Esc` then type `:wq` and press Enter to save and exit

## Get Your API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Get API key" or "Create API key"
4. Copy the key (starts with `AIzaSy...`)

## After Editing

**IMPORTANT**: You must restart the dev server after editing `.env.local`:

1. Stop the server: Press `Ctrl+C` in the terminal running `npm run dev`
2. Start it again: `npm run dev`

## Verify It Works

1. Open browser console (F12)
2. Try to generate an image
3. Look for `🔍 API Key Check:` log - it should show your key is loaded
