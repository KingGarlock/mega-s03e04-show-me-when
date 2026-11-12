# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | selects Ack on a row, checks the incident ID in a confirmation, then confirms or cancels |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** Each incident row has an **Ack** button. Ack opens a confirmation naming the incident ID. Confirm sends the ack (`api.ack(id)`) for that captured ID and marks its row acked. Cancel or Escape sends no ack. New arrivals keep appearing live at the top while the confirmation is open; they do not change the captured ID.
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `confirm` | the confirmation dialog, naming the incident ID |
| `confirm-ack` | sends Ack for the confirmed ID |
| `confirm-cancel` | closes the confirmation without sending Ack |
| `build-sha` | the sha in the footer |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.

## Product decision after step one

Product reviewed the recording at 00:19 and chose to retain R1 live ordering and per-row Ack. R2 now requires confirmation naming the incident ID. The incident data model and course API contract stay the same; confirmation holds only a temporary selected ID in browser memory.

Refresh updates existing incident rows in place. Inserting an arrival must not destroy and recreate existing rows or their controls. The proxy preserves the course's `/api/incidents` and `/api/ack` paths so the supplied replay can observe the same flow.
