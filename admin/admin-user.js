// admin-user.js (Phiên bản đã sửa lỗi, thêm Tìm kiếm và Modal Sửa/Xóa)

const USER_API_BASE_URL = '/api/admin/users';
let allUsersData = []; // Lưu trữ toàn bộ dữ liệu người dùng

// =========================================================
// 1. RENDER BẢNG NGƯỜI DÙNG & TÌM KIẾM
// =========================================================

async function loadUsersTable() {
    const tbody = document.querySelector('#users table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải dữ liệu...</td></tr>';

    try {
        const response = await fetch(USER_API_BASE_URL);
        const data = await response.json();

        if (data.success) {
            allUsersData = data.users; // Lưu dữ liệu gốc
            renderUsers(allUsersData, tbody);
            
            // QUAN TRỌNG: Gắn sự kiện tìm kiếm sau khi tải data
            document.getElementById('userSearchInput').addEventListener('input', handleSearch);

        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">${data.message || 'Lỗi tải dữ liệu người dùng.'}</td></tr>`;
        }

    } catch (error) {
        console.error('Lỗi kết nối API người dùng:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">🔴 Không thể kết nối đến server API (${USER_API_BASE_URL}).</td></tr>`;
    }
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const tbody = document.querySelector('#users table tbody');
    
    if (query === '') {
        renderUsers(allUsersData, tbody); // Hiển thị lại toàn bộ nếu query rỗng
        return;
    }

    // Lọc theo Họ tên
    const filteredUsers = allUsersData.filter(user => 
        user.HoTen && user.HoTen.toLowerCase().includes(query)
    );

    renderUsers(filteredUsers, tbody);
}


function renderUsers(users, tbody) {
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy người dùng nào phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        let gioiTinhText = 'N/A';
        if (user.GioiTinh === 'Nam') gioiTinhText = 'Nam';
        else if (user.GioiTinh === 'Nu') gioiTinhText = 'Nữ';
        else if (user.GioiTinh === 'Khac') gioiTinhText = 'Khác';
        
        // Chuyển NgaySinh sang định dạng YYYY-MM-DD cho input type="date"
        const birthDate = user.NgaySinh 
            ? new Date(user.NgaySinh).toISOString().split('T')[0] 
            : '';

        // Hiển thị ngày sinh dưới dạng dd/mm/yyyy
        const displayDate = user.NgaySinh 
            ? new Date(user.NgaySinh).toLocaleDateString('vi-VN') 
            : 'N/A';


        return `
            <tr data-user-id="${user.id}">
                <td>#${user.id}</td>
                <td>${user.HoTen || 'N/A'}</td>
                <td>${user.Email}</td>
                <td>${user.SoDienThoai || 'N/A'}</td>
                <td>${displayDate}</td>
                <td>${gioiTinhText}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openEditUserModal('${user.id}')">Sửa</button>
                    <button class="action-btn btn-delete" onclick="handleDeleteUser('${user.id}', '${user.HoTen}')">Xóa</button>
                </td>
            </tr>
        `;
    }).join('');
}


// =========================================================
// 2. XỬ LÝ SỰ KIỆN XÓA
// =========================================================
window.handleDeleteUser = async function(userId, userName) {
    if (!confirm(`Xác nhận xóa: Bạn có chắc chắn muốn xóa người dùng: ${userName} (ID: ${userId})? Thao tác này không thể hoàn tác.`)) {
        return;
    }

    try {
        const response = await fetch(`${USER_API_BASE_URL}/${userId}`, {
            method: 'DELETE',
        });
        const data = await response.json();

        if (data.success) {
            alert(data.message);
            // Xóa người dùng khỏi dữ liệu cục bộ và tải lại bảng
            allUsersData = allUsersData.filter(user => user.id != userId);
            renderUsers(allUsersData, document.querySelector('#users table tbody'));
        } else {
            alert('Lỗi xóa: ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi kết nối khi xóa:', error);
        alert('Lỗi kết nối Server, không thể xóa người dùng.');
    }
};

// =========================================================
// 3. XỬ LÝ MODAL SỬA VÀ CẬP NHẬT
// =========================================================
window.openEditUserModal = function(userId) {
    const user = allUsersData.find(u => u.id == userId);
    const modal = document.getElementById('editUserModal');
    
    if (!user) {
        alert('Không tìm thấy thông tin người dùng.');
        return;
    }

    // Điền dữ liệu vào Form
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editHoTen').value = user.HoTen || '';
    document.getElementById('editEmail').value = user.Email;
    document.getElementById('editSoDienThoai').value = user.SoDienThoai || '';
    
    // NgaySinh: Phải là định dạng YYYY-MM-DD
    const dateInput = document.getElementById('editNgaySinh');
    const dbDate = user.NgaySinh ? new Date(user.NgaySinh).toISOString().split('T')[0] : '';
    dateInput.value = dbDate;
    
    document.getElementById('editGioiTinh').value = user.GioiTinh || 'Khac';

    modal.classList.add('active'); // Hiển thị modal (Giả định có CSS cho .modal-overlay.active)
    
    // Gắn sự kiện submit form (Nếu chưa có)
    const form = document.getElementById('editUserForm');
    form.onsubmit = (e) => handleUpdateUser(e, userId);
};

window.closeEditUserModal = function() {
    document.getElementById('editUserModal').classList.remove('active');
};

async function handleUpdateUser(e, userId) {
    e.preventDefault();
    closeEditUserModal(); // Đóng modal ngay lập tức

    const HoTen = document.getElementById('editHoTen').value;
    const SoDienThoai = document.getElementById('editSoDienThoai').value;
    const NgaySinh = document.getElementById('editNgaySinh').value; // Đã ở YYYY-MM-DD
    const GioiTinh = document.getElementById('editGioiTinh').value;
    const Email = document.getElementById('editEmail').value; // Chỉ đọc, nhưng cần gửi đi

    const updateData = { HoTen, SoDienThoai, Email, NgaySinh, GioiTinh };

    try {
        const response = await fetch(`${USER_API_BASE_URL}/${userId}`, {
            method: 'PUT', // Dùng PUT cho cập nhật
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await response.json();

        if (data.success) {
            alert(data.message);
            // Cập nhật dữ liệu cục bộ (allUsersData) và render lại bảng
            const userIndex = allUsersData.findIndex(u => u.id == userId);
            if (userIndex !== -1) {
                // Cập nhật các trường đã sửa vào object user trong mảng
                allUsersData[userIndex] = {
                    ...allUsersData[userIndex],
                    ...updateData
                };
            }
            renderUsers(allUsersData, document.querySelector('#users table tbody'));
        } else {
            alert('Cập nhật thất bại: ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi kết nối khi cập nhật:', error);
        alert('Lỗi kết nối Server, không thể cập nhật thông tin.');
    }
}

// =========================================================
// 4. LOGIC KHỞI TẠO
// =========================================================
window.initializeUserManagement = function() {
    // Xóa dữ liệu cũ khi chuyển tab
    allUsersData = []; 
    // Reset ô tìm kiếm
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) searchInput.value = ''; 
    loadUsersTable();
};