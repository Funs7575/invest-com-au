# Notification guide — only get emails when there's something to do

Goal: every email arriving in your inbox from this repo represents something Finn personally needs to act on. No spam from auto-loop activity, bot commits, or PR back-and-forth.

This setup combines GitHub's built-in subscription controls with the repo's own assignment/labelling conventions so the result is signal-only.

---

## Step 1 — Configure your repo Watch level (one-time)

1. Open https://github.com/Funs7575/invest-com-au
2. Top-right of the repo page, click the **Watch** dropdown
3. Click **Custom**
4. Check ONLY: **Issues** and **Releases**
5. Uncheck: Pull requests, Discussions, Security alerts (unless you need them)
6. Click **Apply**

Effect: GitHub no longer emails you for routine PR activity, comments on PRs, branch creates, or commit pushes.

## Step 2 — Personal notification settings (one-time)

1. Open https://github.com/settings/notifications
2. Under **Email notifications**, ensure your email is set
3. Under **Watching**, choose **Only notify me when participating or @mentioned**
4. Under **Participating**, ensure **Email** is checked
5. Under **Custom routing** (if available), point repo emails to your preferred address

Effect: you get emails for:

- Issues opened that mention you (`@Funs7575`)
- Issues assigned to you
- Replies to threads you've already commented on
- Releases (rare — for actual product releases)

## Step 3 — Set a Gmail filter (optional but recommended)

Filter: `subject:[ACTION REQUIRED]`

Action: star + apply label "Invest action required" + skip inbox if you want a focused queue.

Effect: the auto-loop's alert system tags everything that needs your eyes with the `[ACTION REQUIRED]` prefix, so you can triage the day's actions in one filter.

---

## What the system does, on your end

| Event | Notification you get |
|---|---|
| Loop opens a PR | None (PRs are filtered out at Step 1) |
| Loop merges a PR | None |
| Loop pushes a commit | None |
| CI failure on main | None (the auto-revert workflow handles it without paging you) |
| **Loop spend exceeds threshold** | **Email — `[ACTION REQUIRED]` issue, assigned to you, with a 4-step checklist** |
| **Loop's stuck-detection surfaces a Blocked entry** | **Email — `[ACTION REQUIRED]` issue, assigned to you** (when that mechanism lands) |
| **A PR explicitly tags you for review** | Email — mention notification |
| Routine bot commit (queue update, types regen, snapshot) | None |
| New release published | Email |

## Pausing the loop when an alert fires

If you get an `[ACTION REQUIRED]` email and the issue's checklist points to a runaway pattern, the loop has a built-in self-pause mechanism:

```bash
echo "Paused 2026-05-02 — LH gate spiral, see issue #N" > LOOP_PAUSE
git add LOOP_PAUSE
git commit -m "ops: pause loop pending issue #N"
git push origin main
```

The loop's Phase 0.5 reads `LOOP_PAUSE` at the repo root. If present, every cloud fire exits immediately with `STATUS: PAUSED · LOOP_PAUSE sentinel present` — printing the file's contents so the cron history shows the reason.

To resume:

```bash
git rm LOOP_PAUSE
git commit -m "ops: resume loop — issue #N resolved"
git push origin main
```

Next fire after that lands picks up where it left off.

## Tuning the alert threshold

The spend tracker's alert thresholds are in `.github/workflows/loop-spend-tracker.yml`:

```yaml
env:
  COMMITS_WARN: "40"   # daily loop commits — warn level
  COMMITS_CRIT: "80"   # daily loop commits — critical level
```

If you find the warn threshold trips on healthy days (e.g., a big test backfill batch), bump it. If you want the alert sooner, lower it. Each PR to change these is auto-classified as `auto-merge-safe` (path is `.github/workflows/`, but it's a config-only change — review on merit).

---

## TL;DR

- One-time: set Watch to Custom + only Issues
- One-time: enable assignment notifications in personal settings
- Optional: Gmail filter on `[ACTION REQUIRED]`
- Result: emails arrive ONLY for issues someone — usually the loop's own alert system — explicitly assigned to you
- When an alert says "loop runaway", paste a single command to pause; resume with another single command
