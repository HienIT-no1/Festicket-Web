// admin-chuongtrinh.js

const EVENT_API_BASE_URL = '/api/admin/events';
let allEventsData = []; // Lưu trữ toàn bộ dữ liệu sự kiện

// =========================================================
// 1. RENDER BẢNG CHƯƠNG TRÌNH & TÌM KIẾM
// =========================================================

async function loadEventsTable() {
    const tbody = document.querySelector('#events table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải dữ liệu chương trình...</td></tr>';

    try {
        const response = await fetch(EVENT_API_BASE_URL);
        const data = await response.json();

        if (data.success) {
            allEventsData = data.events; 
            renderEvents(allEventsData, tbody);
            
            // Gắn sự kiện tìm kiếm
            document.getElementById('eventSearchInput').addEventListener('input', handleEventSearch);

        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">${data.message || 'Lỗi tải dữ liệu chương trình.'}</td></tr>`;
        }

    } catch (error) {
        console.error('Lỗi kết nối API chương trình:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">🔴 Không thể kết nối đến server API.</td></tr>`;
    }
}

function handleEventSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const tbody = document.querySelector('#events table tbody');
    
    if (query === '') {
        renderEvents(allEventsData, tbody);
        return;
    }

    // Lọc theo Tên chương trình
    const filteredEvents = allEventsData.filter(event => 
        event.TenChuongTrinh && event.TenChuongTrinh.toLowerCase().includes(query)
    );

    renderEvents(filteredEvents, tbody);
}

function getStatusBadge(status) {
    switch (status) {
        case 'DangBan': return '<span class="badge badge-success">Đang Bán</span>';
        case 'HetVe': return '<span class="badge badge-danger">Hết Vé</span>';
        case 'ChoDuyet': return '<span class="badge badge-warning">Chờ Duyệt</span>';
        case 'DaDienRa': return '<span class="badge badge-info">Đã Diễn Ra</span>';
        case 'Huy': return '<span class="badge badge-danger">Hủy</span>';
        default: return `<span class="badge badge-warning">${status}</span>`;
    }
}

function renderEvents(events, tbody) {
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Không tìm thấy chương trình nào phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = events.map(event => {
        // Định dạng Ngày giờ Bắt đầu
        const startDate = new Date(event.NgayGioBatDau);
        const displayDateTime = startDate.toLocaleDateString('vi-VN') + ' ' + startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        return `
            <tr>
                <td>#${event.id}</td>
                <td>${event.TenChuongTrinh}</td>
                <td>${displayDateTime}</td>
                <td>${event.DiaDiem || 'N/A'}</td>
                <td>${getStatusBadge(event.TrangThai)}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openEditEventModal('${event.id}')">Sửa</button>
                    <button class="action-btn btn-delete" onclick="handleDeleteEvent('${event.id}', '${event.TenChuongTrinh}')">Xóa</button>
                </td>
            </tr>
        `;
    }).join('');
}

// =========================================================
// 2. XỬ LÝ SỰ KIỆN XÓA
// =========================================================
window.handleDeleteEvent = async function(eventId, eventName) {
    if (!confirm(`Xác nhận xóa: Bạn có chắc chắn muốn xóa chương trình: ${eventName} (ID: ${eventId})? Thao tác này không thể hoàn tác.`)) {
        return;
    }

    try {
        const response = await fetch(`${EVENT_API_BASE_URL}/${eventId}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (response.status === 409) {
            // Xử lý lỗi vé đã bán
            return alert(data.message);
        }
        
        if (data.success) {
            alert(data.message);
            // Cập nhật dữ liệu cục bộ và render lại bảng
            allEventsData = allEventsData.filter(event => event.id != eventId);
            renderEvents(allEventsData, document.querySelector('#events table tbody'));
        } else {
            alert('Lỗi xóa: ' + (data.message || 'Lỗi không xác định.'));
        }
    } catch (error) {
        console.error('Lỗi kết nối khi xóa chương trình:', error);
        alert('Lỗi kết nối Server, không thể xóa chương trình.');
    }
};

// =========================================================
// 3. XỬ LÝ MODAL SỬA VÀ CẬP NHẬT
// =========================================================

// Hàm mở Modal và điền dữ liệu
window.openEditEventModal = function(eventId) {
    const event = allEventsData.find(e => e.id == eventId);
    const modal = document.getElementById('editEventModal');
    
    if (!event) {
        alert('Không tìm thấy thông tin chương trình.');
        return;
    }

    // Định dạng ngày giờ bắt đầu thành YYYY-MM-DDTHH:MM (định dạng HTML input type="datetime-local")
    const startDate = new Date(event.NgayGioBatDau);
    const localDateTime = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);


    // Điền dữ liệu vào Form
    document.getElementById('editEventId').value = event.id;
    document.getElementById('editTenChuongTrinh').value = event.TenChuongTrinh || '';
    document.getElementById('editMoTa').value = event.MoTa || '';
    document.getElementById('editNgayGioBatDau').value = localDateTime;
    document.getElementById('editDiaDiem').value = event.DiaDiem || '';
    document.getElementById('editDanhSachNgheSi').value = event.DanhSachNgheSi || '';
    document.getElementById('editTrangThai').value = event.TrangThai || 'BanNhap';

    modal.classList.add('active'); 
    
    const form = document.getElementById('editEventForm');
    form.onsubmit = null; 
    form.onsubmit = (e) => handleUpdateEvent(e, eventId);
};

window.closeEditEventModal = function() {
    document.getElementById('editEventModal').classList.remove('active');
};

async function handleUpdateEvent(e, eventId) {
    e.preventDefault();
    closeEditEventModal(); 

    // Lấy dữ liệu từ form
    const TenChuongTrinh = document.getElementById('editTenChuongTrinh').value;
    const MoTa = document.getElementById('editMoTa').value;
    const NgayGioBatDau = document.getElementById('editNgayGioBatDau').value; 
    const DiaDiem = document.getElementById('editDiaDiem').value;
    const DanhSachNgheSi = document.getElementById('editDanhSachNgheSi').value;
    const TrangThai = document.getElementById('editTrangThai').value;

    const updateData = { TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai };

    try {
        const response = await fetch(`${EVENT_API_BASE_URL}/${eventId}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await response.json();

        if (data.success) {
            alert('✅ Lưu thay đổi thành công!'); 
            
            // Cập nhật dữ liệu cục bộ và render lại bảng
            const eventIndex = allEventsData.findIndex(e => e.id == eventId);
            if (eventIndex !== -1) {
                // Ghi đè các trường đã sửa vào object event trong mảng
                allEventsData[eventIndex] = {
                    ...allEventsData[eventIndex],
                    ...updateData
                };
            }
            renderEvents(allEventsData, document.querySelector('#events table tbody'));
        } else {
            alert('Cập nhật thất bại: ' + (data.message || 'Lỗi không xác định.'));
        }
    } catch (error) {
        console.error('Lỗi kết nối khi cập nhật:', error);
        alert('Lỗi kết nối Server, không thể cập nhật thông tin.');
    }
}

// =========================================================
// 4. LOGIC KHỞI TẠO
// =========================================================

// Hàm này được gọi từ admin-trangchu.html khi chuyển mục
window.initializeEventManagement = function() {
    allEventsData = []; 
    const searchInput = document.getElementById('eventSearchInput');
    if (searchInput) searchInput.value = ''; 
    loadEventsTable();
};


// =========================================================
// 5. XỬ LÝ MODAL THÊM CHƯƠNG TRÌNH MỚI
// =========================================================

window.openAddEventModal = function() {
    // Reset form trống mỗi khi mở
    document.getElementById('addEventForm').reset();
    document.getElementById('addEventModal').classList.add('active');
    
    // Gán sự kiện submit
    const form = document.getElementById('addEventForm');
    form.onsubmit = handleAddEvent;
};

window.closeAddEventModal = function() {
    document.getElementById('addEventModal').classList.remove('active');
};

async function handleAddEvent(e) {
    e.preventDefault();
    
    // Lấy dữ liệu từ các ô input
    const newEvent = {
        TenChuongTrinh: document.getElementById('addTenChuongTrinh').value,
        MoTa: document.getElementById('addMoTa').value,
        NgayGioBatDau: document.getElementById('addNgayGioBatDau').value,
        DiaDiem: document.getElementById('addDiaDiem').value,
        DanhSachNgheSi: document.getElementById('addDanhSachNgheSi').value,
        TrangThai: document.getElementById('addTrangThai').value
    };

    try {
        // Gọi API tạo mới dành riêng cho Admin
        const response = await fetch(`${EVENT_API_BASE_URL}/basic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
        });
        
        const data = await response.json();

        if (data.success) {
            alert('✅ Thêm chương trình thành công!');
            closeAddEventModal();
            loadEventsTable(); // Tải lại bảng để thấy sự kiện mới
        } else {
            alert('Thêm thất bại: ' + (data.message || 'Lỗi không xác định.'));
        }
    } catch (error) {
        console.error('Lỗi khi thêm chương trình:', error);
        alert('Lỗi kết nối Server!');
    }
}