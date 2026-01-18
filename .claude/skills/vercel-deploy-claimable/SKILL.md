---
name: vercel-deploy-claimable
description: Deploy applications and websites to Vercel instantly. Designed for use with claude.ai and Claude Desktop to enable deployments directly from conversations. Deployments are "claimable" - users can transfer ownership to their own Vercel account.

Use when:
  "Deploy my app"
  "Deploy this to production"
  "Deploy and give me a link"

---

## How It Works

### Framework Detection

The skill automatically detects which framework your project uses:
- **Next.js** - 13.5+ frameworks via `next.config.js`
- **Vite** - via `vite.config.js`  
- **Astro** - via `astro.config.mjs`
- **Nuxt** - via `nuxt.config.ts`
- **Remix** - via `remix.config.ts`

### Package Your Project

**Zip your project folder**:
```bash
zip -r project-folder.zip project-folder
```

**Upload to Vercel**:
```bash
npx vercel deploy project-folder.zip
```

### Claim Ownership

After successful deployment:
- The skill helps you claim ownership of the deployment in your Vercel account
- Updates your `.vercel/project.json` file
- Sets the proper owner

## Features

**Instant Deployment**
- No manual build steps required
- Framework auto-detection
- Preview URLs generated automatically

**Claim Management**
- Transfer ownership to your personal Vercel account
- Works with `claude.ai` authentication

**Multi-Platform Support**
- Deployments are accessible from both Claude Desktop and claude.ai
- Syncs project ownership settings

## Output

When you ask the agent to deploy, it provides:
- **Deployment successful!**
  - Preview URL: `https://project-name.vercel.app`
  - Claim URL: `https://vercel.com/claim-deployment?code=...`

---

## Troubleshooting

**Deployment failed**
- Provide clear error message with actionable steps

**Preview URL not working**
- Check your `.vercel/project.json` settings

**Claim transfer failed**
- Explain Vercel account connection issues
- Suggest manual ownership transfer via Vercel Dashboard

---

## Example Usage

```
Deploy my app
```

The agent will automatically:
1. Detect your framework
2. Package your project
3. Upload to Vercel
4. Provide preview and claim URLs

---

## Configuration

No configuration needed. The skill works by detecting your project structure and framework automatically.

---

## Permissions

The skill requires:
- `vercel login` - To authenticate with Vercel CLI
- `zip` - To package project folder
- `vercel deploy` - To upload to Vercel

---

## Limitations

- **Single project per session**
- **Preview URLs expire in 60 minutes**
- **Claims are not binding** - Vercel account required

---

## Notes

This skill simplifies deployment to a single prompt. For complex scenarios, deploy manually via `npx vercel deploy` instead.
