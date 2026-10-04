/* ================================
 *  Organizer Center – ptda.js (FULL)
 * ================================ */

/* ---------- Config ---------- */
const RESET_UNSAVED_ON_LOAD = true;

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);

function showToast(msg) {
  const card = $('#toastCard');
  const box = $('#toast');
  if (!card || !box) return alert(msg);
  card.textContent = msg;
  box.style.display = 'block';

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    box.style.display = 'none';
  }, 2500);
}

function closeToast() {
  const box = $('#toast');
  if (box) box.style.display = 'none';
}

function formatDateTimeLocal(str) {
  if (!str) return '';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- Step Navigation ---------- */
let currentStep = 1;

function setStep(n) {
  currentStep = n;
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step' + i);
    if (!el) continue;
    if (i === n) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
  ['stepHead1', 'stepHead2', 'stepHead3', 'stepHead4'].forEach((id, i) => {
    const h = $('#' + id);
    if (!h) return;
    if (i + 1 === n) h.classList.add('active');
    else h.classList.remove('active');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Upload preview (fixed double upload) ---------- */
const imgState = { event: null, cover: null, ticket: null };

function bindUpload(zoneSel, inputSel, previewSel, emptySel, stateKey) {
  const zone = $(zoneSel);
  const input = $(inputSel);
  const preview = $(previewSel);
  const empty = $(emptySel);
  if (!zone || !input || !preview) return;

  zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  input.addEventListener('click', (e) => e.stopPropagation());

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  });
  input.addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) return showToast('File không phải ảnh');
    const reader = new FileReader();
    reader.onload = () => {
      imgState[stateKey] = reader.result;
      preview.src = reader.result;
      preview.classList.remove('hidden');
      if (empty) empty.classList.add('hidden');
      input.value = '';           // cho phép chọn lại cùng 1 file lần sau
      persistDraft();
    };
    reader.readAsDataURL(file);
  }
}

/* ---------- Địa giới Việt Nam ---------- */
let VN = null;

async function loadVN() {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/?depth=3', { cache: 'force-cache' });
    VN = await res.json();
  } catch (e) {
    // Fallback ngắn nếu offline
    VN = [
      { code: 1, name: 'Thành phố Hà Nội',
        districts: [
          { code: 101, name: 'Quận Ba Đình', wards: [{code:10101,name:'Phúc Xá'},{code:10102,name:'Trúc Bạch'}] },
          { code: 102, name: 'Quận Hoàn Kiếm', wards: [{code:10201,name:'Hàng Bạc'},{code:10202,name:'Hàng Đào'}] },
        ]},
      { code: 79, name: 'Thành phố Hồ Chí Minh',
        districts: [
          { code: 760, name: 'Quận 1', wards: [{code:76001,name:'Bến Nghé'},{code:76002,name:'Bến Thành'}] },
          { code: 769, name: 'Thành phố Thủ Đức', wards: [{code:76901,name:'Linh Trung'},{code:76902,name:'Linh Tây'}] },
        ]},
    ];
  }
  populateProvinces();
}

function populateProvinces() {
  const p = $('#province'), d = $('#district'), w = $('#ward');
  if (!p || !d || !w) return;
  p.innerHTML = '<option value="">Tỉnh/Thành</option>';
  VN.forEach((prov) => {
    const o = document.createElement('option');
    o.value = prov.code;
    o.textContent = prov.name;
    p.appendChild(o);
  });
  d.innerHTML = '<option value="">Quận/Huyện</option>';
  w.innerHTML = '<option value="">Phường/Xã</option>';
}

function onProvinceChange() {
  const code = Number($('#province')?.value || 0);
  const d = $('#district'), w = $('#ward');
  if (!d || !w) return;

  d.innerHTML = '<option value="">Quận/Huyện</option>';
  w.innerHTML = '<option value="">Phường/Xã</option>';

  const prov = VN?.find((x) => x.code === code);
  if (!prov) return;
  prov.districts.forEach((dist) => {
    const o = document.createElement('option');
    o.value = dist.code;
    o.textContent = dist.name;
    d.appendChild(o);
  });
  persistDraft();
}

function onDistrictChange() {
  const pcode = Number($('#province')?.value || 0);
  const dcode = Number($('#district')?.value || 0);
  const prov = VN?.find((x) => x.code === pcode);
  if (!prov) return;
  const dist = prov.districts.find((x) => x.code === dcode);
  const w = $('#ward'); w.innerHTML = '<option value="">Phường/Xã</option>';
  if (!dist) return;
  dist.wards.forEach((ward) => {
    const o = document.createElement('option');
    o.value = ward.code;
    o.textContent = ward.name;
    w.appendChild(o);
  });
  persistDraft();
}

/* ---------- Local Repo ---------- */
class LocalRepo {
  constructor(){ this.key = 'event_draft'; }
  async saveDraft(ev){
    ev.updatedAt = Date.now();
    sessionStorage.setItem('event_id', ev.id);
    sessionStorage.setItem('event_createdAt', ev.createdAt);
    sessionStorage.setItem(this.key, JSON.stringify(ev));
    return ev;
  }
  async loadDraft(){
    const raw = sessionStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }
}
const repo = new LocalRepo();

/* ---------- Counter & helpers ---------- */
function bindCounter(inputSel, counterSel) {
  const el = $(inputSel), c = $(counterSel);
  if (!el || !c) return;
  const update = () => { c.textContent = (el.value || '').length; };
  el.addEventListener('input', () => { update(); persistDraft(); });
  update();
}

function updateSlugPreview(){
  const s = $('#slug')?.value || '';
  $('#slugPreviewText').textContent = s || 'your-event-slug';
  persistDraft();
}

function updateConfirmCounter(){
  const el = $('#confirmMsg');
  const c = $('#confirmCount');
  if (!el || !c) return;
  c.textContent = (el.value || '').length;
  persistDraft();
}

/* ---------- Ticket Modal ---------- */
function openTicketModal(){
  $('#ticketModal')?.classList.remove('hidden');
}
function closeTicketModal(){
  $('#ticketModal')?.classList.add('hidden');
}

/* ---------- Collect & Apply form ---------- */
function collectEventFromForm(){
  return {
    id: sessionStorage.getItem('event_id') || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    // step 1
    name: $('#eventName')?.value?.trim() || '',
    mode: document.querySelector('input[name="eventMode"]:checked')?.value || 'offline',
    venueName: $('#venueName')?.value?.trim() || '',
    addressLine: $('#addressLine')?.value?.trim() || '',
    province: $('#province')?.value || '',
    district: $('#district')?.value || '',
    ward: $('#ward')?.value || '',
    category: $('#category')?.value || '',
    details: $('#eventDetails')?.value || '',
    images: { event: imgState.event, cover: imgState.cover },
    // step 2
    startAt: $('#startAt')?.value || '',
    endAt: $('#endAt')?.value || '',
    ticketTypes: Array.isArray(window.ticketTypes) ? window.ticketTypes : [],
    // step 3
    slug: $('#slug')?.value?.trim() || '',
    privacy: document.querySelector('input[name="privacy"]:checked')?.value || 'public',
    confirmMessage: $('#confirmMsg')?.value || '',
    // step 4
    payment: {
      accName: $('#payAccName')?.value || '',
      accNumber: $('#payAccNumber')?.value || '',
      bankName: $('#payBankName')?.value || '',
      branch: $('#payBranch')?.value || '',
    },
    invoice: {
      type: $('#invType')?.value || 'individual',
      fullName: $('#invFullName')?.value || '',
      address: $('#invAddress')?.value || '',
      taxCode: $('#invTaxCode')?.value || '',
    },
    // meta
    createdAt: Number(sessionStorage.getItem('event_createdAt')) || Date.now(),
    updatedAt: Date.now(),
  };
}

function applyEventToForm(ev){
  const set = (sel,v)=>{ const el = $(sel); if (el) el.value = v || ''; };

  // step 1
  set('#eventName', ev.name);
  if (ev.mode === 'online') $('#modeOnline').checked = true; else $('#modeOffline').checked = true;
  set('#venueName', ev.venueName);
  set('#addressLine', ev.addressLine);
  set('#category', ev.category);
  set('#eventDetails', ev.details);

  if (ev.images?.event){
    imgState.event = ev.images.event;
    const p = $('#previewEvent');
    if (p){ p.src = ev.images.event; p.classList.remove('hidden'); }
    $('#zoneEventEmpty')?.classList.add('hidden');
  }
  if (ev.images?.cover){
    imgState.cover = ev.images.cover;
    const p2 = $('#previewCover');
    if (p2){ p2.src = ev.images.cover; p2.classList.remove('hidden'); }
    $('#zoneCoverEmpty')?.classList.add('hidden');
  }

  if (VN){
    set('#province', ev.province); onProvinceChange();
    set('#district', ev.district); onDistrictChange();
    set('#ward', ev.ward);
  }

  // step 2
  set('#startAt', ev.startAt); set('#endAt', ev.endAt);
  window.ticketTypes = ev.ticketTypes || []; renderTicketList();

  // step 3
  set('#slug', ev.slug); updateSlugPreview();
  if (ev.privacy === 'group'){
    const r = document.querySelector('input[name="privacy"][value="group"]');
    if (r) r.checked = true;
  }
  set('#confirmMsg', ev.confirmMessage); updateConfirmCounter();

  // step 4
  const p = ev.payment || {}, i = ev.invoice || {};
  set('#payAccName', p.accName);
  set('#payAccNumber', p.accNumber);
  set('#payBankName', p.bankName);
  set('#payBranch', p.branch);
  set('#invType', i.type);
  set('#invFullName', i.fullName);
  set('#invAddress', i.address);
  set('#invTaxCode', i.taxCode);
}

/* ---------- Ticket Rendering ---------- */
function renderTicketList(){
  const wrap = $('#ticketList');
  if (!wrap) return;
  wrap.innerHTML = '';

  const list = Array.isArray(window.ticketTypes) ? window.ticketTypes : [];
  if (!list.length){
    wrap.innerHTML = '<p class="text-gray-400 text-sm">Chưa có loại vé nào, hãy thêm ít nhất 1 loại vé.</p>';
    return;
  }

  list.forEach((t, idx) => {
    const div = document.createElement('div');
    div.className = 'flex items-start justify-between bg-[#101827] border border-[#1f2937] rounded-xl p-3 mb-2';
    const priceText = t.free ? 'Miễn phí' : (Number(t.price || 0).toLocaleString('vi-VN') + ' đ');
    div.innerHTML = `
      <div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-sm">${t.name || 'Loại vé không tên'}</span>
          <span class="text-xs px-2 py-[2px] rounded-full bg-green-900/40 text-green-300">Còn ${t.total || 0} vé</span>
        </div>
        <div class="text-xs text-gray-300 mt-1">${priceText}</div>
        <div class="text-[11px] text-gray-400 mt-1">
          Bán từ: ${t.saleStart ? t.saleStart.replace('T',' ') : '---'}
          đến ${t.saleEnd ? t.saleEnd.replace('T',' ') : '---'}
        </div>
        <div class="text-[11px] text-gray-400 mt-1">Mô tả: ${t.desc || '---'}</div>
      </div>
      <button data-idx="${idx}" class="btn-outline-danger text-xs">Xóa</button>
    `;
    wrap.appendChild(div);
  });

  // Bind delete
  wrap.querySelectorAll('button[data-idx]').forEach((btn) => {
    btn.addEventListener('click', ()=>{
      const i = Number(btn.dataset.idx);
      if (Number.isNaN(i)) return;
      window.ticketTypes.splice(i,1);
      renderTicketList(); persistDraft(); showToast('Đã xóa loại vé');
    });
  });
}

/* ---------- Validation ---------- */
function validateStep1(ev){
  const errs=[]; 
  if (!ev.name) errs.push('Vui lòng nhập Tên sự kiện');
  if (!ev.category) errs.push('Vui lòng chọn Thể loại');
  if (!ev.details || ev.details.trim().length < 20) errs.push('Vui lòng mô tả Thông tin sự kiện ≥ 20 ký tự');
  if (ev.mode === 'offline'){
    if (!ev.venueName) errs.push('Vui lòng nhập Tên địa điểm');
    if (!ev.addressLine) errs.push('Vui lòng nhập Địa chỉ');
    if (!ev.province) errs.push('Vui lòng chọn Tỉnh/Thành');
    if (!ev.district) errs.push('Vui lòng chọn Quận/Huyện');
    if (!ev.ward) errs.push('Vui lòng chọn Phường/Xã');
  }
  return errs;
}

function validateStep2(ev){
  if (!ev.startAt || !ev.endAt) return 'Vui lòng chọn thời gian bắt đầu/kết thúc';
  if (new Date(ev.endAt) <= new Date(ev.startAt)) return 'Thời gian kết thúc phải sau thời gian bắt đầu';
  if (!ev.ticketTypes || !ev.ticketTypes.length) return 'Vui lòng thêm ít nhất 1 loại vé';
  return '';
}

function validateStep4(ev){
  if (ev.payment.accNumber && (!ev.payment.accName || !ev.payment.bankName)) 
    return 'Vui lòng nhập đầy đủ Chủ tài khoản và Tên ngân hàng';
  if (ev.invoice.type === 'company' && !ev.invoice.taxCode) 
    return 'Vui lòng nhập Mã số thuế (khi chọn Công ty)';
  return '';
}

/* ---------- Ticket Modal Binding ---------- */
function bindTicketModal(){
  $('#ticketClose')?.addEventListener('click', closeTicketModal);
  $('#ticketCancel')?.addEventListener('click', closeTicketModal);

  const name = $('#ticketName');
  const price = $('#ticketPrice');
  const free = $('#ticketFree');
  const desc = $('#ticketDesc');

  if (!name) return; // modal chưa render

  name.addEventListener('input', ()=>($('#ticketNameCount').textContent = name.value.length));
  desc.addEventListener('input', ()=>($('#ticketDescCount').textContent = desc.value.length));
  free.addEventListener('change', ()=>{
    if (free.checked){
      price.value = 0;
      price.disabled = true;
    } else {
      price.disabled = false;
    }
  });
  bindUpload('#ticketImgZone', '#ticketImgFile', '#ticketImgPreview', '#ticketImgEmpty', 'ticket');

  $('#ticketSave')?.addEventListener('click', ()=>{
    const t = {
      name: name.value.trim(),
      price: Number(price.value || 0),
      free: free.checked,
      total: Number($('#ticketTotal')?.value || 0),
      min: Number($('#ticketMin')?.value || 1),
      max: Number($('#ticketMax')?.value || 1),
      saleStart: $('#ticketSaleStart')?.value || '',
      saleEnd: $('#ticketSaleEnd')?.value || '',
      desc: desc.value,
      image: imgState.ticket || null,
    };
    if (!t.name) return showToast('Vui lòng nhập Tên vé');
    // if (!t.saleStart || !t.saleEnd) return showToast('Chọn thời gian bán vé');

    window.ticketTypes = window.ticketTypes || [];
    window.ticketTypes.push(t);
    renderTicketList(); persistDraft(); closeTicketModal(); showToast('Đã thêm loại vé');

    // reset modal
    name.value=''; price.value='0'; free.checked=false;
    $('#ticketTotal').value='10'; $('#ticketMin').value='1'; $('#ticketMax').value='10';
    $('#ticketSaleStart').value=''; $('#ticketSaleEnd').value=''; desc.value='';
    $('#ticketNameCount').textContent='0'; $('#ticketDescCount').textContent='0';
    imgState.ticket = null;
    const prev = $('#ticketImgPreview'); if (prev){ prev.src=''; prev.classList.add('hidden'); }
    $('#ticketImgEmpty')?.classList.remove('hidden');
  });
}

/* ---------- PERSIST DRAFT ---------- */
async function persistDraft(){
  try { const ev = collectEventFromForm(); await repo.saveDraft(ev); }
  catch(e){ console.error('persistDraft error', e); }
}

/* ---------- Build payload cho Database ---------- */

// Ghép địa chỉ từ thông tin form + địa giới VN
function buildAddressFromEvent(ev){
  if (ev.mode === 'online') {
    return ev.venueName || 'Sự kiện online';
  }
  const parts = [];
  if (ev.venueName) parts.push(ev.venueName);
  if (ev.addressLine) parts.push(ev.addressLine);

  // Tìm tên Tỉnh/Quận/Phường từ mã code
  try {
    const pCode = Number(ev.province || 0);
    const dCode = Number(ev.district || 0);
    const wCode = Number(ev.ward || 0);

    const prov = Array.isArray(VN) ? VN.find(p => p.code === pCode) : null;
    const dist = prov && Array.isArray(prov.districts)
      ? prov.districts.find(d => d.code === dCode)
      : null;
    const ward = dist && Array.isArray(dist.wards)
      ? dist.wards.find(w => w.code === wCode)
      : null;

    if (ward && ward.name) parts.push(ward.name);
    if (dist && dist.name) parts.push(dist.name);
    if (prov && prov.name) parts.push(prov.name);
  } catch (e) {
    console.warn('buildAddressFromEvent VN lookup error', e);
  }

  return parts.join(', ');
}

// Map category (text) -> MaLoai trong bảng LoaiChuongTrinh (database.sql)
function mapCategoryToLoaiChuongTrinhId(categoryText){
  switch ((categoryText || '').trim()) {
    case 'Nhạc sống':   // map tạm sang 'Nhạc sống'
      return 1;
    case 'Sân khấu':  // map tạm sang 'Workshop'
      return 3;
    case 'Thể thao':
      return 4;
    
    default:
      return null;
  }
}


// Hàm tiện ích: Lấy User ID đã lưu (Giả định: đã lưu { id: 1, role: '...' } vào localStorage)
function getCurrentUserId() {
  const USER_STORAGE_KEY = 'currentUser'; // <--- ĐỌC TỪ KEY 'currentUser'
  try {
    const userInfoString = sessionStorage.getItem(USER_STORAGE_KEY); 
    
    if (!userInfoString) {
      console.warn("Lỗi Debug: Không tìm thấy thông tin người dùng trong sessionStorage.");
      return null;
    }
    
    const userInfo = JSON.parse(userInfoString);
    
    // API login trả về trường 'id' (chính là MaNMV) và 'role: User'
    const userId = userInfo.id; 

    // CHỈ CHO PHÉP USER THƯỜNG (role: 'User') TẠO CHƯƠNG TRÌNH
    if (!userId || userInfo.role !== 'User') {
      console.warn("Lỗi Debug: ID không hợp lệ hoặc không phải vai trò 'User'.");
      return null;
    }

    console.log("DEBUG: Lấy được User ID từ sessionStorage:", userId); 
    
    // Trả về ID (MaNMV) dưới dạng số nguyên (để đảm bảo tính tương thích DB)
    return Number(userId); 
  } catch (e) {
    console.error("Lỗi khi đọc user info từ sessionStorage:", e);
    return null;
  }
}
// Chuẩn hóa dữ liệu để gửi về API tạo Chương trình
function buildDbPayload(ev){
  // Chuyển datetime-local => MySQL DATETIME (YYYY-MM-DD HH:mm:SS)
  const start = ev.startAt
    ? (ev.startAt.replace('T', ' ') + (ev.startAt.length === 16 ? ':00' : ''))
    : null;

  const loaiId = mapCategoryToLoaiChuongTrinhId(ev.category);

  // Map các loại vé từ UI -> LoaiChoNgoi
  const tickets = (ev.ticketTypes || []).map(t => ({
    TenLoaiCho: t.name,
    GiaVe: t.free ? 0 : Number(t.price || 0),
    SoLuongCho: Number(t.total || 0),
    MoTa: t.desc || '',
    MauSac: null // hiện tại giao diện chưa cho chọn màu
  })).filter(t => t.TenLoaiCho && t.SoLuongCho > 0);

  // Lấy ID người tạo chương trình
  const creatorId = getCurrentUserId(); // <--- DÒNG MỚI: LẤY USER ID

  return {
    TenChuongTrinh: ev.name,
    Slug: ev.slug,
    MoTa: ev.details,
    NgayGioBatDau: start,
    DiaDiem: buildAddressFromEvent(ev),
    
    images: ev.images,
    DanhSachNgheSi: null,
    TrangThai: 'ChoDuyet',
    IsNoiBat: 0,
    DonViToChucMaDonVi: 1, // Tạm fix cứng ID đơn vị
    LoaiChuongTrinhMaLoai: loaiId,
    NguoiKiemDuyetID: null,
    NguoiTaoChuongTrinhID: creatorId, // <--- DÒNG MỚI: THÊM USER ID
    tickets
  };
}

// Gọi API backend để lưu chương trình vào database.
// LƯU Ý: cần có route POST /api/admin/events ở server.js (chỉ thao tác dữ liệu, KHÔNG sửa database).
async function submitEventToServer(ev){
  const payload = buildDbPayload(ev);

  const res = await fetch('http://localhost:3000/api/admin/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    console.error('submitEventToServer parse JSON error', e);
  }

  if (!res.ok || !data.success) {
    const msg = (data && data.message) || ('Lỗi HTTP ' + res.status);
    throw new Error(msg);
  }

  return data;
}

/* ---------- Init ---------- */
async function init(){
  // Reset nháp nếu chưa bấm "Lưu nháp"
  if (RESET_UNSAVED_ON_LOAD && sessionStorage.getItem('event_saved') !== 'true') {
    sessionStorage.removeItem('event_draft');
    sessionStorage.removeItem('event_id');
    sessionStorage.removeItem('event_createdAt');
  }

  // Upload zones
  bindUpload('#zoneEvent', '#fileEvent', '#previewEvent', '#zoneEventEmpty', 'event');
  bindUpload('#zoneCover', '#fileCover', '#previewCover', '#zoneCoverEmpty', 'cover');

  // VN places – cho load nền, không chặn nút Tiếp tục
  loadVN()
    .then(async () => {
      // Sau khi đã có dữ liệu tỉnh/thành thì mới apply bản nháp
      const draft = await repo.loadDraft();
      if (draft){
        applyEventToForm(draft);
        showToast('Đã tải bản nháp');
      }
    })
    .catch(async (err) => {
      console.error('loadVN error', err);
      // Nếu fetch tỉnh/thành lỗi vẫn cố gắng load draft để không chặn người dùng
      const draft = await repo.loadDraft();
      if (draft){
        applyEventToForm(draft);
        showToast('Đã tải bản nháp (không tải được danh sách tỉnh/thành)');
      }
    });

  // Gắn sự kiện đổi tỉnh/huyện/xã ngay lập tức
  $('#province')?.addEventListener('change', onProvinceChange);
  $('#district')?.addEventListener('change', onDistrictChange);
  $('#ward')?.addEventListener('change', persistDraft);

  // Autosave
  document.addEventListener('input', ()=>{
    clearTimeout(window.__autosaveTimer);
    window.__autosaveTimer = setTimeout(persistDraft, 500);
  });

  // Footer buttons
  $('#btnSave')?.addEventListener('click', async ()=>{
    await persistDraft();
    sessionStorage.setItem('event_saved','true');
    showToast('Đã lưu bản nháp');
  });

  $('#btnNext')?.addEventListener('click', async ()=>{
    const ev = collectEventFromForm();

    if (currentStep === 1){
      const errs = validateStep1(ev); 
      if (errs.length) return showToast('Lỗi: ' + errs[0]);
      await persistDraft(); 
      setStep(2); 
      return;
    }

    if (currentStep === 2){
      const e2 = validateStep2(ev); 
      if (e2) return showToast('Lỗi: ' + e2);
      await persistDraft(); 
      setStep(3); 
      return;
    }

    if (currentStep === 3){
      await persistDraft(); 
      setStep(4); 
      return;
    }

    if (currentStep === 4){
      const e4 = validateStep4(ev);
      if (e4) return showToast('Lỗi: ' + e4);

      // Vẫn lưu nháp để tránh mất dữ liệu nếu lỗi mạng
      await persistDraft();

      try {
        const result = await submitEventToServer(ev);

        // Đánh dấu đã lưu & dọn nháp (không load lại form cũ khi F5)
        sessionStorage.setItem('event_saved','true');
        sessionStorage.removeItem('event_draft');
        sessionStorage.removeItem('event_id');
        sessionStorage.removeItem('event_createdAt');

        showToast('✅ Đã tạo chương trình');
        // Nếu muốn điều hướng về trang quản lý, có thể thêm:
        // window.location.href = '/admin-quan-ly-chuong-trinh.html';
        setTimeout(() => {
        window.location.href = '/sukiencuatoi/sukiencuatoi.html';
    }, 1500);
      } catch (err) {
        console.error('submitEventToServer error', err);
        showToast(err.message || 'Lỗi lưu chương trình, vui lòng thử lại.');
      }
      return;
    }
  });

  // Back buttons (bước 2,3,4)
  $('#btnBack2')?.addEventListener('click', ()=> setStep(1));
  $('#btnBack3')?.addEventListener('click', ()=> setStep(2));
  $('#btnBack4')?.addEventListener('click', ()=> setStep(3));

  // Tickets modal
  $('#btnOpenTicketModal')?.addEventListener('click', openTicketModal);
  bindTicketModal();

  // Step 3 bindings
  $('#slug')?.addEventListener('input', updateSlugPreview);
  document.querySelectorAll('input[name="privacy"]').forEach((r)=> r.addEventListener('change', persistDraft));
  $('#confirmMsg')?.addEventListener('input', updateConfirmCounter);

  // Step 4 counters
  bindCounter('#payAccName', '#payAccNameCount');
  bindCounter('#payBankName', '#payBankNameCount');
  bindCounter('#payBranch', '#payBranchCount');
  bindCounter('#invFullName', '#invFullNameCount');
  bindCounter('#invAddress', '#invAddressCount');
  ['#payAccNumber','#invTaxCode'].forEach((sel)=>{ const el = $(sel); if (el) el.addEventListener('input', persistDraft); });
  $('#invType')?.addEventListener('change', persistDraft);

  // Login mock
  $('#btnLogin')?.addEventListener('click', ()=> showToast('Đăng nhập (mock)'));
}

document.addEventListener('DOMContentLoaded', init);
