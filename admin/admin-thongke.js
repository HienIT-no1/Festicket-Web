// Biến toàn cục để lưu instance của biểu đồ (giúp hủy và vẽ lại)
let dailyOrdersChartInstance = null;
let ticketRatioChartInstance = null;

// =========================================================
// HÀM CHÍNH: TẢI DỮ LIỆU THỐNG KÊ (Dành cho section #statistics)
// =========================================================

window.loadStatisticsData = async function() {
    const baseUrl = 'http://localhost:3000/api/admin/stats';
    
    // Tải và vẽ Biểu đồ Đơn hàng theo ngày
    await fetchAndRenderDailyOrders(baseUrl);

    // Tải và vẽ Biểu đồ Tỷ lệ vé đã bán
    await fetchAndRenderTicketRatio(baseUrl);
}

// --------------------------------------------------------
// 1. TẢI VÀ VẼ BIỂU ĐỒ SỐ LƯỢNG ĐƠN HÀNG (BAR CHART)
// --------------------------------------------------------
async function fetchAndRenderDailyOrders(baseUrl) {
    const ctx = document.getElementById('dailyOrdersChart');
    if (!ctx) return;

    try {
        const response = await fetch(`${baseUrl}/orders-daily`);
        const data = await response.json();

        if (data.success && data.orders) {
            const labels = data.orders.map(item => item.Ngay.split('-').slice(1).join('/')); 
            const dataPoints = data.orders.map(item => item.SoDonHang);
            
            if (dailyOrdersChartInstance) dailyOrdersChartInstance.destroy();

            dailyOrdersChartInstance = new Chart(ctx, {
                type: 'bar', // Biểu đồ cột
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Số lượng Đơn hàng',
                        data: dataPoints,
                        backgroundColor: '#667eea', // Màu cột chính
                        borderColor: '#764ba2',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Số lượng đơn hàng' },
                            ticks: {
                                precision: 0 // Đảm bảo số nguyên
                            }
                        },
                        x: {
                            title: { display: true, text: 'Ngày (Tháng/Ngày)' }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Tổng số đơn hàng được thanh toán trong 30 ngày' }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Lỗi tải dữ liệu đơn hàng hàng ngày:', error);
    }
}

// --------------------------------------------------------
// 2. TẢI VÀ VẼ BIỂU ĐỒ TỶ LỆ VÉ (PIE CHART)
// --------------------------------------------------------
async function fetchAndRenderTicketRatio(baseUrl) {
    const ctx = document.getElementById('ticketRatioChart');
    if (!ctx) return;

    try {
        const response = await fetch(`${baseUrl}/ticket-ratio`);
        const data = await response.json();

        if (data.success && data.ratio) {
            const labels = data.ratio.map(item => item.PriceCategory);
            const dataPoints = data.ratio.map(item => item.TotalSold);

            if (ticketRatioChartInstance) ticketRatioChartInstance.destroy();

            ticketRatioChartInstance = new Chart(ctx, {
                type: 'doughnut', // Biểu đồ tròn
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Số lượng vé đã bán',
                        data: dataPoints,
                        backgroundColor: ['#667eea', '#ff6a88'], // Màu sắc cho các phần
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Tỷ lệ vé đã bán theo phân loại giá '
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const value = context.parsed;
                                    const percentage = (value * 100 / total).toFixed(2) + '%';
                                    return `${label}${value.toLocaleString()} vé (${percentage})`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Lỗi tải dữ liệu tỷ lệ vé:', error);
    }
}