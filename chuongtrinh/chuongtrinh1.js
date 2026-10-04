

document.addEventListener('DOMContentLoaded', () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const buyButton = document.getElementById('buyTicketBtn');

    // 1. Tải chi tiết sự kiện
    fetch(`/api/events/${id}`)
        .then(res => res.json())
        .then(event => {
            if (!event) return;
            
            // Điền thông tin Hero
            document.getElementById('eventTitle').textContent = event.TenChuongTrinh;
            document.getElementById('eventDate').textContent = '📅 ' + new Date(event.NgayGioBatDau).toLocaleString('vi-VN');
            document.getElementById('eventVenue').innerHTML = '📍 ' + event.DiaDiem.replace(/\n/g, '<br>');
            
            // Ảnh Poster và Sidebar
            const imgPath = '/' + event.Poster;
            document.getElementById('eventPoster').src = imgPath;
            // document.getElementById('sidebarImage').src = imgPath; // Dùng luôn poster làm ảnh sidebar

            // Nội dung & BTC
            document.getElementById('eventDescription').innerHTML = event.MoTa || 'Đang cập nhật mô tả...';
            document.getElementById('organizerName').textContent = event.TenDonVi || 'Ban Tổ Chức';
            document.getElementById('organizerDesc').textContent = event.GioiThieu || '';

            if (buyButton) {
                buyButton.onclick = function() {
                    // [FIX 3] Dùng biến event.MaChuongTrinh từ data vừa fetch
                    window.location.href = `/chonve/chonve.html?event_id=${event.MaChuongTrinh}`;
                };
            }
            
            // 2. Tải vé
            loadTickets(id, event.NgayGioBatDau, event.DiaDiem);
            
        });

    // 3. Tải "Có thể bạn cũng thích" (Lấy 4 sự kiện mới nhất)
    loadRelatedEvents();
});

function loadTickets(id, dateString, venue) {
    fetch(`/api/events/${id}/tickets`)
        .then(res => res.json())
        .then(tickets => {
            const container = document.getElementById('ticketAccordion');
            const priceEl = document.getElementById('eventPrice');
            container.innerHTML = '';

            // Cập nhật giá "Từ..."
            if(tickets.length > 0) {
                const minPrice = Math.min(...tickets.map(t => t.GiaVe));
                priceEl.textContent = `Giá từ ${minPrice.toLocaleString()}đ`;
            } else {
                priceEl.textContent = 'Đang cập nhật';
                container.innerHTML = '<p>Chưa có vé mở bán.</p>';
                return;
            }

            // Tạo danh sách vé HTML
            let ticketsHTML = tickets.map(t => `
            <div class="ticket-type">
                <div class="ticket-info">
                    <h4>${t.TenLoaiCho}</h4>
                    <p style="font-size: 14px; color: #666;">${t.MoTa || 'Vé tiêu chuẩn'}</p>
                </div>
                <div class="ticket-price-action">
                    <span class="ticket-price">${parseInt(t.GiaVe).toLocaleString()}đ</span>
                    <button class="btn-buy ticket-buy-btn" 
                            data-event-id="${id}" 
                            data-ticket-type-id="${t.MaLoaiCho}">
                        Mua vé
                    </button> 
                </div>
            </div>
            `).join('');

            // Tạo Accordion Item (Giống layout bạn gửi)
            const dateFormatted = new Date(dateString).toLocaleString('vi-VN');
            const accordionHTML = `
                <div class="accordion-item">
                    <div class="accordion-header">
                        <button class="accordion-button show" type="button" onclick="toggleAccordion(this)">
                            <div class="accordion-title">
                                <div>
                                    <strong>${dateFormatted}</strong>
                                    <p class="venue-info" style="font-size: 12px; color: #ccc; margin-top: 5px;">${venue}</p>
                                </div>
                            </div>
                            <span class="arrow">▼</span>
                        </button>
                    </div>
                    <div class="accordion-collapse show" style="display: block;">
                        <div class="accordion-body">
                            <div class="ticket-types">
                                ${ticketsHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = accordionHTML;
            document.querySelectorAll('.ticket-buy-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const eventId = this.getAttribute('data-event-id');
                    // Bạn có thể dùng Mã Loại Chỗ (MaLoaiCho) để chọn loại vé cụ thể nếu cần
                    // const ticketTypeId = this.getAttribute('data-ticket-type-id'); 
                    
                    // Chuyển trang giống như nút "Mua vé ngay"
                    window.location.href = `/chonve/chonve.html?event_id=${eventId}`;
                });
            });
        });
}

function loadRelatedEvents() {
    fetch('/api/events')
        .then(res => res.json())
        .then(events => {
            const container = document.getElementById('relatedEventsGrid');
            if(!container) return;
            container.innerHTML = '';

            // Lấy 4 sự kiện đầu tiên làm gợi ý
            events.slice(0, 4).forEach(ev => {
                const price = ev.GiaKhoiDiem ? parseInt(ev.GiaKhoiDiem).toLocaleString() + 'đ' : 'Đang cập nhật';
                const date = new Date(ev.NgayGioBatDau).toLocaleDateString('vi-VN');
                
                const html = `
                    <div class="event-card" onclick="window.location.href='chuongtrinh.html?id=${ev.MaChuongTrinh}'">
                        <div class="event-image">
                            <img src="/${ev.Poster}" onerror="this.src='/trangchu/images/default.png'" style="width:100%; height: 150px; object-fit: cover;">
                        </div>
                        <div class="event-info-card" style="padding: 15px;">
                            <h3 style="font-size: 16px; margin-bottom: 5px;">${ev.TenChuongTrinh}</h3>
                            <p class="event-price" style="color: #2ecc71; font-weight: bold;">Từ ${price}</p>
                            <p class="event-date" style="font-size: 12px; color: #999;">${date}</p>
                        </div>
                    </div>
                `;
                container.innerHTML += html;
            });
        });
}

// Hàm Toggle Accordion đơn giản
window.toggleAccordion = function(btn) {
    const collapseDiv = btn.parentElement.nextElementSibling;
    const isShown = collapseDiv.style.display === 'block';
    
    if (isShown) {
        collapseDiv.style.display = 'none';
        btn.classList.add('collapsed');
        btn.querySelector('.arrow').style.transform = 'rotate(0deg)';
    } else {
        collapseDiv.style.display = 'block';
        btn.classList.remove('collapsed');
        btn.querySelector('.arrow').style.transform = 'rotate(180deg)';
    }
}











