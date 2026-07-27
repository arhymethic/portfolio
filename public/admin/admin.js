(async function adminMain() {
  'use strict';

  let cfg = {};
  try {
    const r = await fetch('/api/config', { credentials: 'same-origin' });
    cfg = await r.json();
  } catch (e) {
    console.warn('[admin] could not load config:', e.message);
  }

  const theme = cfg.theme || {};
  if (theme.colors) {
    const root = document.documentElement;
    for (const [varName, value] of Object.entries(theme.colors)) {
      root.style.setProperty(varName, value);
    }
  }

  if (theme.dots) {
    const setDot = (id, color) => {
      const el = document.getElementById(id);
      if (el) { el.style.background = color; el.style.boxShadow = `0 0 6px ${color}`; }
    };
    setDot('adot-r', theme.dots.red    || '#ff5f57');
    setDot('adot-y', theme.dots.yellow || '#febc2e');
    setDot('adot-g', theme.dots.green  || '#28c840');
  }

  const nameLower = (cfg.name || 'admin').toLowerCase();
  document.getElementById('pu-search').textContent = nameLower;
  document.getElementById('pu-table').textContent  = nameLower;

  const titleFmt = cfg.ui?.nav?.titleFormat || '{name}@portfolio:~';
  document.getElementById('admin-title').textContent =
    titleFmt.replace('{name}', nameLower) + ' — ADMIN';

  let allContacts = [];

  const searchInput   = document.getElementById('search-input');
  const searchBtn     = document.getElementById('search-btn');
  const resultsBlock  = document.getElementById('results-block');
  const contactsTbody = document.getElementById('contacts-tbody');
  const tableHeader   = document.getElementById('table-header');
  const emptyMsg      = document.getElementById('empty-msg');
  const statTotal     = document.getElementById('stat-total');
  const statEnriched  = document.getElementById('stat-enriched');
  const statLast      = document.getElementById('stat-last');
  const detailOverlay = document.getElementById('detail-overlay');
  const detailBody    = document.getElementById('detail-body');
  const detailTitle   = document.getElementById('detail-title');
  const detailClose   = document.getElementById('detail-close');

  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) +
           ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }

  function enrichBadge(contact) {
    const e = contact.enriched;
    if (!e)                     return '<span class="enrich-badge badge-pending">⏳ pending</span>';
    if (e.status === 'success') return '<span class="enrich-badge badge-ok">✅ enriched</span>';
    if (e.status === 'partial') return '<span class="enrich-badge badge-pending">⚡ partial</span>';
    return '<span class="enrich-badge badge-failed">❌ failed</span>';
  }

  async function authFetch(url, options = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    if (res.status === 401) throw new Error('Session expired — refresh the page to re-authenticate.');
    return res;
  }

  async function loadContacts() {
    try {
      const res = await authFetch('/admin/contacts');
      if (!res.ok) throw new Error(res.statusText);
      allContacts = await res.json();
      renderTable(allContacts);
      updateStats(allContacts);
    } catch (err) {
      tableHeader.textContent = `// Error: ${err.message}`;
    }
  }

  function updateStats(data) {
    const enriched = data.filter(c => c.enriched?.status === 'success' || c.enriched?.status === 'partial').length;
    statTotal.textContent    = data.length;
    statEnriched.textContent = enriched;
    const last = [...data].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    statLast.textContent = last ? formatTime(last.timestamp) : '—';
  }

  function renderTable(data) {
    const filterVal = document.getElementById('filter-select')?.value || 'all';
    let filtered = [...data];
    if (filterVal === 'enriched') {
      filtered = filtered.filter(c => c.enriched?.status === 'success' || c.enriched?.status === 'partial');
    } else if (filterVal === 'pending') {
      filtered = filtered.filter(c => !c.enriched || c.enriched.status === 'pending');
    } else if (filterVal === 'failed') {
      filtered = filtered.filter(c => c.enriched?.status === 'failed');
    }

    const sortVal = document.getElementById('sort-select')?.value || 'captured-desc';
    filtered.sort((a, b) => {
      if (sortVal === 'captured-desc')  return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortVal === 'captured-asc')   return new Date(a.timestamp) - new Date(b.timestamp);
      if (sortVal === 'name-asc')       return (a.name || '').localeCompare(b.name || '');
      if (sortVal === 'name-desc')      return (b.name || '').localeCompare(a.name || '');
      if (sortVal === 'followers-desc') {
        return (b.enriched?.instagram?.followers || 0) - (a.enriched?.instagram?.followers || 0);
      }
      return 0;
    });

    tableHeader.textContent = `// ${filtered.length} contact${filtered.length !== 1 ? 's' : ''} shown`;

    if (filtered.length === 0) {
      emptyMsg.classList.remove('hidden');
      contactsTbody.innerHTML = '';
      return;
    }
    emptyMsg.classList.add('hidden');

    contactsTbody.innerHTML = filtered.map(c => {
      const e = c.enriched;
      const photoUrl = e?.linkedin?.photoUrl || e?.instagram?.photoUrl || '';
      const photoHtml = photoUrl
        ? `<img class="table-avatar" src="${esc(photoUrl)}" alt="" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"/><div class="table-avatar-fallback hidden">${esc(c.initials || c.name.charAt(0).toUpperCase())}</div>`
        : `<div class="table-avatar-fallback">${esc(c.initials || c.name.charAt(0).toUpperCase())}</div>`;

      return `
        <tr data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="View ${esc(c.name)}">
          <td class="td-photo">${photoHtml}</td>
          <td class="td-name">${esc(c.name)}</td>
          <td>${esc(c.enriched?.linkedin?.headline || c.role || '—')}</td>
          <td class="td-handle">${c.instagram ? '@' + esc(c.instagram) : '—'}</td>
          <td class="td-handle">${c.linkedin   ? esc(c.linkedin) : '—'}</td>
          <td>${esc(c.whereMet || '—')}</td>
          <td>${enrichBadge(c)}</td>
          <td class="td-time">${formatTime(c.timestamp)}</td>
        </tr>
      `;
    }).join('');

    contactsTbody.querySelectorAll('tr').forEach(row => {
      const open = () => {
        const contact = allContacts.find(c => c.id === row.dataset.id);
        if (contact) openDetail(contact);
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    });
  }

  async function runSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    searchBtn.textContent = '⟳ searching…';
    resultsBlock.style.display = 'flex';
    resultsBlock.style.flexDirection = 'column';
    resultsBlock.style.gap = '10px';
    resultsBlock.innerHTML = '<p class="state-msg">// embedding query — running local model…</p>';

    try {
      const res  = await authFetch('/admin/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, topK: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      renderResults(data.results, query);
    } catch (err) {
      resultsBlock.innerHTML = `<p class="state-msg" style="color:var(--red)">// Error: ${esc(err.message)}</p>`;
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = '▶ SEARCH';
    }
  }

  function renderResults(results, query) {
    if (!results.length) {
      resultsBlock.innerHTML = `<p class="state-msg">// No matches for "${esc(query)}" — try different keywords.</p>`;
      return;
    }

    const header = `<div class="results-header">// top ${results.length} match${results.length !== 1 ? 'es' : ''} for "${esc(query)}"</div>`;
    const cards  = results.map(r => {
      const c = r.contact;
      const headline = c.enriched?.linkedin?.headline || c.role || '';
      const meta = [
        c.instagram ? `@${c.instagram}` : '',
        c.linkedin  ? `li:${c.linkedin}` : '',
        c.whereMet  ? `met: ${c.whereMet}` : '',
        c.enriched?.linkedin?.location || '',
      ].filter(Boolean).join(' · ');

      return `
        <div class="result-card" data-id="${esc(c.id)}" tabindex="0" role="button">
          <div>
            <div class="result-name">${esc(c.name)}</div>
            ${headline ? `<div class="result-headline">${esc(headline)}</div>` : ''}
            ${meta     ? `<div class="result-meta">${esc(meta)}</div>` : ''}
          </div>
          <div>
            <div class="result-score"><span class="result-score-label">match </span>${Math.round(r.score * 100)}%</div>
            <div style="margin-top:6px">${enrichBadge(c)}</div>
          </div>
        </div>`;
    }).join('');

    resultsBlock.innerHTML = header + cards;

    resultsBlock.querySelectorAll('.result-card').forEach(card => {
      const open = () => {
        const contact = allContacts.find(c => c.id === card.dataset.id);
        if (contact) openDetail(contact);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    });
  }

  function openDetail(c) {
    detailTitle.textContent = `${(c.name || 'contact').toLowerCase().replace(/\s+/g,'-')}.json`;

    const e  = c.enriched;
    const li = e?.linkedin  || {};
    const ig = e?.instagram || {};
    const photoUrl = li.photoUrl || ig.photoUrl || '';

    let html = '';

    if (photoUrl) {
      html += `<div class="detail-section photo-row">
        <img class="detail-photo" src="${esc(photoUrl)}" alt="${esc(c.name)}" onerror="this.style.display='none'" />
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--green);text-shadow:var(--glow-sm)">${esc(c.name)}</div>
          ${li.headline ? `<div style="font-size:0.82rem;color:var(--cyan-dim);margin-top:4px">${esc(li.headline)}</div>` : ''}
        </div>
      </div>`;
    } else {
      html += `<div class="detail-section">
        <div style="font-size:1.1rem;font-weight:800;color:var(--green);text-shadow:var(--glow-sm)">${esc(c.name)}</div>
        ${li.headline ? `<div style="font-size:0.82rem;color:var(--cyan-dim);margin-top:4px">${esc(li.headline)}</div>` : ''}
      </div>`;
    }

    html += `<div class="detail-section">
      <div class="detail-section-title">captured</div>
      ${row('email',     c.email)}
      ${row('role',      c.role)}
      ${row('instagram', c.instagram ? `<a href="https://instagram.com/${esc(c.instagram)}" target="_blank" rel="noopener noreferrer">@${esc(c.instagram)}</a>` : '')}
      ${row('linkedin',  c.linkedin  ? `<a href="https://linkedin.com/in/${esc(c.linkedin)}" target="_blank" rel="noopener noreferrer">${esc(c.linkedin)}</a>` : '')}
      ${row('where met', c.whereMet)}
      ${row('captured',  formatTime(c.timestamp))}
    </div>`;

    if (e) {
      html += `<div class="detail-section">
        <div class="detail-section-title">enrichment · ${esc(e.status)} · ${formatTime(e.scrapedAt)}</div>`;
      if (li.about)      html += row('about',      li.about);
      if (li.company)    html += row('company',    li.company);
      if (li.location)   html += row('location',   li.location);
      if (li.experience?.length) {
        const exp = li.experience.map(x => [x.title, x.company].filter(Boolean).join(' @ ')).join(', ');
        html += row('experience', exp);
      }
      if (ig.bio)       html += row('ig bio',   ig.bio);
      if (ig.followers) html += row('ig stats', `${ig.followers.toLocaleString()} followers · ${ig.following.toLocaleString()} following · ${ig.posts} posts`);
      html += '</div>';
    } else {
      html += `<div class="detail-section">
        <div class="detail-section-title">enrichment</div>
        <p class="state-msg" style="padding:0">// Not yet enriched — add instagram/linkedin usernames to trigger scraping.</p>
      </div>`;
    }

    html += `<div class="detail-section">
      <div class="detail-section-title">notes</div>
      <textarea class="search-input" id="detail-notes-input" style="width:100%; min-height:80px; resize:vertical; font-size:0.78rem; margin-bottom:8px;" placeholder="Add private notes about this contact...">${esc(c.notes || '')}</textarea>
      <button class="back-link" id="save-notes-btn" style="color:var(--cyan); border-color:var(--cyan); width:100%; text-align:center; padding:6px; font-size:0.72rem;">
        💾 SAVE NOTES
      </button>
    </div>`;

    html += `
      <div class="detail-section" style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
        <button class="back-link" id="delete-contact-btn" style="color:var(--red); border-color:var(--red); width:100%; text-align:center; padding:10px;">
          ☣ DELETE CONTACT
        </button>
      </div>
    `;

    detailBody.innerHTML = html;

    const saveNotesBtn = document.getElementById('save-notes-btn');
    const notesInput   = document.getElementById('detail-notes-input');
    if (saveNotesBtn && notesInput) {
      saveNotesBtn.addEventListener('click', async () => {
        saveNotesBtn.disabled = true;
        saveNotesBtn.textContent = '💾 SAVING...';
        try {
          const res = await authFetch(`/admin/contacts/${c.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: notesInput.value })
          });
          if (!res.ok) throw new Error('Failed to save notes');
          const data = await res.json();
          const contactIndex = allContacts.findIndex(x => x.id === c.id);
          if (contactIndex !== -1) allContacts[contactIndex] = data.contact;
          saveNotesBtn.textContent = '✅ SAVED';
          setTimeout(() => {
            saveNotesBtn.disabled = false;
            saveNotesBtn.textContent = '💾 SAVE NOTES';
          }, 1500);
          renderTable(allContacts);
        } catch (err) {
          alert('Error: ' + err.message);
          saveNotesBtn.disabled = false;
          saveNotesBtn.textContent = '💾 SAVE NOTES';
        }
      });
    }

    const deleteBtn = document.getElementById('delete-contact-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to delete ${c.name}? This will remove them from your contacts and semantic memory.`)) return;
        deleteBtn.disabled = true;
        deleteBtn.textContent = '☣ DELETING...';
        try {
          const res = await authFetch(`/admin/contacts/${c.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete');
          closeDetail();
          await loadContacts();
        } catch (err) {
          alert('Error: ' + err.message);
          deleteBtn.disabled = false;
          deleteBtn.textContent = '☣ DELETE CONTACT';
        }
      });
    }

    detailOverlay.hidden = false;
    detailOverlay.getBoundingClientRect();
    detailOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    detailClose.focus();
  }

  function row(key, val) {
    if (!val) return '';
    return `<div class="detail-row"><span class="detail-key">${esc(key)}</span><span class="detail-val">${val}</span></div>`;
  }

  function closeDetail() {
    detailOverlay.classList.remove('is-open');
    detailOverlay.addEventListener('transitionend', () => {
      detailOverlay.hidden = true;
      document.body.style.overflow = '';
    }, { once: true });
  }

  searchBtn.addEventListener('click', runSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', e => {
    if (!document.getElementById('detail-panel').contains(e.target)) closeDetail();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !detailOverlay.hidden) closeDetail();
  });

  const filterSelect = document.getElementById('filter-select');
  if (filterSelect) filterSelect.addEventListener('change', () => renderTable(allContacts));

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', () => renderTable(allContacts));

  const enrichAllBtn = document.getElementById('enrich-all-btn');
  if (enrichAllBtn) {
    enrichAllBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to scrape/enrich all contacts? This runs local Playwright scrapers sequentially in the background.')) return;
      enrichAllBtn.disabled = true;
      enrichAllBtn.textContent = '⚡ ENRICHING...';
      try {
        const res = await authFetch('/admin/enrich-all', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to trigger');
        alert(data.message || 'Enrichment triggered!');
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        enrichAllBtn.disabled = false;
        enrichAllBtn.textContent = '⚡ ENRICH ALL';
        await loadContacts();
      }
    });
  }

  await loadContacts();
  setInterval(loadContacts, 30_000);

})();
