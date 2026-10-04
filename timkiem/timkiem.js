document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy tham số từ URL khi vừa vào trang
    const urlParams = new URLSearchParams(window.location.search);
    const initialKeyword = urlParams.get('keyword') || '';
    
    // Điền từ khóa vào ô input nếu có sẵn trên URL
    const input = document.getElementById('pageSearchInput');
    if(input) input.value = initialKeyword;

    // Cập nhật bộ lọc ban đầu
    currentFilter.keyword = initialKeyword;

    // 2. Gọi hàm tìm kiếm lần đầu
    fetchEvents();

    // 3. Xử lý sự kiện: Bấm nút "Tìm kiếm"
    const searchBtn = document.getElementById('pageSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleMainSearch);
    }

    // 4. Xử lý sự kiện: Nhấn phím "Enter" trong ô input
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleMainSearch();
        });
    }

    // 5. Khởi tạo giao diện Bộ lọc (Popup & Date Picker)
    setupFilterUI();
    setupDatePicker(); // <--- KHỞI TẠO LỊCH MỚI
});

// --- BIẾN TOÀN CỤC LƯU TRẠNG THÁI ---
let currentFilter = {
    keyword: '',
    location: 'Toàn quốc',
    categoryId: null,
    dateFrom: null, // YYYY-MM-DD
    dateTo: null     // YYYY-MM-DD
};

// --- HÀM XỬ LÝ KHI BẤM TÌM KIẾM (QUAN TRỌNG) ---
function handleMainSearch() {
    const input = document.getElementById('pageSearchInput');
    const newKeyword = input.value.trim(); // Lấy giá trị từ ô nhập

    // 1. Reset UI bộ lọc về mặc định (Bao gồm cả lịch)
    resetFilterUI();
    resetDateUI(); 

    // 2. Cập nhật biến bộ lọc (Chỉ giữ lại Keyword, còn lại về mặc định)
    currentFilter = {
        keyword: newKeyword,
        location: 'Toàn quốc',
        categoryId: null,
        dateFrom: null,
        dateTo: null
    };

    // 3. Gọi API tìm kiếm
    fetchEvents();
}

// --- HÀM GỌI API & RENDER KẾT QUẢ ---
function fetchEvents(filterOverrides = {}) {
    // Cập nhật filter nếu có thay đổi từ Popup (ghi đè)
    currentFilter = { ...currentFilter, ...filterOverrides };
    
    // Cập nhật tiêu đề hiển thị
    const title = document.getElementById('searchTitle');
    if(title) title.innerHTML = `Kết quả tìm kiếm: "${currentFilter.keyword}"`;

    // --- CẬP NHẬT URL TRÊN TRÌNH DUYỆT (Giúp F5 không mất) ---
    const newUrl = new URL(window.location);
    if(currentFilter.keyword) newUrl.searchParams.set('keyword', currentFilter.keyword);
    else newUrl.searchParams.delete('keyword');
    window.history.pushState({}, '', newUrl);

    // Chuẩn bị tham số gọi Server
    const params = new URLSearchParams();
    if(currentFilter.keyword) params.append('keyword', currentFilter.keyword);
    if(currentFilter.location && currentFilter.location !== 'Toàn quốc') params.append('location', currentFilter.location);
    if(currentFilter.categoryId) params.append('category', currentFilter.categoryId);
    // THÊM THAM SỐ LỌC NGÀY
    if(currentFilter.dateFrom) params.append('dateFrom', currentFilter.dateFrom);
    if(currentFilter.dateTo) params.append('dateTo', currentFilter.dateTo);


    // Hiển thị trạng thái đang tải
    const grid = document.getElementById('resultsGrid');
    if(grid) grid.innerHTML = '<p style="text-align:center; width:100%; color:#aaa; margin-top:20px;">Đang tải dữ liệu...</p>';

    // GỌI API SERVER
    fetch(`http://localhost:3000/api/events?${params.toString()}`)
        .then(res => res.json())
        .then(events => {
            if(!grid) return;
            grid.innerHTML = '';
            
            if (events.length === 0) {
                grid.innerHTML = '<p style="text-align:center; width:100%; margin-top:20px;">Không tìm thấy sự kiện nào phù hợp.</p>';
                return;
            }

            // Render từng thẻ sự kiện
            events.forEach(ev => {
                const price = ev.GiaKhoiDiem ? parseInt(ev.GiaKhoiDiem).toLocaleString() + 'đ' : 'Đang cập nhật';
                const date = new Date(ev.NgayGioBatDau).toLocaleDateString('vi-VN');
                const posterPath = `/${ev.Poster}`;
                
                const html = `
                    <div class="event-card" onclick="window.location.href='/chuongtrinh/chuongtrinh.html?id=${ev.MaChuongTrinh}'">
                        <div class="event-image">
                            <img src="${posterPath}" alt="${ev.TenChuongTrinh}" onerror="this.src='/trangchu/images/default.png'" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                        <div class="event-info">
                            <div class="event-title">${ev.TenChuongTrinh}</div>
                            <div class="event-price">${price}</div>
                            <div class="event-date">📅 ${date} - ${ev.DiaDiem}</div>
                        </div>
                    </div>
                `;
                grid.innerHTML += html;
            });
        })
        .catch(err => {
            console.error(err);
            if(grid) grid.innerHTML = '<p style="text-align:center; width:100%; color:red;">Lỗi kết nối Server.</p>';
        });
}

// --- HÀM RESET GIAO DIỆN BỘ LỌC CHUNG (Location, Category) ---
function resetFilterUI() {
    // Reset Radio Vị trí về "Toàn quốc"
    const defaultLoc = document.querySelector('input[name="location"][value="Toàn quốc"]');
    if(defaultLoc) defaultLoc.checked = true;

    // Bỏ chọn tất cả các Tag thể loại
    document.querySelectorAll('.tag-choice').forEach(t => t.classList.remove('selected'));
}

// --- LOGIC POPUP BỘ LỌC (FILTER UI) ---
function setupFilterUI() {
    const filterBtn = document.getElementById('openFilterBtn');
    const popup = document.getElementById('filterPopup');
    const applyBtn = document.getElementById('applyFilterBtn');
    const resetBtn = document.getElementById('resetFilterBtn');
    
    // 1. Bật/Tắt Popup
    if(filterBtn && popup) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            popup.classList.toggle('show');
            document.getElementById('datePopup')?.classList.remove('show'); // Đóng popup lịch
        });

        document.addEventListener('click', (e) => {
            if (popup && !filterBtn.contains(e.target) && !popup.contains(e.target)) {
                popup.classList.remove('show');
            }
        });
    }

    // 2. Chọn Thể loại (Tag)
    const tags = document.querySelectorAll('.tag-choice');
    tags.forEach(tag => {
        tag.addEventListener('click', function() {
            tags.forEach(t => t.classList.remove('selected')); 
            this.classList.add('selected');
        });
    });

    // 3. Nút ÁP DỤNG (Apply)
    if(applyBtn) {
        applyBtn.addEventListener('click', () => {
            // Lấy Vị trí
            const locRadio = document.querySelector('input[name="location"]:checked');
            const location = locRadio ? locRadio.value : 'Toàn quốc';

            // Lấy Thể loại
            const selectedTag = document.querySelector('.tag-choice.selected');
            const catId = selectedTag ? selectedTag.getAttribute('data-id') : null;
            const catName = selectedTag ? selectedTag.textContent : null;

            // Hiển thị ra ngoài giao diện (Các tag xanh xanh)
            updateActiveTags(location, catName);

            // Gọi API lọc (Kết hợp Keyword hiện tại + Filter mới)
            fetchEvents({ location, categoryId: catId });

            // Đóng popup
            popup.classList.remove('show');
        });
    }

    // 4. Nút THIẾT LẬP LẠI (Reset trong Popup)
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetFilterUI(); // Reset vị trí và thể loại
            
            // Giữ lại keyword đang nhập trong ô input, chỉ reset các bộ lọc khác
            const input = document.getElementById('pageSearchInput');
            const kw = input ? input.value : '';

            // Chỉ reset location và category, giữ lại date filter hiện tại
            currentFilter = { 
                keyword: kw, 
                location: 'Toàn quốc', 
                categoryId: null,
                dateFrom: currentFilter.dateFrom,
                dateTo: currentFilter.dateTo
            };
            
            // Cập nhật lại Active Tags (chỉ còn tag Ngày nếu có)
            updateActiveTags('Toàn quốc', null);

            fetchEvents();
            
            popup.classList.remove('show');
        });
    }
}

// Hàm cập nhật các tag lọc đang hoạt động
function updateActiveTags(location, categoryName) {
    const activeTagsDiv = document.getElementById('activeTags');
    if(!activeTagsDiv) return;

    // 1. Reset
    activeTagsDiv.innerHTML = '';
    
    // 2. Thêm Tag Thể loại
    if(categoryName) activeTagsDiv.innerHTML += `<span class="active-tag-display">${categoryName}</span>`;
    
    // 3. Thêm Tag Vị trí
    if(location && location !== 'Toàn quốc') activeTagsDiv.innerHTML += `<span class="active-tag-display">${location}</span>`;

    // 4. Thêm Tag Ngày (Nếu đang áp dụng)
    const dateDisplay = document.getElementById('dateDisplay')?.textContent;
    if(dateDisplay && dateDisplay !== 'Tất cả các ngày') {
        activeTagsDiv.innerHTML += `<span class="active-tag-display">${dateDisplay}</span>`;
    }
}

// ==========================================================
// --- LOGIC DATE PICKER (LỌC THEO NGÀY) ---
// ==========================================================

// --- Khởi tạo Ngày theo thời gian thực ---
const todayReal = new Date();
todayReal.setDate(1); // Đặt về ngày 1 để dễ dàng thao tác chuyển tháng
todayReal.setHours(0, 0, 0, 0);

const nextMonthReal = new Date(todayReal);
nextMonthReal.setMonth(todayReal.getMonth() + 1);

let dateState = {
    start: null, // Ngày bắt đầu đã chọn (Date object)
    end: null,   // Ngày kết thúc đã chọn (Date object)
    currentMonth1: todayReal,      // Tháng hiện tại
    currentMonth2: nextMonthReal   // Tháng tiếp theo
};

// Hàm chuyển đổi Date object thành chuỗi YYYY-MM-DD
function formatDateToSQL(date) {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Hàm render lịch
function renderCalendar(month, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    // getDay() trả về 0 cho CN, 1 cho T2. Ta cần 0 cho T2.
    const startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // 0=T2, 6=CN

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt về đầu ngày để so sánh

    // Thêm các ô trống (empty days)
    for (let i = 0; i < startDayOfWeek; i++) {
        grid.innerHTML += `<div class="day empty"></div>`;
    }

    // Thêm các ngày trong tháng
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, monthIndex, i);
        date.setHours(0, 0, 0, 0);
        
        let classes = 'day';
        
        // Kiểm tra ngày hôm nay
        if (date.getTime() === today.getTime()) {
            classes += ' today';
        }
        
        // Kiểm tra ngày được chọn
        const isStart = dateState.start && date.getTime() === dateState.start.getTime();
        const isEnd = dateState.end && date.getTime() === dateState.end.getTime();
        
        if (isStart) {
            classes += ' selected-start';
        } 
        if (isEnd) {
            classes += ' selected-end';
        }
        
        // Kiểm tra khoảng ngày (chỉ khi đã chọn cả start và end)
        if (dateState.start && dateState.end) {
             if (date.getTime() > dateState.start.getTime() && 
                 date.getTime() < dateState.end.getTime()) {
                classes += ' in-range';
            }
        }

        // Nếu start = end, chỉ cần 1 class
        if (isStart && isEnd) {
             classes = classes.replace('in-range', '').replace('selected-start', 'selected-start selected-end');
        }

        grid.innerHTML += `<div class="${classes.trim()}" data-date="${formatDateToSQL(date)}">${i}</div>`;
    }

    // Gắn sự kiện click cho các ngày
    grid.querySelectorAll('.day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', handleDateSelect);
    });
}

// Hàm xử lý khi click vào một ngày
function handleDateSelect(e) {
    // Ngăn chặn sự kiện nổi bọt để tránh kích hoạt document click handler
    e.stopPropagation();

    const selectedDateStr = e.target.getAttribute('data-date');
    const selectedDate = new Date(selectedDateStr);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Nếu chưa chọn ngày bắt đầu HOẶC đã chọn đủ 2 ngày (chọn khoảng mới)
    if (!dateState.start || (dateState.start && dateState.end)) {
        // Reset và chọn ngày bắt đầu mới
        dateState.start = selectedDate;
        dateState.end = null;
    } 
    // Nếu đã chọn ngày bắt đầu, và đang chọn ngày kết thúc
    else if (dateState.start && !dateState.end) {
        if (selectedDate.getTime() < dateState.start.getTime()) {
            // Nếu ngày chọn sau nhỏ hơn ngày bắt đầu, đổi chỗ
            dateState.end = dateState.start;
            dateState.start = selectedDate;
        } else if (selectedDate.getTime() === dateState.start.getTime()) {
            // Nếu chọn lại cùng 1 ngày, hủy cả 2 (chọn lại chính nó sẽ là start, end=null)
            dateState.start = null;
            dateState.end = null;
        } else {
            // Chọn ngày kết thúc hợp lệ
            dateState.end = selectedDate;
        }
    }
    
    // Bỏ chọn tab quick filter
    document.querySelectorAll('.quick-tab').forEach(t => t.classList.remove('selected'));
    
    // Kích hoạt nút Áp dụng: CHỈ KÍCH HOẠT KHI dateState.start CÓ GIÁ TRỊ
    const applyBtn = document.getElementById('applyDateBtn');
    if (applyBtn) {
        applyBtn.classList.toggle('disabled', !dateState.start);
    }
    
    renderAllCalendars();
}

// Hàm render cả 2 tháng
function renderAllCalendars() {
    // Cập nhật tiêu đề
    document.getElementById('month1Title').textContent = new Date(dateState.currentMonth1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    document.getElementById('month2Title').textContent = new Date(dateState.currentMonth2).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    
    renderCalendar(dateState.currentMonth1, 'month1Grid');
    renderCalendar(dateState.currentMonth2, 'month2Grid');
}

// Hàm chuyển tháng (Chuyển tiếp/lùi)

window.changeMonth = function(delta, e) { // <-- THÊM THAM SỐ e
    if (e) e.stopPropagation(); // <-- NGĂN CHẶN NỔI BỌT (FIX LỖI)

    // Đảm bảo không thay đổi giá trị của đối tượng Date cũ (tránh lỗi tham chiếu)
    dateState.currentMonth1 = new Date(dateState.currentMonth1);
    dateState.currentMonth2 = new Date(dateState.currentMonth2);

    dateState.currentMonth1.setMonth(dateState.currentMonth1.getMonth() + delta);
    dateState.currentMonth2.setMonth(dateState.currentMonth2.getMonth() + delta);

    // Xóa chọn nếu ngày được chọn nằm ngoài phạm vi 2 tháng mới
    if (dateState.start) {
        const startTimestamp = dateState.start.getTime();
        const endTimestamp = dateState.end ? dateState.end.getTime() : startTimestamp;
        
        const firstDayM1 = new Date(dateState.currentMonth1.getFullYear(), dateState.currentMonth1.getMonth(), 1).getTime();
        const lastDayM2 = new Date(dateState.currentMonth2.getFullYear(), dateState.currentMonth2.getMonth() + 1, 0).getTime();
        
        // Nếu ngày bắt đầu hoặc ngày kết thúc nằm ngoài phạm vi 2 tháng mới
        if (endTimestamp < firstDayM1 || startTimestamp > lastDayM2) {
             dateState.start = null;
             dateState.end = null;
             document.getElementById('applyDateBtn')?.classList.add('disabled');
        }
    }
    
    renderAllCalendars();
};


// Hàm reset trạng thái lịch
function resetDateUI() {
    // Lấy lại tháng hiện tại (thời gian thực) khi reset
    const todayReset = new Date();
    todayReset.setDate(1);
    todayReset.setHours(0, 0, 0, 0);

    const nextMonthReset = new Date(todayReset);
    nextMonthReset.setMonth(todayReset.getMonth() + 1);
    
    dateState.start = null;
    dateState.end = null;
    dateState.currentMonth1 = todayReset; 
    dateState.currentMonth2 = nextMonthReset;
    
    renderAllCalendars();
    
    // Reset quick filter tab
    document.querySelectorAll('.quick-tab').forEach(t => t.classList.remove('selected'));
    document.querySelector('.quick-tab[data-date-range="all"]')?.classList.add('selected');
    
    // Reset hiển thị ngoài
    document.getElementById('dateDisplay').textContent = 'Tất cả các ngày';
    document.getElementById('applyDateBtn')?.classList.add('disabled');
}

// Hàm xử lý quick filter (Hôm nay, ngày mai...)
function handleQuickFilter(range) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset trước
    dateState.start = null;
    dateState.end = null;
    
    if (range === 'all') {
        // Giữ nguyên null
    } else if (range === 'today') {
        dateState.start = today;
        dateState.end = today;
    } else if (range === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        dateState.start = tomorrow;
        dateState.end = tomorrow;
    } else if (range === 'weekend') {
        let sat = new Date(today);
        // getDay(): 0 (CN) -> 6 (T7). Ta muốn T7 gần nhất.
        const dayOfWeek = today.getDay(); 
        
        if (dayOfWeek === 0) { // CN
            // Tính thứ 7 tuần này
            sat.setDate(today.getDate() - 1); 
        } else if (dayOfWeek !== 6) { // T2 -> T6
             // Tính thứ 7 tuần này
             sat.setDate(today.getDate() + (6 - dayOfWeek)); 
        }
        // Nếu hôm nay là thứ 7, sat = today
        
        dateState.start = sat;
        dateState.end = new Date(sat);
        dateState.end.setDate(sat.getDate() + 1); // Chủ Nhật
    } else if (range === 'month') {
        dateState.start = new Date(today.getFullYear(), today.getMonth(), 1);
        dateState.end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Ngày cuối tháng
    }

    // Cập nhật UI
    document.querySelectorAll('.quick-tab').forEach(t => t.classList.remove('selected'));
    document.querySelector(`.quick-tab[data-date-range="${range}"]`)?.classList.add('selected');

    // Kích hoạt nút Áp dụng
    const applyBtn = document.getElementById('applyDateBtn');
    if (applyBtn) {
        applyBtn.classList.toggle('disabled', range === 'all');
    }

    // Cập nhật 2 tháng hiển thị
    resetDateUI(); // Reset về tháng hiện tại
    if (dateState.start) {
        // Đặt lịch hiển thị về tháng của ngày bắt đầu đã chọn
        const selectedMonth1 = new Date(dateState.start.getFullYear(), dateState.start.getMonth(), 1);
        const selectedMonth2 = new Date(selectedMonth1);
        selectedMonth2.setMonth(selectedMonth1.getMonth() + 1);
        
        dateState.currentMonth1 = selectedMonth1;
        dateState.currentMonth2 = selectedMonth2;
    }
    
    renderAllCalendars();
}


// Hàm khởi tạo Date Picker
function setupDatePicker() {
    const dateBtn = document.getElementById('dateFilterBtn');
    const popup = document.getElementById('datePopup');
    const applyBtn = document.getElementById('applyDateBtn');
    const resetBtn = document.getElementById('resetDateBtn');
    
    // 1. Bật/Tắt Popup
    if(dateBtn && popup) {
        dateBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            popup.classList.toggle('show');
            document.getElementById('filterPopup')?.classList.remove('show'); // Đóng popup lọc kia
        });

        // Xử lý sự kiện đóng khi click ra ngoài popup
        document.addEventListener('click', (e) => {
            // Chỉ đóng popup nếu click nằm ngoài cả dateBtn và datePopup
            if (popup && !dateBtn.contains(e.target) && !popup.contains(e.target)) {
                popup.classList.remove('show');
            }
        });
        
        // Ngăn chặn đóng popup khi click vào bất cứ đâu TRONG popup (Chỉ áp dụng cho Popup Lọc chung)
        // -> Logic này đã được xử lý bằng cách kiểm tra `!popup.contains(e.target)` ở trên.
    }

    // 2. Render lịch ban đầu
    renderAllCalendars();
    document.getElementById('applyDateBtn')?.classList.add('disabled');

    // 3. Xử lý Quick Filters
    document.querySelectorAll('.quick-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.stopPropagation(); // Ngăn chặn đóng popup khi click vào quick filter
            handleQuickFilter(this.getAttribute('data-date-range'));
        });
    });

    // 4. Nút ÁP DỤNG
    if(applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn chặn đóng popup khi click vào nút áp dụng

            if (applyBtn.classList.contains('disabled')) return;
            
            // Lấy giá trị cuối cùng từ dateState
            const dateFromStr = formatDateToSQL(dateState.start);
            // Dùng dateToStr là ngày sau ngày kết thúc một ngày, để WHERE NgayGioBatDau < dateToStr hoạt động
            const dateToStr = dateState.end ? formatDateToSQL(new Date(dateState.end.getTime() + 86400000)) : null;

            // Cập nhật hiển thị ngoài
            const dateDisplay = document.getElementById('dateDisplay');
            if (dateState.start) {
                 const start = dateState.start.toLocaleDateString('vi-VN');
                 const end = dateState.end ? dateState.end.toLocaleDateString('vi-VN') : null;
                 
                 // Nếu chỉ chọn 1 ngày (start=end)
                 if (!dateState.end || dateState.start.getTime() === dateState.end.getTime()) {
                     dateDisplay.textContent = start;
                 } else {
                     dateDisplay.textContent = `${start} - ${end}`;
                 }
            } else {
                 dateDisplay.textContent = 'Tất cả các ngày';
            }

            // Gọi API lọc
            fetchEvents({ dateFrom: dateFromStr, dateTo: dateToStr });
            
            // Cập nhật lại Active Tags (để hiển thị tag ngày)
            const locRadio = document.querySelector('input[name="location"]:checked');
            const location = locRadio ? locRadio.value : 'Toàn quốc';
            const selectedTag = document.querySelector('.tag-choice.selected');
            const catName = selectedTag ? selectedTag.textContent : null;
            updateActiveTags(location, catName);
            
            // Đóng popup sau khi áp dụng thành công
            popup.classList.remove('show');
        });
    }

    // 5. Nút THIẾT LẬP LẠI
    if(resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn chặn đóng popup khi click vào nút thiết lập lại
            
            resetDateUI();
            
            // Đồng bộ với bộ lọc chung
            fetchEvents({ 
                dateFrom: null, 
                dateTo: null 
            });
            
            // Cập nhật lại Active Tags (để xóa tag ngày)
            const locRadio = document.querySelector('input[name="location"]:checked');
            const location = locRadio ? locRadio.value : 'Toàn quốc';
            const selectedTag = document.querySelector('.tag-choice.selected');
            const catName = selectedTag ? selectedTag.textContent : null;
            updateActiveTags(location, catName);
            
            // Đóng popup sau khi thiết lập lại
            popup.classList.remove('show');
        });
    }
}