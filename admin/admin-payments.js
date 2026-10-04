// admin-payments.js (Logic cho Quản lí Thanh Toán)

const PAYMENT_API_BASE = 'http://localhost:3000/api/admin';
let allPayments = []; 

// --- HÀM TIỆN ÍCH ---

function formatVND(amount) {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount).replace('₫', 'đ');
}

function getPaymentStatusBadge(status) {
    switch (status) {
        case 'ThanhCong': return `<span class="badge badge-success">Thành công</span>`;
        case 'ThatBai': return `<span class="badge badge-danger">Thất bại</span>`;
        case 'ChoXuLy': return `<span class="badge badge-warning">Chờ xử lý</span>`;
        default: return `<span class="badge badge-info">${status}</span>`;
    }
}

// --- 1. RENDER BẢNG THANH TOÁN ---
function renderPayments(payments, tbody) {
    if (!tbody) return;
    tbody.innerHTML = '';

    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không tìm thấy bản ghi thanh toán nào.</td></tr>`;
        return;
    }

    payments.forEach(p => {
        const row = tbody.insertRow();
        
        row.insertCell().textContent = `#${p.MaThanhToan}`;
        row.insertCell().textContent = p.MaGiaoDich || 'N/A';
        row.insertCell().textContent = p.MaDonHangCode;
        row.insertCell().textContent = formatVND(p.SoTien);
        row.insertCell().textContent = p.TenPhuongThuc;
        
        const date = new Date(p.NgayThanhToan);
        row.insertCell().textContent = date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        row.insertCell().innerHTML = getPaymentStatusBadge(p.TrangThaiThanhToan);
        
        const actionCell = row.insertCell();
        actionCell.innerHTML = `<button class="action-btn btn-edit" onclick="openEditPaymentModal(${p.MaThanhToan})">Xử lý</button>`;
    });
}

// --- 2. TẢI DỮ LIỆU THANH TOÁN ---
async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải dữ liệu...</td></tr>';

    try {
        const response = await fetch(`${PAYMENT_API_BASE}/payments`);
        const data = await response.json();

        if (data.success) {
            allPayments = data.payments;
            renderPayments(allPayments, tbody);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">${data.message || 'Lỗi tải danh sách thanh toán.'}</td></tr>`;
        }

    } catch (error) {
        console.error('Lỗi kết nối API thanh toán:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">🔴 Lỗi kết nối Server.</td></tr>`;
    }
}

// --- 3. XỬ LÝ MODAL CẬP NHẬT ---
window.openEditPaymentModal = function(paymentId) {
    const payment = allPayments.find(p => p.MaThanhToan == paymentId);
    const modal = document.getElementById('editPaymentModal');
    
    if (!payment) {
        alert('Không tìm thấy thông tin thanh toán.');
        return;
    }

    // Điền dữ liệu vào Form
    document.getElementById('editPaymentId').value = payment.MaThanhToan;
    document.getElementById('modalPaymentId').textContent = `#${payment.MaThanhToan}`;
    document.getElementById('modalOrderCodeDisplay').value = payment.MaDonHangCode;
    document.getElementById('modalPaymentSummary').value = `${formatVND(payment.SoTien)} qua ${payment.TenPhuongThuc}`;
    document.getElementById('editPaymentTrangThai').value = payment.TrangThaiThanhToan;

    modal.classList.add('active'); 
    
    const form = document.getElementById('editPaymentForm');
    form.onsubmit = (e) => handleUpdatePayment(e, payment.MaThanhToan);
};

window.closeEditPaymentModal = function() {
    document.getElementById('editPaymentModal').classList.remove('active');
};

async function handleUpdatePayment(e, paymentId) {
    e.preventDefault();
    closeEditPaymentModal(); 

    const newStatus = document.getElementById('editPaymentTrangThai').value;

    if (!confirm(`Xác nhận cập nhật Thanh toán #${paymentId} sang trạng thái "${newStatus}"? (Điều này sẽ đồng bộ trạng thái Đơn hàng).`)) {
        return;
    }

    try {
        const response = await fetch(`${PAYMENT_API_BASE}/payments/${paymentId}/status`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus })
        });
        const data = await response.json();

        if (data.success) {
            alert(data.message); 
            // Tải lại dữ liệu
            loadPayments(); 
        } else {
            alert('Cập nhật thất bại: ' + (data.message || 'Lỗi không xác định.'));
        }
    } catch (error) {
        console.error('Lỗi kết nối khi cập nhật:', error);
        alert('Lỗi kết nối Server, không thể cập nhật trạng thái thanh toán.');
    }
}

// --- 4. HÀM KHỞI TẠO ---
window.initializePaymentManagement = function() {
    loadPayments();
    // Gắn sự kiện tìm kiếm nếu cần thiết (tương tự như các file admin khác)
    const searchInput = document.getElementById('paymentSearchInput');
    // ... (Thêm logic tìm kiếm nếu cần)
};