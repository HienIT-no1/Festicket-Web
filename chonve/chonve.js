
// chonve.js (Logic Dynamic cho trang Chọn Vé)

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event_id');

    if (!eventId) {
        document.getElementById('showTitle').textContent = "Lỗi: Không tìm thấy ID sự kiện!";
        return;
    }

    const API_BASE = 'http://localhost:3000/api/';
    let tickets = {}; // Object lưu trữ dữ liệu vé dynamic (key: MaLoaiCho)
    let eventDetails = {}; // Thông tin sự kiện

    const summaryItemsContainer = document.getElementById('summaryItemsContainer');
    const ticketSelectionContainer = document.getElementById('ticketSelectionContainer');
    const totalPriceElement = document.getElementById('total-price');
    const confirmButton = document.querySelector('.confirm-button');
    const backLink = document.getElementById('backLink');

    // === HÀM CHUNG & UI ===
    function formatCurrency(number) {
        return number.toLocaleString('vi-VN') + ' đ';
    }

    function updateEventDetailsUI(event) {
        document.getElementById('showTitle').textContent = `Chọn vé - ${event.TenChuongTrinh}`;
        document.getElementById('showDetails').textContent = event.TenChuongTrinh;
        
        const date = new Date(event.NgayGioBatDau).toLocaleString('vi-VN');
        document.getElementById('summaryDateTime').innerHTML = `<i class="far fa-calendar-alt"></i> ${date}`;
        document.getElementById('summaryLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.DiaDiem}`;

        // Nút trở về sẽ quay lại trang chi tiết
        backLink.href = `/chuongtrinh/chuongtrinh.html?id=${eventId}`;
    }
    
    function renderTicketSelectionControls(id, ticket) {
        // --- 1. Render Ô Chọn Vé ---
        const selectionHTML = `
            <div class="ticket-type" data-id="${id}">
                <div class="type-header">
                    <h2 class="type-name">${ticket.name}</h2>
                    <span class="type-price">${formatCurrency(ticket.price)}</span>
                </div>
                <div class="type-details">
                    <div class="info-icon"><i class="fas fa-info-circle"></i></div>
                    <p class="description">${ticket.moTa}</p>
                </div>
                <div class="quantity-control">
                    <label for="qty-${id}">Số lượng</label>
                    <div class="counter">
                        <button class="decrement" data-id="${id}">-</button>
                        <input type="number" class="quantity-input" id="qty-${id}" value="0" min="0" readonly>
                        <button class="increment" data-id="${id}">+</button>
                    </div>
                </div>
            </div>`;
        ticketSelectionContainer.innerHTML += selectionHTML;

        // --- 2. Render Dòng Tóm Tắt ---
        const summaryRow = document.createElement('div');
        summaryRow.className = 'summary-item';
        summaryRow.id = `summary-${id}`;
        summaryRow.style.display = 'none'; // Ẩn mặc định
        summaryRow.innerHTML = `
            <span>${ticket.name} <span class="quantity-display">x0</span></span>
            <span class="price-value">${formatCurrency(0)}</span>
        `;
        summaryItemsContainer.appendChild(summaryRow);
    }

    function updateSummary() {
        let grandTotal = 0;
        let totalQuantity = 0;
        
        for (const id in tickets) {
            const ticket = tickets[id];
            const itemTotal = ticket.price * ticket.quantity;
            grandTotal += itemTotal;
            totalQuantity += ticket.quantity;
            
            const summaryRow = document.getElementById(`summary-${id}`);
            if (summaryRow) {
                const quantityDisplay = summaryRow.querySelector('.quantity-display');
                const priceValueDisplay = summaryRow.querySelector('.price-value');

                if (ticket.quantity > 0) {
                    summaryRow.style.display = 'flex';
                    quantityDisplay.textContent = `x${ticket.quantity}`;
                    priceValueDisplay.textContent = formatCurrency(itemTotal);
                } else {
                    summaryRow.style.display = 'none';
                }
            }
        }

        // Cập nhật tổng tiền cuối cùng
        totalPriceElement.textContent = formatCurrency(grandTotal);
        
        // Cập nhật nút xác nhận
        if (totalQuantity > 0) {
            confirmButton.textContent = `Tiếp tục (${formatCurrency(grandTotal)})`;
            confirmButton.disabled = false;
            confirmButton.onclick = handleConfirmation; 
        } else {
            confirmButton.textContent = 'Vui lòng chọn vé';
            confirmButton.disabled = true;
            confirmButton.onclick = null;
        }
    }

    function handleQuantityChange(e) {
        if (e.target.classList.contains('increment') || e.target.classList.contains('decrement')) {
            const button = e.target;
            const id = button.getAttribute('data-id');
            const input = document.getElementById(`qty-${id}`);
            
            let currentValue = parseInt(input.value);

            // Giả định logic kiểm tra số lượng tối đa 10 vé/người
            const maxPerUser = 10;
            // Số lượng còn lại trong kho (Chưa có API, nên ta dùng 5000)
            const remaining = 5000; 

            if (button.classList.contains('increment')) {
                if (currentValue < maxPerUser && currentValue < remaining) { 
                    currentValue++;
                } else {
                    return alert(`Bạn chỉ có thể mua tối đa ${maxPerUser} vé.`); 
                }
            } else if (button.classList.contains('decrement') && currentValue > 0) {
                currentValue--;
            }

            // Cập nhật input và object
            input.value = currentValue;
            tickets[id].quantity = currentValue;
            
            updateSummary();
        }
    }
    
    function handleConfirmation() {
        // Lấy thông tin user (từ sessionStorage)
        const user = sessionStorage.getItem('currentUser');
        if (!user) {
            alert("Vui lòng đăng nhập để tiếp tục mua vé!");
            // Chuyển về trang chủ và mở modal đăng nhập
            window.location.href = `/trangchu/trangchu1.html?show_login=true`; 
            return;
        }

        // Chuẩn bị dữ liệu để chuyển sang trang Thanh toán
        const selectedTickets = [];
        for (const id in tickets) {
            if (tickets[id].quantity > 0) {
                selectedTickets.push({
                    ticket_type_id: parseInt(id),
                    quantity: tickets[id].quantity,
                    price: tickets[id].price
                });
            }
        }

        if (selectedTickets.length === 0) return;

        // BƯỚC QUAN TRỌNG: CHUYỂN TRANG
        // Chúng ta sẽ lưu dữ liệu vé tạm thời vào Session Storage 
        // vì nó chỉ cần tồn tại trong suốt quá trình thanh toán.
        sessionStorage.setItem('selectedTickets', JSON.stringify(selectedTickets));
        sessionStorage.setItem('currentEventId', eventId);
        
        // Chuyển sang trang Phương Thức Thanh Toán
        window.location.href = `/phuongthucthanhtoan/phuongthucthanhtoan.html`;
    }


    // === KHỞI TẠO CHÍNH ===

    // Gán listener cho toàn bộ khu vực chọn vé (dùng event delegation)
    ticketSelectionContainer.addEventListener('click', handleQuantityChange);

    // Fetch API: Lấy chi tiết sự kiện và Vé
    Promise.all([
        fetch(`${API_BASE}events/${eventId}`).then(res => res.json()),
        fetch(`${API_BASE}events/${eventId}/tickets`).then(res => res.json())
    ])
    .then(([eventDetails, ticketTypes]) => {
        if (!eventDetails || ticketTypes.length === 0) {
            ticketSelectionContainer.innerHTML = '<p style="color:red; text-align:center;">Không tìm thấy vé hoặc sự kiện này.</p>';
            return;
        }
        
        eventDetails = eventDetails;
        
        // 1. Cập nhật Event Details
        updateEventDetailsUI(eventDetails);

        // 2. Render các ô chọn vé và tạo object tickets
        ticketSelectionContainer.innerHTML = ''; // Clear loading message
        summaryItemsContainer.innerHTML = ''; // Clear loading message
        
        ticketTypes.forEach(t => {
            const ticketId = t.MaLoaiCho.toString(); // Dùng MaLoaiCho làm key ID
            
            // Khởi tạo object tickets
            tickets[ticketId] = {
                name: t.TenLoaiCho,
                price: parseFloat(t.GiaVe),
                quantity: 0,
                moTa: t.MoTa || 'Không có mô tả chi tiết.'
            };
            
            // Vẽ các ô chọn vé và Summary row
            renderTicketSelectionControls(ticketId, tickets[ticketId]);
        });

        updateSummary();
    })
    .catch(err => {
        console.error('Lỗi tải dữ liệu:', err);
        ticketSelectionContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối server hoặc database.</p>';
    });
});