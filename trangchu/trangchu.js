

document.addEventListener('DOMContentLoaded', () => {
    loadMainSlider();
    // 1. Tải Sliders (Latest Events)
    // fetchAndRender('specialSliderGrid', null, 6, 'slider'); 
    fetchAndRender('trendingSliderGrid', null, 6, 'slider'); 

    // 2. Tải Grids chính (Lọc theo MaLoai và Latest)
    fetchAndRender('forYouGrid', null, 4, 'grid'); 
    fetchAndRender('nhacSongGrid', 1, 4, 'grid'); 
    fetchAndRender('sanKhauGrid', 2, 4, 'grid');
    fetchAndRender('khacGrid', 3, 4, 'grid');

    // 3. Khởi tạo logic Tab
    setupTabbedEvents(); 
    
    // 4. Khởi tạo logic Modal Auth
    setupAuthModal();
    setupSearch();
    setupNavLinks();
});


// === HÀM RENDER ĐA CHỨC NĂNG (GRID & SLIDER) ===
function fetchAndRender(containerId, categoryId, limit, renderType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p style="color:#aaa; text-align:center; width:100%; padding:20px;">Đang tải...</p>';

    // Tạo URL API
    let url = `http://localhost:3000/api/events?limit=${limit}`;
    if (categoryId) {
        url += `&category=${categoryId}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(events => {
            container.innerHTML = ''; 
            if (events.length === 0) {
                container.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">Chưa có sự kiện nào.</p>';
                return;
            }

            events.forEach(ev => {
                const price = ev.GiaKhoiDiem ? parseInt(ev.GiaKhoiDiem).toLocaleString() + 'đ' : 'Đang cập nhật';
                const date = new Date(ev.NgayGioBatDau).toLocaleDateString('vi-VN');
                const posterPath = `/${ev.Poster}`;
                
                let html = '';

                // Dạng Grid
                if (renderType === 'grid') {
                    html = `
                        <div class="event-card" onclick="window.location.href='/chuongtrinh/chuongtrinh.html?id=${ev.MaChuongTrinh}'">
                            <div class="event-image">
                                <img src="${posterPath}" alt="${ev.TenChuongTrinh}" onerror="this.src='/trangchu/images/default.png'" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div class="event-info">
                                <div class="event-title">${ev.TenChuongTrinh}</div>
                                <div class="event-price">Từ ${price}</div>
                                <div class="event-date">📅 ${date}</div>
                            </div>
                        </div>
                    `;
                } 
                // Dạng Slider
                else if (renderType === 'slider') {
                    html = `
                        <div class="special-card special-card-only" onclick="window.location.href='/chuongtrinh/chuongtrinh.html?id=${ev.MaChuongTrinh}'">
                             <img src="${posterPath}" alt="${ev.TenChuongTrinh}" onerror="this.src='/trangchu/images/default.png'" style="width:100%; height:350px; object-fit:cover;">
                        </div>
                    `;
                }
                
                container.innerHTML += html;
            });
        })
        .catch(err => {
            console.error(`Lỗi tải sự kiện cho ${containerId}:`, err);
            container.innerHTML = '<p style="color:red;padding:20px;width:100%;">🔴 Lỗi tải dữ liệu.</p>';
        });
}


// === HÀM XỬ LÝ LOGIC TAB ===
function setupTabbedEvents() {
    const tabs = document.querySelectorAll('.section-tabs .tab');
    const containerId = 'tabbedEventsGrid';
    
    // Tải dữ liệu mặc định cho tab đầu tiên (MaLoai=1)
    fetchAndRender(containerId, 1, 4, 'grid'); 

    tabs.forEach((tab) => {
        tab.addEventListener('click', function() {
            // Lấy MaLoai từ data-category
            const categoryToLoad = this.getAttribute('data-category'); 
            
            // Cập nhật trạng thái active của tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Gọi lại hàm render với tham số lọc mới
            fetchAndRender(containerId, categoryToLoad, 4, 'grid');
        });
    });
}

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





// slider===
// === HÀM TẢI VÀ RENDER SLIDER CHÍNH (Sự kiện gần nhất) ===
function loadMainSlider() {
    const slidesContainer = document.getElementById('slides');
    const dotsContainer = document.getElementById('mainSliderDots');
    
    if (!slidesContainer || !dotsContainer) return;

    // 1. Fetch 4 sự kiện gần nhất (Đã được lọc và sắp xếp trong server.js)
    fetch('http://localhost:3000/api/events?limit=3') 
        .then(res => res.json())
        .then(events => {
            if (!events || events.length === 0) {
                slidesContainer.innerHTML = '<div class="slide">Không có sự kiện gần nhất nào.</div>';
                return;
            }

            slidesContainer.innerHTML = '';
            dotsContainer.innerHTML = ''; 
            
            // 2. Render HTML động cho Slides và Dots
            events.forEach((ev, index) => {
                const posterPath = `/${ev.Poster}`;
                const slideHTML = `
                    <div class="slide" onclick="window.location.href='/chuongtrinh/chuongtrinh.html?id=${ev.MaChuongTrinh}'">
                        <img src="${posterPath}" alt="${ev.TenChuongTrinh}" onerror="this.src='/trangchu/images/default.png'">
                        <button>Xem chi tiết</button>
                    </div>
                `;
                slidesContainer.innerHTML += slideHTML;
                
                // Thêm Dot tương ứng
                const dotHTML = `<div class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
                dotsContainer.innerHTML += dotHTML;
            });
            
            // 3. Khởi tạo logic chuyển động sau khi DOM đã được tạo
            initializeMainSliderUI(events.length);
        })
        .catch(err => {
            console.error('Lỗi tải Main Slider:', err);
            slidesContainer.innerHTML = '<div class="slide" style="color:red;padding:20px;">Lỗi tải dữ liệu Slider.</div>';
        });
}



// === HÀM XỬ LÝ TÌM KIẾM ===
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    const performSearch = () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
            // CHUYỂN HƯỚNG SANG TRANG MỚI VỚI THAM SỐ URL
            window.location.href = `/timkiem/timkiem.html?keyword=${encodeURIComponent(keyword)}`;
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

// === HÀM XỬ LÝ NAV LINKS ===
function setupNavLinks() {
    const navLinks = document.querySelectorAll('.nav-category');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ <a> (chuyển về #)
            
            const categoryName = this.getAttribute('data-name');
            if (categoryName) {
                // Chuyển hướng sang trang tìm kiếm với từ khóa là tên danh mục
                window.location.href = `/timkiem/timkiem.html?keyword=${encodeURIComponent(categoryName)}`;
            }
        });
    });
}
// === LOGIC CHUYỂN ĐỘNG (Dựa trên code UI cũ của bạn) ===
function initializeMainSliderUI(totalSlides) {
    const slides = document.getElementById('slides');
    const dots = document.querySelectorAll('#mainSliderDots .dot');
    
    // Giả định: hiển thị 2 ảnh cùng lúc (50% view)
    const slidesPerView = 2; 
    
    // TÍNH TOÁN: Total Groups = 4 slides / 2 slides/view = 2 nhóm
    const totalGroups = Math.ceil(totalSlides / slidesPerView); 
    
    // Tỷ lệ dịch chuyển MỖI LẦN CLICK: 100% / 2 nhóm = 50%
    const groupMovePercentage = 100 / totalGroups; 
    
    let currentGroupIndex = 0; // Theo dõi chỉ số nhóm (0 hoặc 1)

    // Hàm cập nhật vị trí và dots
    function updateSlide() {
        // Áp dụng dịch chuyển chính xác 50% mỗi lần
        slides.style.transform = `translateX(-${currentGroupIndex * groupMovePercentage}%)`; 
        
        // Cập nhật dots active
        dots.forEach((dot, index) => {
             dot.classList.toggle('active', index === currentGroupIndex);
        });
    }

    // Hàm điều hướng
    window.moveSlide = function(direction) {
        let newIndex = currentGroupIndex + direction;

        // Xử lý Lặp lại (Looping)
        if (newIndex >= totalGroups) {
            newIndex = 0; // Chuyển về đầu
        } else if (newIndex < 0) {
            newIndex = totalGroups - 1 ; // Chuyển về cuối (Index 1)
        }

        currentGroupIndex = newIndex;
        updateSlide();
    }

    // Gán sự kiện cho dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentGroupIndex = index; 
            updateSlide();
        });
    });
    
    updateSlide(); 
}



