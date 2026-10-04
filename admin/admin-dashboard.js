// --- LOGIC GỌI API & CẬP NHẬT UI CHO ADMIN DASHBOARD ---

document.addEventListener('DOMContentLoaded', () => {
    // Hàm này được gọi trong logic login/showSection trong admin-trangchu.html
    // Chúng ta cần gọi lại nó khi Dashboard được hiển thị
    // Tuy nhiên, vì dashboard là mặc định, ta gọi nó ở đây:
    if (document.getElementById('dashboard').classList.contains('active')) {
        loadDashboardData();
    }
});

// Thêm logic Chart.js (cần thêm thư viện Chart.js vào admin-trangchu.html)
// Hiện tại chúng ta sẽ chỉ cập nhật placeholder

function formatVND(amount) {
    if (amount === 0) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount).replace('₫', 'đ');
}

// --------------------------------------------------------
// HÀM CHÍNH: TẢI DỮ LIỆU VÀ CẬP NHẬT DASHBOARD
// --------------------------------------------------------
async function loadDashboardData() {
    const baseUrl = 'http://localhost:3000/api/admin/stats';
    
    // Cập nhật thẻ thống kê hàng ngày
    await fetchDailyStats(baseUrl);

    // Cập nhật biểu đồ doanh thu
    await fetchRevenueData(baseUrl);
}


// --------------------------------------------------------
// 1. TẢI DỮ LIỆU THỐNG KÊ HÀNG NGÀY
// --------------------------------------------------------
async function fetchDailyStats(baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/daily`);
        const data = await response.json();

        if (data.success && data.stats) {
            const stats = data.stats;
            
            // 1. Tổng doanh thu (ĐÃ SỬA: Lấy từ stats)
            document.querySelector('#dashboard .stats-grid .stat-card:nth-child(1) .number').textContent = formatVND(stats.TongDoanhThu);
            
            // 2. Vé đã bán (ĐÃ SỬA: Lấy từ stats)
            document.querySelector('#dashboard .stats-grid .stat-card:nth-child(2) .number').textContent = stats.TongVeBan.toLocaleString();
            
            // 3. Số lượng đơn hàng (ĐÃ SỬA: Lấy từ stats)
            document.querySelector('#dashboard .stats-grid .stat-card:nth-child(3) .number').textContent = stats.TongDonHang.toLocaleString();
            
            // 4. Người dùng mới (ĐÃ SỬA: Lấy từ stats)
            document.querySelector('#dashboard .stats-grid .stat-card:nth-child(4) .number').textContent = stats.TongNguoiDungMoi.toLocaleString();
            
            // Tạm thời giữ nguyên phần trăm thay đổi
            console.log('Cập nhật thống kê hàng ngày thành công:', stats);

        } else {
            console.error('Lỗi API thống kê hàng ngày:', data.message);
        }
    } catch (error) {
        console.error('Lỗi kết nối Server khi tải Daily Stats:', error);
    }
}


// --------------------------------------------------------
// 2. TẢI DỮ LIỆU DOANH THU THEO NGÀY (CHO BIỂU ĐỒ)
// --------------------------------------------------------
// Tìm và thay thế toàn bộ nội dung hàm fetchRevenueData(baseUrl)

async function fetchRevenueData(baseUrl) {
    // Không cần dùng chartPlaceholder nữa vì Chart.js sẽ vẽ lên Canvas
    
    try {
        const response = await fetch(`${baseUrl}/revenue-daily`);
        const data = await response.json();

        if (data.success && data.revenue) {
            const revenueData = data.revenue;
            
            // 1. Chuẩn bị dữ liệu cho Chart.js
            const labels = revenueData.map(item => item.Ngay.split('-').slice(1).join('/')); // Lấy Mónth/Day
            const dataPoints = revenueData.map(item => item.DoanhThu);
            
            // 2. Gọi hàm vẽ biểu đồ
            renderRevenueChart(labels, dataPoints); 
            
        } else {
            console.error('Lỗi API doanh thu:', data.message);
            // Xóa canvas nếu có lỗi
            if (chartInstance) chartInstance.destroy();
            document.getElementById('revenueChart').style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi kết nối Server khi tải Revenue Data:', error);
        // Xóa canvas nếu có lỗi
        if (chartInstance) chartInstance.destroy();
        document.getElementById('revenueChart').style.display = 'none';
    }
}

// --------------------------------------------------------
// CẬP NHẬT HÀM CHUYỂN ĐỔI SECTION ĐỂ GỌI loadDashboardData
// --------------------------------------------------------

// Giữ nguyên logic showSection từ admin-trangchu.html, nhưng đặt lại ở đây để đảm bảo logic chạy đúng
// Hàm chuyển đổi các mục menu
window.showSection = function(sectionId, title) {
    // Ẩn tất cả các sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Gỡ bỏ trạng thái active khỏi tất cả menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Hiển thị section được chọn và đánh dấu active cho menu item
    document.getElementById(sectionId).classList.add('active');
    document.getElementById('pageTitle').innerText = title;

    // Tìm và thêm class 'active' cho menu item được click
    const activeMenuItem = document.querySelector(`.menu-item[onclick*="${sectionId}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // QUAN TRỌNG: Gọi hàm tải dữ liệu nếu là Dashboard
    if (sectionId === 'dashboard') {
        loadDashboardData();
    }
};

// --------------------------------------------------------
// GIỮ NGUYÊN LOGIC LOGIN/LOGOUT TỪ admin-trangchu.html
// --------------------------------------------------------
window.login = function() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'flex';
    showSection('dashboard', 'Dashboard');
}

window.logout = function() {
    document.getElementById('mainDashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

// Biến toàn cục để lưu instance của biểu đồ (giúp hủy và vẽ lại)
let chartInstance = null; 

// --------------------------------------------------------
// HÀM VẼ BIỂU ĐỒ DOANH THU (Dùng Chart.js)
// --------------------------------------------------------
function renderRevenueChart(labels, dataPoints) {
    const ctx = document.getElementById('revenueChart');

    // Nếu biểu đồ đã tồn tại, hủy nó trước khi vẽ lại
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Tìm ngày gần nhất (phần tử cuối cùng)
    const latestDate = labels.length > 0 ? labels[labels.length - 1] : '';
    const latestRevenue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : 0;
    
    // Cập nhật thẻ placeholder/chú thích với dữ liệu ngày gần nhất
    const chartContainer = ctx.closest('.chart-container');
    if (chartContainer) {
        const info = chartContainer.querySelector('h2');
        info.innerHTML = `Doanh thu 30 ngày gần nhất 
            <span style="font-size: 14px; color: #4caf50; font-weight: normal;">
                (Ngày ${latestDate}: ${formatVND(latestRevenue)})
            </span>`;
    }


    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VND)',
                data: dataPoints,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderWidth: 2,
                tension: 0.4, // Đường cong mượt mà
                fill: true,
                pointRadius: 3 // Kích thước điểm dữ liệu
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Quan trọng để canvas con đáp ứng chiều cao cha
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Doanh thu (VND)',
                        color: '#666'
                    },
                    ticks: {
                        callback: function(value) {
                            // Định dạng trục Y (tiền)
                            return formatVND(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày (Tháng/Ngày)',
                        color: '#666'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            // Hiển thị tooltip với định dạng tiền
                            label += formatVND(context.raw); 
                            return label;
                        }
                    }
                }
            }
        }
    });
}