(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
 
const records = [];

const SUPABASE_URL = 'https://nyybtxqwitqiqflpkofm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Yp8367m7KnLGsAdgVLiIHw_4-tn6ULO';

async function loadSetlists() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/live_setlists?select=*&order=live_date.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase: ${response.status}`);
  }

  const data = await response.json();

  records.splice(0, records.length, ...data.map(r => ({
    id: String(r.id),
    date: r.live_date,
    title: 'フリーライブ',
    venue: r.venue || '',
    area: '',
    songs: (r.songs || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean),
    notes: '',
    source: ''
  })));
}

  const state = { q: '', year: '', area: '', sort: 'new', tab: 'events' };
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') || '';

  function safeLink(rawUrl) {
    try { const u = new URL(String(rawUrl || '')); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  }
  function norm(s) { return String(s).normalize('NFKC').toLocaleLowerCase('ja-JP').replace(/[\s\u3000]/g, ''); }
  function el(tag, className, textValue) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (textValue !== undefined) n.textContent = textValue;
    return n;
  }
  function add(parent, ...children) { parent.append(...children); return parent; }
  function dateLabel(date) { return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`; }
  function readableDate(date) { return date.replaceAll('-', '/'); }
  function updateQueryInUrl() {
    const url = new URL(location.href);
    if (state.q) url.searchParams.set('q', state.q); else url.searchParams.delete('q');
    url.searchParams.delete('event');
    try { history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`); }
    catch { /* ローカルファイルで開く場合、URL書き換えは使えないことがあります */ }
  }
  function searchText(record) {
    return [record.date, readableDate(record.date), dateLabel(record.date), record.title,
      record.venue, record.area, ...record.songs].join(' ');
  }
  function filteredEvents() {
    return records.filter((r) => (!state.year || r.date.startsWith(state.year)) &&
      (!state.area || r.area === state.area) && (!state.q || norm(searchText(r)).includes(norm(state.q))))
      .sort((a, b) => state.sort === 'new' ? b.date.localeCompare(a.date) || b.id.localeCompare(a.id) : a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  function counts() {
    const uniqueSongs = new Set(); let plays = 0;
    records.forEach((r) => r.songs.forEach((name) => { uniqueSongs.add(norm(name)); plays += 1; }));
    $('metric-events').textContent = records.length.toLocaleString('ja-JP');
    $('metric-songs').textContent = uniqueSongs.size.toLocaleString('ja-JP');
    $('metric-plays').textContent = plays.toLocaleString('ja-JP');
  }
  function initializeSelects() {
    const years = [...new Set(records.map((r) => r.date.slice(0, 4)))].sort().reverse();
    const areas = [...new Set(records.map((r) => r.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
    years.forEach((y) => { const opt = new Option(`${y}年`, y); $('year-filter').add(opt); });
    areas.forEach((a) => { const opt = new Option(a, a); $('area-filter').add(opt); });
  }
  function emptyState(title, explanation) {
    const box = el('div', 'empty-state');
    add(box, el('span', 'empty-icon', '♫'), el('h4', '', title), el('p', '', explanation));
    return box;
  }
  function showSong(song) {
    state.q = song;
    $('search-input').value = song;
    $('clear-search').hidden = false;
    switchTab('events');
    updateQueryInUrl();
    render();
    $('search-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function songButton(song) {
    const btn = el('button', '', song); btn.type = 'button';
    btn.addEventListener('click', () => showSong(song));
    return btn;
  }
  function makeEventCard(r) {
    const card = el('details', 'event-card');
    card.id = `live-${r.id}`;
    const summary = el('summary');
    const date = el('div', 'event-date');
    add(date, el('span', 'year', r.date.slice(0, 4)), el('span', 'monthday', dateLabel(r.date)));
    const main = el('div', 'event-main');
    const where = [r.area, r.venue].filter(Boolean).join(' / ') || '会場未登録';
    add(main, el('span', 'event-category', 'FREE LIVE'), el('h4', 'event-title', r.title), el('p', 'event-subtitle', where));
    const meta = el('div', 'event-meta');
    add(meta, el('span', 'song-badge', `${r.songs.length}曲`), el('span', 'event-chevron', '⌄'));
    add(summary, date, main, meta);
    const body = el('div', 'event-detail');
    add(body, el('h5', 'detail-heading', 'SETLIST / 曲順'));
    if (r.songs.length) {
      const list = el('ol', 'tracks');
      r.songs.forEach((song, index) => {
        const item = el('li'); add(item, el('span', 'track-number', String(index + 1).padStart(2, '0')), songButton(song));
        list.append(item);
      });
      body.append(list);
    } else { body.append(el('p', 'event-notes', 'セットリストはまだ登録されていません。')); }
    if (r.notes) body.append(el('p', 'event-notes', r.notes));
    const actions = el('div', 'detail-actions');
    const share = el('button', 'link-button', 'このライブのURLをコピー'); share.type = 'button';
    share.addEventListener('click', async () => {
      const url = new URL(location.href); url.searchParams.delete('q'); url.searchParams.set('event', r.id); url.hash = '';
      const text = url.href;
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        else {
          const copy = el('textarea'); copy.value = text; copy.style.position = 'fixed'; copy.style.opacity = '0';
          document.body.append(copy); copy.select();
          if (!document.execCommand('copy')) throw new Error('copy not supported');
          copy.remove();
        }
        share.textContent = 'コピーしました ✓';
      } catch { share.textContent = 'URLをコピーできませんでした'; }
    });
    actions.append(share);
    if (r.source) {
      const source = el('a', 'source-link', '参考リンクを見る ↗');
      source.href = r.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; actions.append(source);
    }
    body.append(actions);
    add(card, summary, body);
    return card;
  }
  function renderEvents() {
    const filtered = filteredEvents();
    $('event-count').textContent = `${filtered.length}件`;
    const list = $('event-list'); list.replaceChildren();
    if (filtered.length === 0) {
      list.append(records.length === 0 ? emptyState('最初のセットリストを登録しましょう', '登録されたフリーライブの記録は、ここに新しい日付順で表示されます。')
        : emptyState('見つかりませんでした', '曲名・日付・会場名を変えるか、フィルターを解除して検索してください。'));
      return;
    }
    filtered.forEach((r) => list.append(makeEventCard(r)));
    const linked = params.get('event');
    if (linked) {
      const target = document.getElementById(`live-${linked}`);
      if (target) {
        target.open = true;
        requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        params.delete('event');
      }
    }
  }
  function renderSongs() {
    const scoped = records.filter((r) => (!state.year || r.date.startsWith(state.year)) && (!state.area || r.area === state.area));
    const songMap = new Map();
    scoped.forEach((r) => r.songs.forEach((s) => {
      const key = norm(s); const current = songMap.get(key);
      if (current) current.count++; else songMap.set(key, { title: s, count: 1 });
    }));
    const songs = [...songMap.values()].filter((s) => !state.q || norm(s.title).includes(norm(state.q)))
      .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    $('song-count').textContent = `${songs.length}曲`;
    const list = $('song-list'); list.replaceChildren();
    if (!songs.length) {
      list.append(records.length === 0 ? emptyState('楽曲はまだ登録されていません', 'セットリストの登録後、曲のインデックスが自動で作成されます。')
        : emptyState('曲が見つかりませんでした', '別のキーワードで検索してください。'));
      return;
    }
    songs.forEach((s) => {
      const b = el('button', 'song-item'); b.type = 'button';
      add(b, el('span', 'song-name', s.title), el('span', 'song-hits', `${s.count}回`), el('span', 'song-arrow', '↗'));
      b.addEventListener('click', () => showSong(s.title)); list.append(b);
    });
  }
  function render() { renderEvents(); renderSongs(); }
  function switchTab(tab) {
    state.tab = tab;
    for (const t of ['events','songs']) {
      const active = tab === t;
      $(`tab-${t}`).classList.toggle('active', active);
      $(`tab-${t}`).setAttribute('aria-selected', String(active));
      $(`${t}-panel`).hidden = !active;
    }
  }
  $('search-input').value = state.q;
  $('clear-search').hidden = !state.q;
  $('search-input').addEventListener('input', (e) => {
    state.q = e.target.value; $('clear-search').hidden = !state.q; updateQueryInUrl(); render();
  });
  $('clear-search').addEventListener('click', () => {
    state.q = ''; $('search-input').value = ''; $('clear-search').hidden = true;
    updateQueryInUrl(); render(); $('search-input').focus();
  });
  $('year-filter').addEventListener('change', (e) => { state.year = e.target.value; render(); });
  $('area-filter').addEventListener('change', (e) => { state.area = e.target.value; render(); });
  $('sort-filter').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('tab-events').addEventListener('click', () => switchTab('events'));
  $('tab-songs').addEventListener('click', () => switchTab('songs'));
  
loadSetlists()
  .then(() => {
    initializeSelects();
    counts();
    render();
  })
  .catch((error) => {
    console.error('セットリスト取得失敗:', error);
    alert('セットリスト取得失敗: ' + error.message);
    initializeSelects();
    counts();
    render();
  });
})();
