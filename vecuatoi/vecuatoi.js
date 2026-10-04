
const API_BASE_URL = '/api/';

function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (e) { return null; }
    }
    return null;
}

function updateSidebarUserDisplay() {
    const user = getCurrentUser();
    const userDisplayElement = document.querySelector('.user-name-value');
    
    if (user && userDisplayElement) {
        const displayName = user.hoTen || (user.email ? user.email.split('@')[0] : 'Khách');
        userDisplayElement.textContent = displayName;
    } else if (userDisplayElement) {
        userDisplayElement.textContent = 'Khách';
    }
    
    // Logic hiển thị menu Auth
    const authBtn = document.getElementById('openAuthBtn');
    const userMenu = document.getElementById('userAccountDisplay');
    if (authBtn && userMenu) {
        authBtn.style.display = user ? 'none' : 'block';
        userMenu.style.display = user ? 'block' : 'none';
    }
}

// Hàm render thẻ vé (Đã thêm data-order-code cho nút chi tiết)
function renderTicketCard(order) {
    const statusMap = {
        'ChoThanhToan': { text: 'Đang xử lý', class: 'pending' },
        'DaThanhToan': { text: 'Đã TT', class: 'processing' }, 
        'Huy': { text: 'Đã hủy', class: 'cancelled' },
        'HoanThanh': { text: 'Hoàn thành', class: 'completed' },
    };
    const status = statusMap[order.TrangThaiDonHang] || { text: 'Lỗi', class: 'error' };

    // Chỉ hiển thị QR nếu vé đã được thanh toán/hoàn thành
    const showQrButton = (order.TrangThaiDonHang === 'DaThanhToan' || order.TrangThaiDonHang === 'HoanThanh');

    const dateEvent = new Date(order.NgayGioBatDau);
    const dateEventStr = dateEvent.toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const timeEventStr = dateEvent.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Poster URL
    const posterUrl = order.Poster ? `/${order.Poster}` : 'placeholder.jpg'; 
    const totalAmount = order.TongTien ? order.TongTien.toLocaleString('vi-VN') : '0';

    return `
        <div class="ticket-card ${status.class}">
            <div class="ticket-image" style="background-image: url('${posterUrl}');"></div>
            <div class="ticket-details">
                <h3 class="event-name">${order.TenChuongTrinh || 'Không rõ sự kiện'}</h3>
                
                <div class="event-info">
                    <p><i class="fa-regular fa-clock"></i> ${timeEventStr}, ${dateEventStr}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${order.DiaDiem || 'Địa điểm chưa rõ'}</p>
                </div>
                
                <hr style="border-color:#444; margin: 10px 0;">

                <div class="order-summary-details">
                    <p>
                        <span class="detail-label">Mã ĐH:</span> 
                        <span class="detail-value">${order.MaDonHangCode}</span>
                    </p>
                    <p>
                        <span class="detail-label">Tổng tiền:</span> 
                        <strong class="detail-value total-price">${totalAmount} đ</strong>
                    </p>
                </div>
            </div>
            <div class="ticket-status">
                <span class="status-badge ${status.class}">${status.text}</span>
                <button class="view-detail-btn" 
                        data-order-code="${order.MaDonHangCode}" // <--- TRUYỀN MÃ ĐƠN HÀNG
                        data-show-qr="${showQrButton ? 'true' : 'false'}"
                        style="${showQrButton ? '' : 'background:#f44336; cursor:not-allowed;'}">
                    ${showQrButton ? 'Xem chi tiết' : 'Chờ xác nhận'}
                </button>
            </div>
        </div>
    `;
}

async function loadUserTickets(statusFilter = 'Tất cả') {
    const user = getCurrentUser();
    const ordersListContainer = document.querySelector('.orders-list'); 
    const emptyState = document.querySelector('.empty-state');
    
    if (!user) {
        // Xử lý khi chưa đăng nhập
        if (ordersListContainer) ordersListContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    // Hiển thị loading
    ordersListContainer.innerHTML = '<p style="text-align:center; color:#aaa;">Đang tải lịch sử đơn hàng...</p>';
    if (emptyState) emptyState.style.display = 'none';

    // Map tên tab sang trạng thái DB ENUM
    let statusParam = statusFilter.trim();
    if (statusFilter === 'Tất cả') statusParam = '';

    try {
        const url = `${API_BASE_URL}users/${user.id}/orders${statusParam ? `?status=${statusParam}` : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();

        ordersListContainer.innerHTML = '';

        if (data.success && data.orders.length > 0) {
            ordersListContainer.innerHTML = data.orders.map(renderTicketCard).join('');
            ordersListContainer.style.display = 'grid'; 
            emptyState.style.display = 'none';
            
            // *QUAN TRỌNG: GỌI HÀM NÀY SAU KHI RENDER*
            setupTicketDetailListeners(); 

        }
        else {
            // Hiển thị Empty State
            ordersListContainer.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block'; 
                document.querySelector('.empty-message').textContent = `Bạn chưa có vé nào ở mục ${statusFilter.toLowerCase()}.`;
            }
        }

    } catch (error) {
        console.error('Lỗi tải vé (API 2.4):', error);
        ordersListContainer.innerHTML = '<p style="text-align:center; color:red;">Không thể tải danh sách vé. Vui lòng kiểm tra Server.</p>';
    }
}

//=================================================================================================================
// TRONG vecuatoi.js (Thêm ở Global Scope)

// === HÀM TẠO QR ĐỘNG (Dùng thư viện qrcode.js) ===
function generateQrCode(elementId, qrData) {
    // TẠO QR CODE từ dữ liệu độc nhất
    new QRCode(document.getElementById(elementId), {
        text: qrData,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

// === LOGIC HIỂN THỊ MODAL TỪNG VÉ CON ===
function setupTicketDetailListeners() {
    document.querySelectorAll('.view-detail-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const orderCode = this.getAttribute('data-order-code');
            const showQr = this.getAttribute('data-show-qr');
            
            if (showQr !== 'true') {
                return alert("Vé chưa được thanh toán hoặc đã bị hủy, không thể xem chi tiết QR.");
            }

            const qrModal = document.getElementById('qrModal');
            const qrOrderCodeDisplay = document.getElementById('qrOrderCode');
            const ticketContainer = document.getElementById('individualTicketContainer');
            
            if (!qrModal || !qrOrderCodeDisplay || !ticketContainer) return;

            // 1. Hiển thị loading/chuẩn bị modal
            qrOrderCodeDisplay.textContent = orderCode;
            ticketContainer.innerHTML = '<p style="text-align:center; color:#ccc;">Đang tải chi tiết vé...</p>';
            // THAY ĐỔI QUAN TRỌNG: DÙNG classList.add('show') để kích hoạt CSS hiển thị
            qrModal.classList.add('show'); 
            
            try {
                // 2. GỌI API ĐỂ LẤY TẤT CẢ VÉ CON VÀ MÃ TOKEN QR
                const response = await fetch(`${API_BASE_URL}orders/${orderCode}/tickets`); 
                const data = await response.json();
                
                if (data.success && data.tickets.length > 0) {
                    ticketContainer.innerHTML = ''; // Xóa loading
                    
                    data.tickets.forEach((ticket, index) => {
                        const uniqueQrData = ticket.MaTokenQR; // Mã Token duy nhất từ Server
                        const qrId = `qr-ticket-${index}-${Date.now()}`; // ID container QR động
                        
                        const ticketHtml = `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:#363636; margin-bottom:15px; padding:15px; border-radius:8px;">
                                <div style="text-align:left;">
                                    <h4 style="margin:0; color:#FF6A88;">Vé #${index + 1}</h4>
                                    <p style="margin:5px 0 0 0;">${ticket.TenLoaiCho} (${ticket.GiaVe.toLocaleString('vi-VN')} đ)</p>
                                    <p style="font-size:12px; color:#aaa;">Token: ${uniqueQrData}</p>
                                </div>
                                <div id="${qrId}" style="width: 150px; height: 150px; background:white; padding:5px; border-radius:4px;"></div>
                            </div>
                        `;
                        ticketContainer.insertAdjacentHTML('beforeend', ticketHtml);
                        
                        // 3. TẠO QR CODE ĐỘNG
                        generateQrCode(qrId, uniqueQrData);
                    });
                } else {
                    ticketContainer.innerHTML = '<p style="color:red; text-align:center;">Không tìm thấy chi tiết vé con cho đơn hàng này.</p>';
                }
            } catch (error) {
                console.error("Lỗi khi tải chi tiết vé con:", error);
                ticketContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi hệ thống khi tải vé con.</p>';
            }
        });
    });
}

// ==================================================
// III. KHỞI TẠO VÀ GẮN SỰ KIỆN DOM
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy trạng thái đăng nhập và hiển thị Sidebar
    updateSidebarUserDisplay(); 

    const urlParams = new URLSearchParams(window.location.search);
    let initialTab = urlParams.get('tab') || 'Tất cả';
    const tabs = document.querySelectorAll('.tabs .tab');
    
    // 2. Gán sự kiện click cho các tabs VÀ thiết lập trạng thái ban đầu
    tabs.forEach(tab => {
        const tabText = tab.textContent.trim();
        
        // Thiết lập Active Tab
        if (tabText === initialTab) {
             tabs.forEach(t => t.classList.remove('active'));
             tab.classList.add('active'); 
        }
        
        // Gắn sự kiện click (Tải lại dữ liệu khi tab được chọn)
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Tải dữ liệu theo trạng thái mới
            loadUserTickets(this.textContent.trim()); 
        });
    });

    // 3. Khởi tạo tải dữ liệu ban đầu
    // Đảm bảo rằng hàm tải dữ liệu ban đầu luôn được gọi với filter chính xác
    loadUserTickets(initialTab); 
    
    // 4. Gắn sự kiện cho nút "Mua vé ngay" trong Empty State
    document.querySelector('.buy-ticket-btn')?.addEventListener('click', function() {
        window.location.href = '/trangchu/trangchu1.html'; 
    });
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


