// phuongthucthanhtoan.js (FIXED: Dynamic Methods & Button Click)

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/api/';
    const TICKET_DURATION = 600; // 10 phút
    const backLink = document.getElementById('backLink');


    const exitModal = document.getElementById('confirmExitModal');
    const stayBtn = document.getElementById('stayBtn');
    const exitBtn = document.getElementById('exitBtn');


    // Lấy dữ liệu cần thiết từ Storage
    const selectedTicketsJson = sessionStorage.getItem('selectedTickets');
    const currentEventId = sessionStorage.getItem('currentEventId');
    const userJson = sessionStorage.getItem('currentUser');

    const CHECK_INTERVAL = 2000; // 2 giây kiểm tra 1 lần

    
    const BANK_ACCOUNT_NO = '0966980458'; 
    const BANK_CODE = 'MB';
    if (!selectedTicketsJson || !currentEventId || !userJson) {
        alert("Phiên giao dịch hết hạn hoặc chưa chọn vé. Vui lòng đặt lại.");
        window.location.href = '/trangchu/trangchu1.html';
        return;
    }


    // =====
    // Logic mới: Gán sự kiện cho modal
    if (stayBtn) {
        stayBtn.addEventListener('click', hideExitModal);
    }
    if (exitBtn) {
        exitBtn.addEventListener('click', cancelOrderAndExit);
    }
    // Logic: Đóng modal khi click ra ngoài overlay
    if (exitModal) {
        exitModal.addEventListener('click', (e) => {
            if (e.target.id === 'confirmExitModal') hideExitModal();
        });
    }
    //======



    const selectedTickets = JSON.parse(selectedTicketsJson);
    const currentUser = JSON.parse(userJson);
    const totalAmount = selectedTickets.reduce((sum, t) => sum + (t.price * t.quantity), 0);

    let orderData = {}; 
    
    // Gán ID cho các container chính (Đã fix lỗi DOM bằng defensive check)
    const timerDisplay = document.getElementById('countdownTimer');
    const ticketListContainer = document.getElementById('ticketListContainer');
    const subtotalDisplay = document.getElementById('subtotalDisplay');
    const finalPriceDisplay = document.getElementById('finalPriceDisplay');
    const confirmCheckoutBtn = document.getElementById('confirmCheckoutBtn');
    const paymentMethodsContainer = document.getElementById('paymentMethodsContainer');


    // === LOGIC A: ĐỒNG HỒ ĐẾM NGƯỢC ===
    function startCountdown(duration) {
        let timer = duration;
        const interval = setInterval(() => {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            if (timerDisplay) { timerDisplay.textContent = minutes + ":" + seconds; }
            if (timer < 180 && timerDisplay) { timerDisplay.style.color = '#ff6b6b'; }

            if (--timer < 0) {
                clearInterval(interval);
                alert("Hết thời gian giữ chỗ! Vui lòng đặt lại vé.");
                sessionStorage.removeItem('selectedTickets');
                window.location.href = `/chuongtrinh/chuongtrinh.html?id=${currentEventId}`; 
            }
        }, 1000);
        // backLink.href = `/chuongtrinh/chuongtrinh.html?id=${currentEventId}`;
    }
    
    // === LOGIC B: CẬP NHẬT GIAO DIỆN TÓM TẮT ===
    function updateSummaryUI(eventDetails) {
        // [Defensive Check]
        if (document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').textContent = currentUser.email;
        if (document.getElementById('summaryEventName')) document.getElementById('summaryEventName').textContent = eventDetails.TenChuongTrinh;
        
        // Render danh sách vé đã chọn
        ticketListContainer.innerHTML = '';
        selectedTickets.forEach(t => {
            const row = document.createElement('div');
            row.className = 'ticket-row';
            const ticketName = t.name || `Loại vé ${t.ticket_type_id}`; 
            
            row.innerHTML = `
                <div class="ticket-type-details">
                    <span class="ticket-name">${ticketName}</span>
                    <span class="ticket-price" style="font-size:12px;">${t.price.toLocaleString('vi-VN')} đ/vé</span>
                </div>
                <span class="ticket-quantity">${t.quantity}</span>
            `;
            ticketListContainer.appendChild(row);
        });

        // Cập nhật tổng tiền
        if (subtotalDisplay) subtotalDisplay.textContent = totalAmount.toLocaleString('vi-VN') + ' đ';
        if (finalPriceDisplay) finalPriceDisplay.textContent = totalAmount.toLocaleString('vi-VN') + ' đ';
        
        // Cập nhật link Chọn lại vé
        const editLink = document.getElementById('editTicketsLink');
        if (editLink) editLink.href = `/chonve/chonve.html?event_id=${currentEventId}`;
    }

    // === LOGIC C: RENDER PHƯƠNG THỨC THANH TOÁN (DYNAMIC) ===
    function renderPaymentMethods(methods) {
        if (!paymentMethodsContainer) return;
        paymentMethodsContainer.innerHTML = '';

        methods.forEach((method, index) => {
            // Tạm thời dùng MaCode làm tên file logo (Ví dụ: vnpay.png)
            const logoPath = `/phuongthucthanhtoan/img/${method.MaCode.toLowerCase()}.png`; 
            
            const methodHTML = `
                <li class="payment-method ${index === 0 ? 'selected' : ''}" data-method="${method.MaCode}">
                    <input type="radio" name="payment-method" id="${method.MaCode}" value="${method.MaPhuongThuc}" ${index === 0 ? 'checked' : ''}>
                    <label for="${method.MaCode}">
                        <span class="method-logo"><img src="${logoPath}" alt="" style="width: 40px;"></span>
                        <span class="method-name">${method.TenPhuongThuc}</span>
                    </label>
                </li>
            `;
            paymentMethodsContainer.innerHTML += methodHTML;
        });

        // Gán listener cho việc chọn phương thức
        paymentMethodsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.payment-method');
            if (option) {
                document.querySelectorAll('.payment-method').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                const radio = option.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
        });
    }
    

    // === LOGIC D: KHỞI TẠO VÀ THANH TOÁN ===
    
    function initializeOrder() {
        // Fetch 3 API cùng lúc: Event Details, Payment Methods, và Khởi tạo Order
        Promise.all([
            fetch(`${API_BASE}events/${currentEventId}`).then(res => res.json()),
            fetch(`${API_BASE}payment/methods`).then(res => res.json())
        ])
        .then(([eventDetails, paymentMethods]) => {
            if (!eventDetails) throw new Error("Event details not found");
            
            // 1. Cập nhật UI
            updateSummaryUI(eventDetails);
            renderPaymentMethods(paymentMethods); // Render methods dynamic
            
            // 2. Gọi API Khởi tạo Đơn hàng (Giữ chỗ)
            return fetch(`${API_BASE}order/initialize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    selectedTickets: selectedTickets,
                    grandTotal: totalAmount
                })
            });
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                orderData = data.order; 
                startCountdown(TICKET_DURATION); 
                confirmCheckoutBtn.onclick = handlePayment; // Gán sự kiện nút Thanh toán

                if (backLink) {
                // Gỡ bỏ href mặc định để xử lý bằng JavaScript
                backLink.removeAttribute('href'); 
                backLink.addEventListener('click', function(e) {
                    e.preventDefault(); 
                    showExitModal(); // Hiển thị modal xác nhận
                });


            }
            } else {
                alert('Lỗi khởi tạo đơn hàng: ' + data.message);
                window.location.href = `/chuongtrinh/chuongtrinh.html?id=${currentEventId}`;
            }
        })
        .catch(err => {
            console.error('Lỗi khởi tạo:', err);
            alert('Lỗi hệ thống khi khởi tạo đơn hàng. Vui lòng thử lại.');
        });
    }

function generateVietQRLink(amount, content) {
    const template = 'qr_only'; 
    
    // 🔥 Cần mã hóa biến 'content' bằng encodeURIComponent()
    const encodedContent = encodeURIComponent(content); 
    
    // Sửa lại dòng return để dùng encodedContent
    return `https://img.vietqr.io/image/${BANK_CODE}-${BANK_ACCOUNT_NO}-${template}.png?amount=${amount}&addInfo=${encodedContent}`;
}


function handlePayment() {
    const selectedMethodElement = document.querySelector('.payment-method.selected');
    const selectedRadio = selectedMethodElement ? selectedMethodElement.querySelector('input:checked') : null;

    if (!selectedRadio) {
        return alert("Vui lòng chọn một phương thức thanh toán.");
    }

    const paymentMethodId = selectedRadio.value; // Lấy ID phương thức thanh toán
    const transferContent = orderData.code;
    const finalAmount = orderData.total;

    // TẠO QR-CODE LINK
    const qrCodeLink = generateVietQRLink(finalAmount, transferContent);
    const selectedMethodName = selectedMethodElement.querySelector('.method-name').textContent; 
    
    // Khởi tạo Modal HTML (Thêm nút "Tôi đã chuyển khoản xong")
    const paymentModalHTML = `
        <div class="payment-modal-overlay" id="processingModal" onclick="this.remove()">
            <div class="payment-modal-content" onclick="event.stopPropagation()">
                <h2>Thanh toán qua ${selectedMethodName}</h2>
                <p>Mã đơn hàng: ${orderData.code}</p>
                <p>Tổng tiền: <span id="modalTotalAmount">${orderData.total.toLocaleString('vi-VN')} đ</span></p>
                <p style="color:red; font-weight: bold;">Nội dung CK: <span id="modalTransferContent">${transferContent}</span></p>
                
                <img src="${qrCodeLink}" alt="QR Code Payment" style="width: 250px; margin: 15px auto; display: block; border: 1px solid #ddd;">
                
                <p class="terms-text" style="color:#00c853; font-weight: bold;">Sau khi chuyển khoản thành công, vui lòng bấm nút xác nhận bên dưới!</p>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="cancelPaymentBtn" style="flex: 1; padding:10px; background:#f44336; color:white; border:none; border-radius:5px; cursor: pointer;">
                        Hủy và Quay lại
                    </button>
                    <button id="confirmPaidBtn" style="flex: 1; padding:10px; background:#00c853; color:white; border:none; border-radius:5px; cursor: pointer; font-weight: bold;">
                        Tôi đã chuyển khoản
                    </button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', paymentModalHTML);

    // Xử lý nút Hủy
    document.getElementById('cancelPaymentBtn').onclick = () => {
        document.getElementById('processingModal').remove();
    };

    // Xử lý nút Đã chuyển khoản
    document.getElementById('confirmPaidBtn').onclick = () => {
        confirmPaymentRecord(paymentMethodId, orderData.order_id, finalAmount);
    };
}




// Hàm mới: TẠO BẢN GHI THANH TOÁN (Trạng thái ChoXuLy)
window.confirmPaymentRecord = async function(paymentMethodId, orderId, soTien) {
    
    const processingModal = document.getElementById('processingModal');
    if (processingModal) {
         processingModal.style.display = 'none'; // Ẩn modal hiện tại
    }

    // Tạm thời hiển thị thông báo đang xử lý
    alert("Đang gửi yêu cầu xác nhận. Đơn hàng của bạn đã được chuyển đến Admin để xử lý thanh toán.");
    
    try {
        // GỌI API MỚI 3.5: LƯU BẢN GHI THANH TOÁN (ChoXuLy)
        const response = await fetch(`${API_BASE}payment/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                payment_method_id: paymentMethodId,
                soTien: soTien,
                maGiaoDich: 'CLIENT_CONFIRM_' + Date.now() // Mã giao dịch tạm thời
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            sessionStorage.removeItem('selectedTickets');
            sessionStorage.removeItem('currentEventId');

            alert("Yêu cầu thanh toán đã được ghi nhận. Admin sẽ xác nhận trong vòng 30 phút. Bạn sẽ được chuyển đến trang Vé của tôi.");
            // Chuyển hướng đến trang Vé của tôi (Trạng thái chờ)
            window.location.href = '/vecuatoi/vecuatoi.html?tab=ChoThanhToan'; 
        } else {
            alert("Lỗi lưu yêu cầu thanh toán: " + data.message);
            // Quay lại trang thanh toán
            window.location.reload(); 
        }

    } catch (error) {
        console.error("Lỗi hệ thống khi lưu yêu cầu thanh toán:", error);
        alert("Lỗi hệ thống! Vui lòng thử lại quá trình đặt vé.");
        window.location.reload(); 
    }
}


function showExitModal() {
    if (exitModal) exitModal.style.display = 'flex';
}

function hideExitModal() {
    if (exitModal) exitModal.style.display = 'none';
}


async function cancelOrderAndExit() {
    const orderId = orderData.order_id; 

    // 1. XÓA VĨNH VIỄN đơn hàng trên Server
    if (orderId) {
        try {
            // GỌI API DELETE MỚI
            const response = await fetch(`${API_BASE}orders/${orderId}`, {
                method: 'DELETE', // Thay đổi từ PUT sang DELETE
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (!data.success) {
                 console.warn("Lưu ý: Không thể xóa đơn hàng trên Server:", data.message);
            } else {
                 console.log("Đơn hàng đã được xóa vĩnh viễn.");
            }
        } catch (error) {
            console.error("Lỗi API khi xóa đơn hàng:", error);
        }
    }
    
    // 2. Xóa dữ liệu giữ chỗ và chuyển hướng
    sessionStorage.removeItem('selectedTickets');
    
    // Đã gán URL trở về ở logic A
    window.location.href = `/chuongtrinh/chuongtrinh.html?id=${currentEventId}`;
}

    initializeOrder();
});



