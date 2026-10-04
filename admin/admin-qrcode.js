// admin-ticket-list.js

// Khai báo biến cần thiết
const TICKET_API_BASE = 'http://localhost:3000/api/admin';
let allPaidOrders = []; // Lưu trữ dữ liệu gốc

// --- HÀM TIỆN ÍCH ---

function formatVND(amount) {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount).replace('₫', 'đ');
}

function getStatusBadge(status) {
    if (status === 'DaThanhToan') {
        return `<span class="badge badge-success" style="background: #e8f5e9; color: #4caf50;">Đã Thanh toán</span>`;
    }
    return `<span class="badge badge-info" style="background: #e3f2fd; color: #2196f3;">${status}</span>`;
}

// --- 1. RENDER BẢNG ĐƠN HÀNG ĐÃ THANH TOÁN ---
function renderOrderList(orders, tbody) {
    if (!tbody) return;
    tbody.innerHTML = ''; // Xóa nội dung cũ

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không tìm thấy đơn hàng đã thanh toán nào.</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = order.MaDonHangCode;
        row.insertCell().textContent = order.TenKhachHang;
        row.insertCell().textContent = order.Email;
        row.insertCell().textContent = order.MaNMV; // Mã người mua vé
        row.insertCell().textContent = order.SoLuongVe;
        row.insertCell().textContent = formatVND(order.TongTien);
        
        const date = new Date(order.NgayTao);
        row.insertCell().textContent = date.toLocaleDateString('vi-VN');
        
        row.insertCell().innerHTML = getStatusBadge(order.TrangThai);
        
        const actionCell = row.insertCell();
        // Truyền MaDonHang (ID số) để API truy vấn
        actionCell.innerHTML = `<button class="btn btn-primary btn-sm" onclick="showTicketDetailsModal('${order.MaDonHang}')" style="background: #667eea;">Xem chi tiết</button>`;
    });
}

// --- 2. TẢI DỮ LIỆU ĐƠN HÀNG ---
async function loadPaidOrders() {
    const tbody = document.getElementById('ticketListTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Đang tải dữ liệu...</td></tr>';

    try {
        const response = await fetch(`${TICKET_API_BASE}/tickets-by-order`);
        const data = await response.json();

        if (data.success) {
            allPaidOrders = data.orders;
            renderOrderList(allPaidOrders, tbody);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">${data.message || 'Lỗi tải danh sách đơn hàng.'}</td></tr>`;
        }

    } catch (error) {
        console.error('Lỗi kết nối API danh sách vé:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center;">🔴 Lỗi kết nối Server.</td></tr>`;
    }
}

// --- 3. XỬ LÝ TÌM KIẾM ---
function handleTicketSearch(event) {
    const filter = event.target.value.toUpperCase();
    const filteredOrders = allPaidOrders.filter(order => 
        order.TenKhachHang.toUpperCase().includes(filter) || 
        order.Email.toUpperCase().includes(filter) ||
        order.MaDonHangCode.toUpperCase().includes(filter)
    );
    renderOrderList(filteredOrders, document.getElementById('ticketListTableBody'));
}


// --- 4. RENDER VÀ HIỂN THỊ MODAL QR ---

function renderSingleTicketQR(ticket, index) {
    const checkinBadge = ticket.TrangThaiCheckin === 'DaQuet'
        ? `<span style="color:#2ecc71; font-weight: bold;">(ĐÃ CHECK-IN)</span>` 
        : `<span style="color:#e67e22; font-weight: bold;">(CHƯA CHECK-IN)</span>`;

    const dateEvent = new Date(ticket.NgayGioBatDau);
    const dateEventStr = dateEvent.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
    const timeEventStr = dateEvent.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Cấu trúc thẻ vé đơn giản trong Modal (dùng style dark theme)
    return `
        <div style="background: #2a2a2a; border-radius: 8px; padding: 15px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border: 1px solid #444;">
            <div style="flex-grow: 1; text-align: left;">
                <h4 style="color: white; margin-bottom: 5px; font-size: 16px;">Vé #${index + 1}: ${ticket.TenLoaiCho}</h4>
                <p style="color: #FF6A88; font-size: 14px; font-weight: 500; margin-bottom: 8px;">${ticket.TenChuongTrinh}</p>
                <p style="color: #aaa; font-size: 12px; margin-bottom: 5px;">Thời gian: ${timeEventStr} - ${dateEventStr}</p>
                <p style="color: #ccc; font-size: 12px; margin-bottom: 5px;">Token: <span style="font-family: monospace; color: #00bcd4;">${ticket.MaTokenQR}</span></p>
                <p style="color: #ccc; font-size: 12px;">Trạng thái: ${checkinBadge}</p>
            </div>
            <div id="qr-ticket-${ticket.MaTokenQR}" 
                style="width: 120px; height: 120px; flex-shrink: 0; background: white; padding: 5px; border-radius: 4px; display: flex; justify-content: center; align-items: center;">
                </div>
        </div>
    `;
}

// Hàm được gọi khi bấm "Xem chi tiết"
window.showTicketDetailsModal = async function(orderId) {
    const modal = document.getElementById('qrModal');
    const container = document.getElementById('individualTicketContainer');
    const qrOrderCodeSpan = document.getElementById('qrOrderCode');
    
    const order = allPaidOrders.find(o => o.MaDonHang == orderId);
    if (!order) {
        alert('Lỗi: Không tìm thấy thông tin đơn hàng.');
        return;
    }
    qrOrderCodeSpan.textContent = order.MaDonHangCode;

    container.innerHTML = '<p style="color:white;">Đang tải chi tiết vé...</p>';
    modal.style.display = 'flex';

    try {
        const response = await fetch(`${TICKET_API_BASE}/tickets/${orderId}`);
        const data = await response.json();

        if (data.success && data.tickets.length > 0) {
            container.innerHTML = ''; // Xóa thông báo tải
            
            data.tickets.forEach((ticket, index) => {
                // Thêm HTML của vé
                container.innerHTML += renderSingleTicketQR(ticket, index);
            });

            // Sau khi render xong HTML, vẽ từng QR code
            data.tickets.forEach(ticket => {
                new QRCode(document.getElementById(`qr-ticket-${ticket.MaTokenQR}`), {
                    text: ticket.MaTokenQR, 
                    width: 110,
                    height: 110,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            });

        } else {
            container.innerHTML = `<p style="color:red;">${data.message || 'Không tìm thấy vé trong đơn hàng này.'}</p>`;
        }
    } catch (error) {
        console.error('Lỗi tải QR tickets:', error);
        container.innerHTML = `<p style="color:red;">🔴 Lỗi kết nối Server khi tải chi tiết vé.</p>`;
    }
}


// --- 5. HÀM KHỞI TẠO ---
window.initializeTicketList = function() {
    loadPaidOrders();
    const searchInput = document.getElementById('ticketSearchInput');
    // Chỉ gắn event listener một lần
    if (searchInput && !searchInput.hasAttribute('data-listener-attached')) {
        searchInput.addEventListener('input', handleTicketSearch);
        searchInput.setAttribute('data-listener-attached', 'true');
    }
};