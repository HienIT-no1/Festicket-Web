
// --- THÊM CÁC HÀM SAU VÀO taikhoancuatoi.js ---

const API_BASE_URL = 'http://localhost:3000/api';

// Hàm lấy thông tin người dùng từ sessionStorage
function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (e) {
            console.error("Lỗi parse user data:", e);
            return null;
        }
    }
    return null;
}

// ----------------------------------------------------
// A. LOAD DỮ LIỆU NGƯỜI DÙNG HIỆN TẠI
// ----------------------------------------------------
// TRONG taikhoancuatoi.js: Thay thế hàm loadUserData
async function loadUserData() {
    const user = getCurrentUser();
    const profileForm = document.getElementById('profileForm');

    if (!user || !user.id) {
        // Tắt form nếu chưa đăng nhập hoặc lỗi
        if (profileForm) {
            profileForm.innerHTML = '<p class="text-center" style="color:#FF6A88; margin-top: 50px;">Vui lòng đăng nhập để xem thông tin tài khoản.</p>';
        }
        document.querySelector('.user-name-value').textContent = 'Khách';
        return;
    }

    // 1. Cập nhật tên ở Sidebar (Sửa lỗi TypeError)
    const userDisplayName = user.hoTen || user.email.split('@')[0];
    const userNameValueEl = document.querySelector('.user-name-value'); 

    if (userNameValueEl) {
        // Cập nhật tên người dùng ở Sidebar
        userNameValueEl.textContent = userDisplayName; 
    }
    
    // Thử truy vấn dữ liệu từ API
    try {
        const response = await fetch(`${API_BASE_URL}/users/${user.id}`);
        // ... (phần code còn lại của loadUserData giữ nguyên)
        const data = await response.json();

        if (data.success && data.user) {
            const userData = data.user;
            
            // Cập nhật Form
            document.getElementById('hoTenInput').value = userData.HoTen || '';
            document.getElementById('emailInput').value = userData.Email || ''; 
            
            // SoDienThoai
            if (userData.SoDienThoai) {
                const sdt = userData.SoDienThoai.replace('+84', '').trim();
                document.getElementById('phoneInput').value = sdt;
            } else {
                document.getElementById('phoneInput').value = '';
            }
            
            // Ngày Sinh
            if (userData.NgaySinh) {
                const datePart = userData.NgaySinh.split('T')[0]; 
                document.getElementById('dobInput').value = datePart; 
            } else {
                document.getElementById('dobInput').value = '';
            }

            // Giới Tính
            if (userData.GioiTinh) {
                const genderMap = { 'Nam': 'male', 'Nữ': 'female', 'Khác': 'other' };
                const radioId = genderMap[userData.GioiTinh];
                const radioElement = document.getElementById(radioId);
                if (radioElement) {
                    radioElement.checked = true;
                }
            }
        } else {
            console.error("Lỗi tải thông tin chi tiết người dùng:", data.message);
        }

    } catch (error) {
        console.error('Lỗi kết nối Server khi tải dữ liệu:', error);
    }
}


// ----------------------------------------------------
// B. CẬP NHẬT DỮ LIỆU NGƯỜI DÙNG (Hoàn thành)
// ----------------------------------------------------
document.getElementById('profileForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || !user.id) return;

    // Lấy dữ liệu từ form
    const hoTen = document.getElementById('hoTenInput').value.trim();
    
    // SoDienThoai (Luôn thêm +84 nếu có giá trị)
    const soDienThoaiRaw = document.getElementById('phoneInput').value.trim();
    // Thêm kiểm tra định dạng/chiều dài ở production
    const soDienThoai = soDienThoaiRaw ? '+84' + soDienThoaiRaw : null;
    
    // NgaySinh (input type="date" trả về YYYY-MM-DD)
    const ngaySinh = document.getElementById('dobInput').value.trim() || null; 
    
    // Giới Tính
    const gioiTinhValue = document.querySelector('input[name="gender"]:checked')?.value;
    const gioiTinh = gioiTinhValue ? (gioiTinhValue === 'male' ? 'Nam' : (gioiTinhValue === 'female' ? 'Nu' : 'Khac')) : null;

    const updateData = { hoTen, soDienThoai, ngaySinh, gioiTinh };

    try {
        const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            
            // Cập nhật lại sessionStorage và hiển thị nếu HoTen thay đổi
            if (user.hoTen !== hoTen) {
                sessionStorage.setItem('currentUser', JSON.stringify({...user, hoTen: hoTen}));
            }
            
            // Tải lại dữ liệu sau khi cập nhật
            loadUserData(); 
        } else {
            alert("Cập nhật thất bại: " + data.message);
        }

    } catch (error) {
        console.error('Lỗi khi gửi dữ liệu:', error);
        alert("Lỗi kết nối Server khi cập nhật.");
    }
});


// ----------------------------------------------------
// C. GỌI HÀM KHI TRANG ĐƯỢC LOAD
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    // Gọi hàm load dữ liệu khi trang tải xong
    loadUserData(); 
});








// === HÀM XỬ LÝ MODAL ĐĂNG NHẬP/ĐĂNG KÝ ===
function setupAuthModal() {
    const modal = document.getElementById('authModal');
    const openBtn = document.getElementById('openAuthBtn');
    const closeBtn = document.querySelector('.close-btn');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => modal.classList.add('show'));
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        
        // Đóng modal khi click ra ngoài
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// Hàm chuyển tab Login/Register (đặt ở Global Scope)
window.switchAuth = function(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (type === 'login') {
        document.querySelector('.auth-tab:nth-child(1)').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab:nth-child(2)').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
};