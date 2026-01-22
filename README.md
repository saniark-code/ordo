<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1iHcfjZOSSUBmOOPJPiZwVPYVNxovXbVW

## Run Locally

**Prerequisites:**  Node.js and a Gemini API key

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a `.env.local` file** in the root directory:
   ```bash
   # Gemini API (required)
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   
   **Get your API key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free API key
   - Copy the key and paste it into `.env.local`
   
   **Note:** The API key is stored in `.env.local` which is git-ignored for security.

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. Open the app in your browser at `http://localhost:3000`

## Troubleshooting

### Blank Screen
- Check the browser console (F12 or Cmd+Option+I) for JavaScript errors
- Ensure the dev server is running on the correct port
- Clear your browser cache and refresh

### AI Image Generation Not Working / Focus Steps Not Generating
- **Most common issue:** Missing or incorrect API key
  1. Verify `.env.local` exists in the project root
  2. Check that `GEMINI_API_KEY` is set correctly (no quotes, no spaces)
  3. Restart the dev server after changing `.env.local`
  
- **Check browser console** for errors:
  - "API key not found" → Create/update `.env.local`
  - "401 Unauthorized" → Invalid API key
  - "429 Too Many Requests" / "Quota Exceeded" → **Free tier quota reached**
    - Wait a few minutes and try again
    - Check your usage: https://ai.dev/rate-limit
    - Free tier limits: ~15 requests/minute, ~1500 requests/day
    - Consider upgrading or waiting until quota resets (daily reset)
  - Network errors → Check your internet connection

- **Verify API key is loaded:**
  - Open browser console and check for "Initializing GoogleGenAI" log
  - If you see "API key is missing", the `.env.local` file isn't being read

### Port Already in Use
- The app will try to use port 3000 by default
- If it's taken, Vite will automatically try another port
- Check the terminal output for the actual port number
