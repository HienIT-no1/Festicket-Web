// File: admin-order.js

const ORDER_API_BASE = 'http://localhost:3000/api/orders'; 

// === HÀM TIỆN ÍCH ===

function formatCurrency(amount) {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function getStatusBadge(status) {
    switch (status) {
        case 'DaThanhToan': return `<span class="badge badge-success">Đã Thanh toán</span>`;
        case 'ChoThanhToan': return `<span class="badge badge-warning">Chờ Thanh toán</span>`;
        case 'Huy': return `<span class="badge badge-danger">Hủy</span>`;
        case 'HoanTien': return `<span class="badge badge-info">Hoàn tiền</span>`;
        default: return `<span class="badge badge-info">${status}</span>`;
    }
}

// === QUẢN LÍ ĐƠN HÀNG (ORDER MANAGEMENT) ===

// 2.1. Lấy và hiển thị danh sách đơn hàng
async function loadOrders() {
    try {
        // GỌI API 3.5 TỪ BACK-END
        const response = await fetch(`${ORDER_API_BASE}/admin`); 
        if (!response.ok) throw new Error('Không thể tải danh sách đơn hàng.');

        const data = await response.json();
        const orders = data.orders; // Lấy mảng đơn hàng từ key 'orders' của JSON
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = ''; // Xóa dữ liệu cũ

        orders.forEach(order => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${order.MaDonHang}</td>
                <td>${order.MaDonHangCode}</td>
                <td>${formatCurrency(order.TongTien)}</td>
                <td>${order.TenNguoiMua}</td>
                <td>${new Date(order.NgayTao).toLocaleDateString('vi-VN')}</td>
                <td>${getStatusBadge(order.TrangThai)}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openEditOrderModal(${order.MaDonHang})">Cập nhật</button>
                    <button class="action-btn btn-delete" onclick="deleteOrder(${order.MaDonHang}, '${order.TrangThai}')">Xóa</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Lỗi khi tải đơn hàng:', error);
        alert('Không thể tải dữ liệu đơn hàng. Kiểm tra server.js và kết nối DB.');
    }
}

// 2.2. Mở Modal Cập nhật (Sử dụng API 3.4)
window.openEditOrderModal = async function(orderId) {
    try {
        const response = await fetch(`${ORDER_API_BASE}/${orderId}`); 
        if (!response.ok) throw new Error('Không tìm thấy đơn hàng.');

        const data = await response.json();
        const order = data.order;

        document.getElementById('editOrderId').value = order.MaDonHang;
        document.getElementById('modalOrderCode').innerText = order.MaDonHangCode;
        document.getElementById('editOrderTongTien').value = formatCurrency(order.TongTien);
        document.getElementById('editOrderHoTen').value = order.TenNguoiMua;
        document.getElementById('editTrangThaiOrder').value = order.TrangThai;
        
        document.getElementById('editOrderModal').classList.add('active');
    } catch (error) {
        alert('Lỗi tải thông tin đơn hàng: ' + error.message);
    }
}

// 2.3. Đóng Modal
window.closeEditOrderModal = function() {
    document.getElementById('editOrderModal').classList.remove('active');
}

// 2.4. Xử lý Form Cập nhật (Sử dụng API 3.2)
document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const orderId = document.getElementById('editOrderId').value;
    const newStatus = document.getElementById('editTrangThaiOrder').value;

    if (!confirm(`Bạn có chắc muốn cập nhật trạng thái đơn hàng #${orderId} sang ${newStatus}?`)) {
        return;
    }

    try {
        const response = await fetch(`${ORDER_API_BASE}/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            closeEditOrderModal();
            loadOrders(); 
        } else {
            alert('Lỗi cập nhật: ' + data.message);
        }
    } catch (error) {
        alert('Lỗi hệ thống khi cập nhật đơn hàng.');
        console.error(error);
    }
});

// 2.5. Xử lý Xóa Đơn hàng (Sử dụng API 3.6)
window.deleteOrder = async function(orderId, currentStatus) {
    const deletableStatuses = ['ChoThanhToan', 'Huy', 'HoanTien'];

    if (!deletableStatuses.includes(currentStatus)) {
        alert(`🔴 Chỉ có thể xóa đơn hàng ở trạng thái "Chờ Thanh toán", "Hủy", hoặc "Hoàn tiền". Đơn hàng này đang ở trạng thái "${currentStatus}".`);
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn XÓA đơn hàng #${orderId} không?`)) {
        return;
    }

    try {
        const response = await fetch(`${ORDER_API_BASE}/${orderId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadOrders(); 
        } else {
            alert('Lỗi xóa đơn hàng: ' + data.message);
        }

    } catch (error) {
        alert('Lỗi hệ thống khi xóa đơn hàng.');
        console.error(error);
    }
}

// 2.6. Xử lý Tìm kiếm đơn hàng
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const filter = this.value.toUpperCase();
            const tbody = document.getElementById('ordersTableBody');
            if (!tbody) return;

            const rows = tbody.getElementsByTagName('tr');

            for (let i = 0; i < rows.length; i++) {
                // Lấy cột Mã đơn Code (index 1)
                const orderCodeCell = rows[i].getElementsByTagName('td')[1]; 
                if (orderCodeCell) {
                    const txtValue = orderCodeCell.textContent || orderCodeCell.innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        rows[i].style.display = "";
                    } else {
                        rows[i].style.display = "none";
                    }
                }       
            }
        });
    }
});

// Hàm khởi tạo được gọi khi click vào menu "Đơn hàng"
window.initializeOrderManagement = function() {
    loadOrders();
}