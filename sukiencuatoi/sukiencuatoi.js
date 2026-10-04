// sukiencuatoi.js

// 1. Hàm hiển thị thông báo (Toast)
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastCard = document.getElementById('toastCard');
    if (toast && toastCard) {
        toastCard.textContent = message;
        toastCard.className = `toast-card ${type}`;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    } else {
        alert(message);
    }
}

// 2. Hàm tạo HTML Badge trạng thái
function getStatusBadge(status, eventDate) {
    const now = new Date();
    const eventTime = new Date(eventDate);
    let displayStatus = status;

    // BƯỚC MỚI: Tự động chuyển trạng thái hiển thị nếu quá ngày
    if (status === 'DaDienRa') {
        displayStatus = 'DaQua'; // Nếu DB đã cập nhật DaDienRa
    } else if ((status === 'DangBan' || status === 'ChoDuyet') && eventTime < now) {
        displayStatus = 'DaQua'; // Nếu đã qua ngày thực tế
    }
    
    const styles = {
        'DangBan': 'bg-green-500/20 text-green-400 border-green-500/30',
        'ChoDuyet': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'HetVe': 'bg-red-500/20 text-red-400 border-red-500/30',
        'Huy': 'bg-red-500/20 text-red-400 border-red-500/30',
        'Nháp': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        'DaQua': 'bg-gray-500/20 text-gray-400 border-gray-500/30' // Màu xám cho Đã qua (Bao gồm DaDienRa)
    };
    const labels = { 
        'DangBan': 'Đang bán', 
        'ChoDuyet': 'Chờ duyệt', 
        'HetVe': 'Hết vé', 
        'Huy': 'Đã hủy',
        'Nháp': 'Nháp',
        'DaQua': 'Đã qua' // Nhãn chung cho cả DaDienRa và sự kiện quá ngày
    };
    
    // Nếu status là 'DaDienRa' từ DB, nó sẽ hiển thị là 'Đã qua'
    return `<span class="px-3 py-1 rounded-full text-xs font-medium border ${styles[displayStatus] || styles['ChoDuyet']}">${labels[displayStatus] || status}</span>`;
}

// 3. LOGIC MODAL CHI TIẾT
// Không cần tạo HTML bằng JS nữa vì nó đã có trong sukiencuatoi.html
function createModal() {
    // Không cần làm gì, Modal đã có sẵn trong HTML
    return;
}

function closeModal() {
    document.getElementById('detailModal')?.classList.remove('active');
}

function showEventDetails(event) {
    // Đảm bảo modal được hiển thị và đóng được
    createModal();
    const dateStr = new Date(event.NgayGioBatDau).toLocaleString('vi-VN');
    const rawImgSrc = event.Poster || '';
    const imgSrc = rawImgSrc ? '/' + rawImgSrc : 'https://via.placeholder.com/600x300?text=No+Image';

    const content = `
        <img src="${imgSrc}" class="modal-img">
        <p><span class="modal-label">Tên sự kiện:</span> <b class="text-white">${event.TenChuongTrinh}</b></p>
        <p><span class="modal-label">Mã đường dẫn:</span> ${event.Slug}</p>
        <p><span class="modal-label">Thời gian:</span> ${dateStr}</p>
        <p><span class="modal-label">Địa điểm:</span> ${event.DiaDiem}</p>
        <p><span class="modal-label">Trạng thái:</span> ${getStatusBadge(event.TrangThai)}</p>
        <hr class="border-gray-700 my-3"/>
        <p class="text-gray-300 whitespace-pre-line">${event.MoTa || 'Chưa có mô tả'}</p>
    `;

    document.getElementById('mBody').innerHTML = content;
    document.getElementById('detailModal').classList.add('active');
}

// 4. LOGIC XÓA SỰ KIỆN
function deleteEvent(id, btnElement) {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    
    fetch(`http://localhost:3000/api/organizer/events/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Đã xóa sự kiện thành công');
            const card = btnElement.closest('.event-card'); 
            if (card) {
                card.remove(); 
            } else {
                window.location.reload();
            }
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi kết nối server', 'error');
    });
}

// 5. RENDER DANH SÁCH
// sukiencuatoi.js (Hàm renderEvents)

// 5. RENDER DANH SÁCH
function renderEvents(events) {
    const emptyState = document.querySelector('.empty-state');
    const searchSec = document.querySelector('.search-section');
    let listContainer = document.getElementById('my-event-list');

    // 1. Tạo Container nếu chưa có
    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'my-event-list';
        listContainer.className = 'grid grid-cols-1 gap-4 max-w-5xl mx-auto pb-10 px-6'; // Thêm px-6 để có padding
        
        // Chèn vào ngay sau phần tìm kiếm
        if(searchSec) searchSec.parentNode.insertBefore(listContainer, searchSec.nextSibling);
    }
    
    listContainer.innerHTML = ''; 

    // 2. Xử lý trạng thái rỗng
    if (!events || events.length === 0) {
        if(emptyState) emptyState.style.display = 'flex';
        listContainer.style.display = 'none';
        return;
    }

    // 3. Hiển thị danh sách
    if(emptyState) emptyState.style.display = 'none';
    listContainer.style.display = 'grid';

    events.forEach(ev => {
        // ... (Logic tạo card giữ nguyên)
        const rawImgSrc = ev.Poster || '';
        const imgSrc = rawImgSrc ? '/' + rawImgSrc : 'https://via.placeholder.com/150x200?text=No+Image';
        const dateStr = new Date(ev.NgayGioBatDau).toLocaleString('vi-VN', { 
            weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' 
        });

        const card = document.createElement('div');
        card.className = 'event-card bg-[#1e2531] border border-[#2b3136] rounded-xl p-4 flex gap-4 hover:border-[#FF6A88] transition group';
        
        card.innerHTML = `
            <div class="w-32 h-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                <img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${ev.TenChuongTrinh}">
            </div>
            <div class="flex-1 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="text-white font-bold text-lg line-clamp-2 pr-4">${ev.TenChuongTrinh}</h3>
                        ${getStatusBadge(ev.TrangThai)}
                    </div>
                    <div class="text-gray-400 text-sm mt-2 flex items-center gap-2">
                        <i class="fa-regular fa-clock"></i> ${dateStr}
                    </div>
                    <div class="text-gray-400 text-sm mt-1 flex items-center gap-2">
                        <i class="fa-solid fa-location-dot"></i> ${ev.DiaDiem || 'Online'}
                    </div>
                </div>
                <div class="flex items-center gap-3 mt-4">
                    <button class="btn-detail px-4 py-2 rounded-lg bg-[#2b3136] text-white text-sm hover:bg-[#374151] transition">Xem chi tiết</button>
                    <button class="btn-edit px-4 py-2 rounded-lg border border-[#2b3136] text-gray-300 text-sm hover:text-[#FF6A88] hover:border-[#FF6A88] transition">Chỉnh sửa</button>
                    <button class="btn-delete" onclick="deleteEvent(${ev.MaChuongTrinh}, this)">Xóa</button>
                </div>
            </div>
        `;

        // Gắn sự kiện
        card.querySelector('.btn-detail').addEventListener('click', () => showEventDetails(ev));
        card.querySelector('.btn-edit').addEventListener('click', () => {
             window.location.href = `/taochuongtrinh/taochuongtrinh.html?id=${ev.MaChuongTrinh}`;
        });

        listContainer.appendChild(card);
    });
}

function getCurrentUserId() {
  const USER_STORAGE_KEY = 'currentUser'; 
  try {
    const userInfoString = sessionStorage.getItem(USER_STORAGE_KEY); 
    
    if (!userInfoString) return null;
    
    const userInfo = JSON.parse(userInfoString);
    const userId = userInfo.id; // Lấy trường 'id' (MaNMV)

    // Chỉ cho phép user thường xem các sự kiện họ tạo
    if (!userId || userInfo.role !== 'User') return null; 

    return Number(userId); 
  } catch (e) {
    console.error("Lỗi khi đọc user info từ sessionStorage:", e);
    return null;
  }
}

// 6. LOGIC TẢI VÀ LỌC SỰ KIỆN (Không đổi)
// function loadEvents(status, query = '') {
//     let url = `http://localhost:3000/api/organizer/my-events`;
    
//     // Xây dựng tham số query
//     const params = [];
//     if (status) {
//         params.push(`status=${status}`);
//     }
//     if (query) {
//         params.push(`query=${encodeURIComponent(query)}`);
//     }

//     if (params.length > 0) {
//         url += '?' + params.join('&');
//     }
    
//     // API này đã được chỉnh sửa trong server.js để lọc theo DonViToChucMaDonVi
//     fetch(url)
//         .then(res => res.json())
//         .then(data => {
//             if(data.success) renderEvents(data.events);
//             else showToast('Lỗi tải sự kiện: ' + data.message, 'error');
//         })
//         .catch(err => {
//             console.error('Lỗi kết nối:', err);
//             showToast('Lỗi kết nối server khi tải sự kiện', 'error');
//         });
// }
// sukiencuatoi.js (Hàm loadEvents)

function loadEvents(status, query = '') {
    const userId = getCurrentUserId(); 
    
    // Lấy container list và empty state
    const listContainer = document.getElementById('my-event-list');
    const emptyState = document.querySelector('.empty-state');

    if (!userId) {
        showToast('Vui lòng đăng nhập để xem chương trình của bạn.', 'error');
        // --- Cập nhật giao diện khi chưa đăng nhập ---
        if (listContainer) listContainer.innerHTML = '';
        if (listContainer) listContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    let url = `http://localhost:3000/api/organizer/my-events`;
    
    // ... (Phần xây dựng URL giữ nguyên)
    const params = [];
    params.push(`userId=${userId}`); 
    
    if (status) {
        params.push(`status=${status}`);
    }
    if (query) {
        params.push(`query=${encodeURIComponent(query)}`);
    }

    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    // Gửi yêu cầu API
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                renderEvents(data.events);
            }
            else {
                showToast('Lỗi tải sự kiện: ' + data.message, 'error');
                renderEvents([]); // Hiển thị trạng thái rỗng nếu có lỗi
            }
        })
        .catch(err => {
            console.error('Lỗi kết nối:', err);
            showToast('Lỗi kết nối server khi tải sự kiện', 'error');
            renderEvents([]); // Hiển thị trạng thái rỗng nếu lỗi kết nối
        });
}


// 7. HÀM XỬ LÝ TÌM KIẾM (Không đổi)
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const currentActiveTab = document.querySelector('.filter-tab.active');
    
    const query = searchInput.value.trim();
    // Lấy trạng thái của tab đang active để lọc kết quả tìm kiếm trong tab đó
    const status = currentActiveTab ? currentActiveTab.getAttribute('data-status') : '';

    loadEvents(status, query);
}

// 8. KHỞI CHẠY VÀ GẮN SỰ KIỆN
document.addEventListener('DOMContentLoaded', () => {
    // Dropdown User Logic
    const accountBtn = document.querySelector('.account-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (accountBtn && dropdownMenu) {
        accountBtn.addEventListener('mouseenter', () => { dropdownMenu.style.opacity = '1'; dropdownMenu.style.visibility = 'visible'; dropdownMenu.style.transform = 'translateY(0)'; });
        dropdownMenu.addEventListener('mouseleave', () => { dropdownMenu.style.opacity = '0'; dropdownMenu.style.visibility = 'hidden'; dropdownMenu.style.transform = 'translateY(-10px)'; });
    }

    // Gắn sự kiện đóng Modal chi tiết
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('detailModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') {
            closeModal();
        }
    });

    // LOGIC TABS FILTER
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 1. Cập nhật trạng thái active
            filterTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active'); 

            // 2. Lấy status code từ data-status attribute
            const status = e.target.getAttribute('data-status');
            
            // 3. Xóa ô tìm kiếm và gọi hàm load events với status code
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            
            loadEvents(status);
        });
    });

    // LOGIC TÌM KIẾM
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Tải sự kiện mặc định
    const activeTab = document.querySelector('.filter-tab.active');
    if (activeTab) {
        loadEvents(activeTab.getAttribute('data-status'));
    } else {
        // Mặc định load tab DangBan nếu không có tab nào active
        loadEvents('DangBan');
    }
});
