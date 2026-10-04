

// Hàm này được gọi khi Admin click vào nút Đăng xuất trên sidebar.
// Đảm bảo nút Đăng xuất trong admin-trangchu.html gọi đúng hàm này.

// (Các hàm khác như showSection giữ nguyên)
// ...
        
        // Hàm chuyển đổi các mục menu
        function showSection(sectionId, title) {
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

            // Tìm và thêm class 'active' cho menu item được click (trừ nút Đăng xuất)
            const activeMenuItem = document.querySelector(`.menu-item[onclick*="${sectionId}"]`);
            if (activeMenuItem) {
                activeMenuItem.classList.add('active');
            }
        }



