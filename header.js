// Hàm kiểm tra định dạng email bằng RegEx
function isValidEmail(email) {
    // Regex nâng cao hơn:
    // 1. Phải bắt đầu bằng chữ cái/số/ký tự hợp lệ (KHÔNG phải dấu chấm)
    // 2. Cho phép dấu chấm (.), gạch dưới (_), gạch ngang (-) bên trong
    // 3. Không cho phép dấu chấm ở đầu, cuối, hoặc hai dấu chấm liên tiếp.
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/; 
    
    // Kiểm tra cơ bản
    if (!emailRegex.test(email)) return false;
    
    // Kiểm tra dấu chấm ở đầu/cuối phần tên (trước @)
    const localPart = email.split('@')[0];
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    
    return true;
}

// Hàm xử lý ĐĂNG KÝ
window.handleRegister = function() {
    const hoTen = document.getElementById('regHoTen').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value; 

    if (!hoTen || !email || !password || !confirmPassword) {
        return alert('Vui lòng điền đầy đủ thông tin.');
    }
    
    // BƯỚC MỚI: KIỂM TRA ĐỊNH DẠNG EMAIL
    if (!isValidEmail(email)) {
        return alert('Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: tenban@domain.com).');
    }

    if (password.length < 6) {
        return alert('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    if (password !== confirmPassword) {
        return alert('Mật khẩu nhập lại không khớp!');
    }

    // SỬA: Dùng /api/register
    fetch('http://localhost:3000/api/register', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoTen, email, password })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            // Tự động chuyển sang tab Đăng nhập sau khi đăng ký thành công
            window.switchAuth('login');
        }
    })
    .catch(err => console.error('Lỗi đăng ký:', err));
}

// Hàm xử lý ĐĂNG NHẬP (Đã cập nhật để phân biệt vai trò Admin)
window.handleLogin = function() {
    const email = document.getElementById('loginEmail').value; 
    const password = document.getElementById('loginPassword').value; 

    // 1. Gọi API đăng nhập (URL API được giữ nguyên như trong mã cũ)
    fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        
        if (data.success) {
            // Lưu thông tin người dùng vào Session Storage (theo logic ban đầu của bạn)
            sessionStorage.setItem('currentUser', JSON.stringify(data.user)); 
            
            document.getElementById('authModal').classList.remove('show');
            
            // 2. PHÂN BIỆT VAI TRÒ VÀ CHUYỂN HƯỚNG
            // Giả định Server trả về user.role = 'Admin' cho tài khoản quản trị
            if (data.user && (data.user.role === 'Moderator')) {
                window.location.href = '/admin/admin-trangchu.html';
            } else {
                // Người dùng thường (hoặc role khác), chuyển hướng đến trang chủ
                window.location.href = '/trangchu/trangchu1.html'; 
            }
            
            // * Lưu ý: Việc gọi updateHeaderUI() và window.location.reload()
            // đã được thay thế bằng chuyển hướng (window.location.href)
            // để đảm bảo logic phân luồng được áp dụng ngay lập tức.

        }
    })
    .catch(err => {
        console.error('Lỗi đăng nhập:', err);
        alert('Lỗi hệ thống khi đăng nhập. Vui lòng thử lại.');
    });
}


// Hàm chuyển tab Đăng nhập/Đăng ký (Đã có trong logic cũ)
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
}
// Function này kiểm tra sessionStorage và cập nhật header
function updateHeaderUI() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const loginRegisterBtn = document.getElementById('openAuthBtn'); 
    const accountWrapper = document.getElementById('userAccountDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (accountWrapper && loginRegisterBtn) {
        if (user && user.hoTen) {
            // TRẠNG THÁI ĐÃ ĐĂNG NHẬP
            accountWrapper.style.display = 'block'; // Hiện menu Tài khoản
            loginRegisterBtn.style.display = 'none'; // Ẩn nút Đăng nhập | Đăng ký
            
            if (userNameDisplay) {
                userNameDisplay.textContent = user.hoTen; 
            }
        } else {
            // TRẠNG THÁI CHƯA ĐĂNG NHẬP
            accountWrapper.style.display = 'none'; 
            loginRegisterBtn.style.display = 'block'; 
        }
    }
}

// Hàm Xử lý ĐĂNG XUẤT
window.handleLogout = function() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        sessionStorage.removeItem('currentUser'); // Xóa trạng thái đăng nhập
        alert('Đã đăng xuất thành công.');
        updateHeaderUI(); // Cập nhật giao diện ngay lập tức

        // Chuyển hướng về trang chủ để làm sạch URL và trạng thái
        window.location.href = '/trangchu/trangchu1.html'; 
    }
}

// TỰ ĐỘNG KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP KHI TẢI TRANG
document.addEventListener('DOMContentLoaded', updateHeaderUI);