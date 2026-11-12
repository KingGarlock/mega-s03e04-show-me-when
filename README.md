# sched-prod incident board

The on-call incident board for sched-prod: a static page (`app/`) that reads tonight's incidents from the
course's incident API. Read `plan.md` first, then the four ready issues in `issues/`.

## Run it

1. Deploy `proxy.js` to Cloudflare Workers using `wrangler.jsonc`. Store the course session as an encrypted `COURSE_SESSION` secret on the Worker. Do not put it in public source or browser configuration.
2. Set `app/config.js` to the Worker's public URL with an `/api` suffix. Leave the browser's `SESSION` empty. The proxy inserts the private session when forwarding incident and Ack requests to the course.
3. Serve `app/` locally with `bun run serve`.
4. The Deploy board GitHub Actions workflow publishes `app/` to GitHub Pages and stamps the commit SHA into the page metadata and footer. The proxy accepts browser calls from this GitHub Pages account's origin.

## The incident API

The course base is `api` from start-challenge. The browser uses the public proxy's `/api` base instead. `api.js` remains the supplied client; the proxy preserves the `/api/incidents` and `/api/ack` paths for the course replay.

| call | answers |
|------|---------|
| `GET <api>/incidents?t=<session>[&since=<cursor>]` | `{ updatedAt, incidents: [{ id, service, region, summary, severity, openedAt }], cursor }` — newest first |
| `GET <api>/ack?t=<session>&id=<incident id>&cursor=<latest cursor>` | `{ id, ackedAt, receipt }` |

Every ack answers with a sealed **receipt** (opaque: the course reads it, you quote it). `api.js`
keeps them in `acks` and logs each one to the console.

## What to send

**Step 1 — evidence.** A recording of the board in use, at a public https link (a file in your repo, a
release asset, any host that serves the file itself), and a short Markdown report:

````markdown
## What you checked
<what you did on the board, and what you saw>

## When
<mm:ss in the recording>

## Where
<the file behind what you saw (file:line)>

## Options for product
<what product could decide, as options>

```evidence
{
  "flow": "<open-board | ack-incident | watch-board>",
  "at": "<mm:ss>",
  "receipt": "<the ack receipt for that moment>",
  "sha": "<the build the recording shows>",
  "videoLink": "https://<the recording>"
}
```
````

Send it with claim-challenge: `{ session, step: 1, url, report, videoLink }`. Product reads it and answers.

Product answers a few minutes later: by mail to your agent inbox (if you built one), and through
resume-challenge with `receipts: { productReceipt }`.

**Step 2 — proof of the new build.** Change what product decided, deploy, record it again, then run the
course's replay against your URL. Product's answer says how: on GitHub (this repo public, with
`.github/workflows/prove.yml` as shipped — Actions → prove → Run workflow), or on your machine. Send a
fresh report: a `## System Diff` section (what changed against the plan — behavior, UX, data — product's
decision, and the `data-testid` hooks it touched), and one ```` ```evidence ```` block naming the build your
recording shows:

```evidence
{ "sha": "<build>", "videoLink": "https://<the new recording>", "runUrl": "https://github.com/<you>/<repo>/actions/runs/<id>" }
```

`{ session, step: 2, productReceipt, url, report, videoLink }` — plus `replay` (what the replay printed)
when you ran it on your machine instead of GitHub.
