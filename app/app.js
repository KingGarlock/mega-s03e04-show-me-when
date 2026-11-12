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

function createRow(incident) {
  const row = document.createElement('li');
  row.dataset.testid = 'incident-row';
  row.dataset.id = incident.id;
  for (const className of ['id', 'sev', 'what']) {
    const span = document.createElement('span');
    span.className = className;
    row.append(span);
  }
  row.append(document.createElement('time'));
  const button = document.createElement('button');
  button.dataset.testid = 'ack';
  button.type = 'button';
  button.setAttribute('aria-label', 'Ack ' + incident.id);
  button.addEventListener('click', () => {
    if (pending.has(incident.id)) return;
    confirmationTarget = incident.id;
    confirmationText.textContent = 'Acknowledge incident ' + incident.id + '?';
    confirmation.showModal();
  });
  row.append(button);
  return row;
}

function render() {
  const incidentsByTime = incidents.slice().sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
  const existing = new Map([...list.children].map(row => [row.dataset.id, row]));
  const ids = new Set(incidentsByTime.map(incident => incident.id));
  for (const [id, row] of existing) if (!ids.has(id)) row.remove();
  incidentsByTime.forEach((incident, index) => {
    const row = existing.get(incident.id) || createRow(incident);
    row.className = 'row ' + incident.severity;
    row.querySelector('.id').textContent = incident.id;
    row.querySelector('.sev').textContent = incident.severity;
    row.querySelector('.what').textContent = incident.service + ' · ' + incident.region + ' · ' + incident.summary;
    const time = row.querySelector('time');
    time.dateTime = incident.openedAt;
    time.textContent = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(incident.openedAt));
    const button = row.querySelector('[data-testid="ack"]');
    if (acknowledged.has(incident.id)) {
      if (button) {
        const mark = document.createElement('span');
        mark.dataset.testid = 'acked';
        mark.className = 'acked';
        mark.textContent = 'Acked';
        button.replaceWith(mark);
      }
    } else if (button) {
      button.textContent = pending.has(incident.id) ? 'Acknowledging…' : 'Ack';
      button.disabled = pending.has(incident.id);
    }
    // Insert new arrivals without detaching rows already in their correct positions.
    if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
  });
  empty.hidden = incidentsByTime.length !== 0;
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
