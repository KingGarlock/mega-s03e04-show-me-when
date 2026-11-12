import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('[role="status"]');
const confirmation = document.querySelector('[data-testid="confirm"]');
const confirmationText = document.querySelector('#confirm-description');
const acknowledged = new Map();
const pending = new Set();
let confirmationTarget = null;
let incidents = [];
let loading = false;

function closeConfirmation() {
  confirmationTarget = null;
  confirmation.close();
}

confirmation.querySelector('[data-testid="confirm-cancel"]').addEventListener('click', closeConfirmation);
confirmation.addEventListener('cancel', () => { confirmationTarget = null; });
confirmation.querySelector('[data-testid="confirm-ack"]').addEventListener('click', async () => {
  const id = confirmationTarget;
  if (!id || pending.has(id)) return;
  closeConfirmation();
  pending.add(id);
  render();
  try {
    const reply = await ack(id);
    acknowledged.set(id, reply);
    status.textContent = 'Acknowledged ' + id;
  } catch (error) {
    status.textContent = 'Could not acknowledge ' + id + '. Please try again.';
    console.error(error);
  } finally {
    pending.delete(id);
    render();
  }
});

function render() {
  const rows = incidents.slice().sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
  list.replaceChildren(...rows.map(incident => {
    const row = document.createElement('li');
    row.dataset.testid = 'incident-row';
    row.dataset.id = incident.id;
    row.className = 'row ' + incident.severity;
    for (const [className, value] of [['id', incident.id], ['sev', incident.severity], ['what', incident.service + ' · ' + incident.region + ' · ' + incident.summary]]) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = value;
      row.append(span);
    }
    const time = document.createElement('time');
    time.dateTime = incident.openedAt;
    time.textContent = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(incident.openedAt));
    row.append(time);
    if (acknowledged.has(incident.id)) {
      const mark = document.createElement('span');
      mark.dataset.testid = 'acked';
      mark.className = 'acked';
      mark.textContent = 'Acked';
      row.append(mark);
    } else {
      const button = document.createElement('button');
      button.dataset.testid = 'ack';
      button.type = 'button';
      button.textContent = pending.has(incident.id) ? 'Acknowledging…' : 'Ack';
      button.disabled = pending.has(incident.id);
      button.setAttribute('aria-label', 'Ack ' + incident.id);
      button.addEventListener('click', () => {
        if (pending.has(incident.id)) return;
        confirmationTarget = incident.id;
        confirmationText.textContent = 'Acknowledge incident ' + incident.id + '?';
        confirmation.showModal();
      });
      row.append(button);
    }
    return row;
  }));
  empty.hidden = rows.length !== 0;
}

async function refresh() {
  if (loading) return;
  loading = true;
  try {
    const page = await fetchIncidents();
    incidents = page.incidents;
    loader?.remove();
    render();
    document.querySelector('[data-testid="updated-at"]').textContent = 'Updated ' + new Date(page.updatedAt).toLocaleTimeString();
    if (status.textContent.startsWith('Could not load')) status.textContent = '';
  } catch (error) {
    status.textContent = 'Could not load incidents. Retrying automatically.';
    console.error(error);
  } finally {
    loading = false;
  }
}
refresh();
setInterval(refresh, 2000);
