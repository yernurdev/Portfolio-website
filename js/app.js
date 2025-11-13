// app.js (module) — all logic lives here

const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from((ctx || document).querySelectorAll(sel));

// wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  initYear();
  initTheme();
  bindThemeButtons();
  bindRegisterValidation();
  bindContactValidation();
  initGalleryIfPresent();
  initProjectsCRUD();
  enableProjectSearchSort();
  bindLightboxEvents();
  enableSmoothAnchorScroll();
});

/* ===== year ===== */
function initYear(){
  $$('#year').forEach(n => n.textContent = new Date().getFullYear());
}

/* ===== THEME ===== */
const THEME_KEY = 'ywy-theme';
function initTheme(){
  try {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    if (saved === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  } catch(e){}
}
function bindThemeButtons(){
  $$('#themeToggle').forEach(btn => btn.addEventListener('click', toggleTheme));
}
function toggleTheme(){
  const isLight = document.documentElement.classList.toggle('light');
  try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch(e){}
}

/* ===== Register form validation (modal) ===== */
function bindRegisterValidation(){
  const form = $('#registerForm');
  if(!form) return;
  const nameEl = $('#regName');
  const emailEl = $('#regEmail');
  const passEl = $('#regPass');
  const confirmEl = $('#regPassConfirm');
  const strengthSpan = $('#passwordStrength span');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function strength(value){
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    if (s <= 1) return 'weak';
    if (s === 2) return 'medium';
    return 'strong';
  }

  passEl.addEventListener('input', (e)=>{
    if(strengthSpan) strengthSpan.textContent = strength(e.target.value);
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    let ok = true;
    if(!nameEl.value.trim()){ setInvalid(nameEl,'Name required'); ok=false } else setValid(nameEl);
    if(!emailRegex.test(emailEl.value.trim())){ setInvalid(emailEl,'Invalid email'); ok=false } else setValid(emailEl);
    if(passEl.value.length < 8){ setInvalid(passEl,'Min 8 chars'); ok=false } else setValid(passEl);
    if(confirmEl.value !== passEl.value){ setInvalid(confirmEl,'Passwords must match'); ok=false } else setValid(confirmEl);
    if(!ok) return;
    // mock success
    const modalEl = form.closest('.modal');
    try{ bootstrap.Modal.getInstance(modalEl).hide(); }catch(e){}
    alert('Account created (demo)');
    form.reset();
    if (strengthSpan) strengthSpan.textContent = '';
  });

  function setInvalid(el,msg){
    el.classList.add('is-invalid');
    const fb = el.nextElementSibling;
    if(fb && fb.classList.contains('invalid-feedback')) fb.textContent = msg;
  }
  function setValid(el){
    el.classList.remove('is-invalid');
  }
}

/* ===== Contact form validation ===== */
function bindContactValidation(){
  const form = $('#contactForm');
  if(!form) return;
  const name = $('#contactName');
  const email = $('#contactEmail');
  const message = $('#contactMessage');
  const eRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    if(!name.value.trim()){ $('#contactNameFeedback').textContent = 'Required'; ok=false } else $('#contactNameFeedback').textContent = '';
    if(!eRegex.test(email.value.trim())){ $('#contactEmailFeedback').textContent = 'Invalid email'; ok=false } else $('#contactEmailFeedback').textContent = '';
    if(!message.value.trim()){ $('#contactMessageFeedback').textContent = 'Required'; ok=false } else $('#contactMessageFeedback').textContent = '';
    if(!ok) return;
    alert('Message sent (demo)');
    form.reset();
  });

  name.addEventListener('input', ()=> $('#contactNameFeedback').textContent = name.value.trim() ? '' : 'Required');
  email.addEventListener('input', ()=> $('#contactEmailFeedback').textContent = eRegex.test(email.value.trim()) ? '' : 'Invalid email');
  message.addEventListener('input', ()=> $('#contactMessageFeedback').textContent = message.value.trim() ? '' : 'Required');
}

/* ===== GALLERY (loads JSON) ===== */
let galleryItems = [];
async function initGalleryIfPresent(){
  const galleryRoot = $('#gallery');
  if(!galleryRoot) return;
  try {
    const res = await fetch('data/gallery.json');
    galleryItems = await res.json();
  } catch(e){ galleryItems = []; console.error(e); }
  renderGallery(galleryItems);
  // filters
  $$('.filter-btn').forEach(btn => btn.addEventListener('click', (ev)=>{
    $$('.filter-btn').forEach(b=>b.classList.remove('active'));
    ev.currentTarget.classList.add('active');
    applyGalleryFilter();
  }));
  $('#gallerySearch')?.addEventListener('input', applyGalleryFilter);
}

function renderGallery(list){
  const root = $('#gallery');
  root.innerHTML = '';
  list.forEach((it, idx) => {
    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.innerHTML = `
      <img src="${it.img}" alt="${it.title}" loading="lazy">
      <div class="meta">
        <h4>${it.title}</h4>
        <p>${it.desc}</p>
        <div class="d-grid">
          <a class="btn btn-outline-primary view-site" data-index="${idx}" href="${it.url}" target="_blank" rel="noopener">Open site</a>
          <button class="btn btn-primary mt-2 preview-btn" data-index="${idx}">Preview</button>
        </div>
      </div>
    `;
    root.appendChild(el);
  });

  // bind preview buttons
  $$('.preview-btn').forEach(b => b.addEventListener('click', e => {
    const idx = Number(e.currentTarget.dataset.index);
    openLightbox(idx);
  }));
}

function applyGalleryFilter(){
  const active = $('.filter-btn.active')?.dataset.cat || 'all';
  const q = ($('#gallerySearch')?.value || '').toLowerCase().trim();
  const filtered = galleryItems.filter(it => (active === 'all' || it.category === active) && (it.title.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)));
  renderGallery(filtered);
}

/* ===== LIGHTBOX ===== */
let currentIndex = 0;
function openLightbox(index){
  const visible = document.getElementById('lightbox');
  const item = galleryItems[index];
  if(!item) return;
  currentIndex = index;
  $('#lbImage').src = item.img;
  $('#lbCaption').textContent = `${item.title} — ${item.desc}`;
  visible.classList.remove('hidden');
  visible.setAttribute('aria-hidden','false');
}
function closeLightbox(){ const lb = $('#lightbox'); lb.classList.add('hidden'); lb.setAttribute('aria-hidden','true'); }
function prevLightbox(){ currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length; openLightbox(currentIndex); }
function nextLightbox(){ currentIndex = (currentIndex + 1) % galleryItems.length; openLightbox(currentIndex); }

function bindLightboxEvents(){
  document.addEventListener('click', e=>{
    if(e.target && e.target.id === 'lbClose') closeLightbox();
    if(e.target && e.target.id === 'lbPrev') prevLightbox();
    if(e.target && e.target.id === 'lbNext') nextLightbox();
    if(e.target && e.target.id === 'lightbox') closeLightbox();
  });
}

/* ===== PROJECTS CRUD (localStorage) ===== */
const PROJECTS_KEY = 'ywy-projects';
function loadProjects(){ return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); }
function saveProjects(list){ localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }

function initProjectsCRUD(){
  const tbody = $('#projectsTbody');
  if(!tbody) return;

  const addForm = $('#addProjectForm');
  const editForm = $('#editProjectForm');
  const addModalEl = document.getElementById('addProjectModal');
  const editModalEl = document.getElementById('editProjectModal');
  const addModal = new bootstrap.Modal(addModalEl);
  const editModal = new bootstrap.Modal(editModalEl);

  function render(){
    const list = loadProjects();
    tbody.innerHTML = '';
    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(String(p.year))}</td><td><a href="${escapeHtml(p.repo)}" target="_blank">repo</a></td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete" data-id="${p.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // add
  addForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(addForm);
    const title = fd.get('title')?.trim();
    const category = fd.get('category')?.trim();
    const year = Number(fd.get('year'));
    const repo = fd.get('repo')?.trim();
    if(!title || !category || !year || !repo) return alert('Fill all fields');
    const newP = { id: String(Date.now()), title, category, year, repo };
    const list = loadProjects();
    list.unshift(newP);
    saveProjects(list);
    addModal.hide();
    addForm.reset();
    render();
  });

  // edit open
  tbody.addEventListener('click', e=>{
    if(e.target.classList.contains('edit')){
      const id = e.target.dataset.id;
      const list = loadProjects();
      const p = list.find(x=>x.id === id);
      if(!p) return;
      editForm.elements['id'].value = p.id;
      editForm.elements['title'].value = p.title;
      editForm.elements['category'].value = p.category;
      editForm.elements['year'].value = p.year;
      editForm.elements['repo'].value = p.repo;
      editModal.show();
    }
    if(e.target.classList.contains('delete')){
      const id = e.target.dataset.id;
      if(!confirm('Delete project?')) return;
      let list = loadProjects();
      list = list.filter(x=>x.id !== id);
      saveProjects(list);
      // animation: fadeOut effect simulation
      render();
    }
  });

  // save edit
  editForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(editForm);
    const id = fd.get('id');
    const title = fd.get('title')?.trim();
    const category = fd.get('category')?.trim();
    const year = Number(fd.get('year'));
    const repo = fd.get('repo')?.trim();
    if(!id || !title || !category || !year || !repo) return alert('Fill all fields');
    let list = loadProjects();
    list = list.map(p => p.id === id ? { ...p, title, category, year, repo } : p);
    saveProjects(list);
    editModal.hide();
    render();
  });

  // initial sample data if empty
  if(loadProjects().length === 0){
    saveProjects([
      { id: 'p1', title: 'goWell', category: 'AI', year: 2025, repo: 'https://github.com/yernurdev/goWell' },
      { id: 'p2', title: 'e11even', category: 'Web', year: 2025, repo: 'https://github.com/yernurdev/web1_ass8' },
      { id: 'p3', title: 'janarymai', category: 'AI', year: 2025, repo: 'https://github.com/yernurdev/janarymai' }
    ]);
  }

  render();
}

/* search & sort for projects page */
function enableProjectSearchSort(){
  const search = $('#projectSearch');
  const sortTitle = $('#sortTitle');
  const sortYear = $('#sortYear');
  if(!search && !sortTitle && !sortYear) return;

  search?.addEventListener('input', ()=> {
    const q = (search.value||'').toLowerCase();
    $$('#projectsTbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  sortTitle?.addEventListener('click', ()=>{
    const list = loadProjects().sort((a,b)=> a.title.localeCompare(b.title));
    saveProjects(list);
    // re-render by calling initProjectsCRUD render: simplest is to reload page state
    // but we call render by re-initializing table (function exists in app) - easiest: trigger DOM update
    document.querySelector('#projectsTbody').innerHTML = '';
    list.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(String(p.year))}</td><td><a href="${escapeHtml(p.repo)}" target="_blank">repo</a></td>
        <td><button class="btn btn-sm btn-outline-primary edit" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete" data-id="${p.id}">Delete</button></td>`;
      document.querySelector('#projectsTbody').appendChild(tr);
    });
  });

  sortYear?.addEventListener('click', ()=>{
    const list = loadProjects().sort((a,b)=> b.year - a.year);
    saveProjects(list);
    document.querySelector('#projectsTbody').innerHTML = '';
    list.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(String(p.year))}</td><td><a href="${escapeHtml(p.repo)}" target="_blank">repo</a></td>
        <td><button class="btn btn-sm btn-outline-primary edit" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete" data-id="${p.id}">Delete</button></td>`;
      document.querySelector('#projectsTbody').appendChild(tr);
    });
  });
}

/* smooth anchor scrolling for internal links */
function enableSmoothAnchorScroll(){
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const href = a.getAttribute('href');
      if(!href || href === '#') return;
      const el = document.querySelector(href);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
    });
  });
}

/* helpers */
function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
