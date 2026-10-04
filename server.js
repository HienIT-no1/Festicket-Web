

// server.js 

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // Bắt buộc phải dùng bcrypt
const { randomUUID } = require('crypto'); // <-- CHỈ GIỮ DÒNG NÀY
const saltRounds = 10; 
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'furutehieuvip@gmail.com', 
        pass: 'sscboxptcycczios' 
    }
});
const app = express();


const fs = require('fs'); // Cần thêm thư viện fs (File System)



app.use(cors());
// Đặt giới hạn kích thước body cho JSON và URL-encoded data lên 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname)); 

// Kết nối DB
const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: '123456', database: 'VeSuKienDB', charset: 'utf8mb4' 
});
db.connect(err => {
    if (err) console.error('❌ Lỗi kết nối DB:', err);
    else console.log('✅ Đã kết nối MySQL!');
});



// ==================================================
// 1. AUTHENTICATION (Đăng ký & Đăng nhập)
// ==================================================

// API 1.1: ĐĂNG KÝ
// app.post('/api/register', (req, res) => {
//     const { email, hoTen, password } = req.body; 

//     bcrypt.hash(password, saltRounds, (err, hash) => {
//         if (err) return res.status(500).json({ success: false, message: 'Lỗi mã hóa mật khẩu.' });

//         const sql = `INSERT INTO NguoiMuaVe (Email, MatKhau, HoTen, TrangThaiXacThuc) VALUES (?, ?, ?, 1)`;
        
//         db.query(sql, [email, hash, hoTen], (err, result) => {
//             if (err && err.code === 'ER_DUP_ENTRY') {
//                 return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
//             }
//             if (err) return res.status(500).json({ success: false, message: 'Lỗi đăng ký.' });
            
//             res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
//         });
//     });
// });
function isValidEmailBackend(email) {
    // Regex nâng cao:
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/; 
    
    if (!emailRegex.test(email)) return false;
    
    // Kiểm tra dấu chấm ở đầu/cuối/liên tiếp phần tên (trước @)
    const localPart = email.split('@')[0];
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;

    return true;
}
app.post('/api/register', (req, res) => {
    const { email, hoTen, password } = req.body; 

    // BƯỚC MỚI: KIỂM TRA ĐỊNH DẠNG EMAIL TỪ SERVER
    if (!isValidEmailBackend(email)) {
        return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
    }
    if (!password || password.length < 6) {
         return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }


    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi mã hóa mật khẩu.' });

        const sql = `INSERT INTO NguoiMuaVe (Email, MatKhau, HoTen, TrangThaiXacThuc) VALUES (?, ?, ?, 1)`;
        
        db.query(sql, [email, hash, hoTen], (err, result) => {
            if (err && err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
            }
            if (err) {
                console.error("Lỗi SQL Đăng ký:", err);
                return res.status(500).json({ success: false, message: 'Lỗi đăng ký.' });
            }
            
            res.json({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
        });
    });
});

// API 1.2: ĐĂNG NHẬP (Đã cập nhật: Admin dùng mật khẩu không hash, User dùng bcrypt)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const adminSql = `SELECT MaQuanLy, MatKhau, HoTen, Email, VaiTro FROM NguoiQuanLy WHERE Email = ? AND TrangThai = 1`; 
    
    db.query(adminSql, [email], (err, adminResults) => {
        if (err) {
            console.error("Lỗi truy vấn Admin:", err);
            return res.status(500).json({ success: false, message: 'Lỗi Server.' });
        }

        if (adminResults.length > 0) {
            const user = adminResults[0];
            
            // So sánh mật khẩu Admin KHÔNG DÙNG HASH
            if (user.MatKhau === password) { 
                // CHỈ CHO PHÉP ADMIN CÓ VaiTro = 'Admin' VÀO MÀN HÌNH ADMIN
                if (user.VaiTro === 'Moderator') {
                     return res.json({ 
                        success: true, 
                        message: 'Đăng nhập Admin thành công!',
                        user: { 
                            id: user.MaQuanLy, 
                            hoTen: user.HoTen, 
                            email: user.Email,
                            role: user.VaiTro // <--- Lấy VaiTro từ DB (Giá trị sẽ là 'Admin')
                        }
                    });
                } else {
                    // Nếu là Moderator/Support, có thể xử lý khác, nhưng ở đây ta coi là không được phép vào trang chính
                    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập.' });
                }
            } else {
                return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
            }
        }

        // --- 2. KIỂM TRA TÀI KHOẢN USER THƯỜNG (NguoiMuaVe) ---
        // Nếu không phải Admin, tiếp tục kiểm tra bảng User thường (dùng bcrypt)
        const userSql = `SELECT MaNMV, MatKhau, HoTen, Email FROM NguoiMuaVe WHERE Email = ?`;
        
        db.query(userSql, [email], (err, userResults) => {
            if (err) {
                console.error("Lỗi truy vấn User:", err);
                return res.status(500).json({ success: false, message: 'Lỗi Server.' });
            }

            if (userResults.length === 0) {
                // Nếu không tìm thấy cả Admin và User thường
                return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
            }

            const user = userResults[0];
            
            // So sánh mật khẩu User thường DÙNG bcrypt
            bcrypt.compare(password, user.MatKhau, (err, isMatch) => {
                if (isMatch) {
                    res.json({ 
                        success: true, 
                        message: 'Đăng nhập thành công!',
                        user: { 
                            id: user.MaNMV, 
                            hoTen: user.HoTen, 
                            email: user.Email,
                            role: 'User' // <--- GÁN VAI TRÒ USER
                        }
                    });
                } else {
                    res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
                }
            });
        });
    });
});


// API 2.1: Lấy danh sách sự kiện (Tìm kiếm TOÀN DIỆN & Lọc theo Ngày)
app.get('/api/events', (req, res) => {
    const { category, keyword, location, dateFrom, dateTo } = req.query; // Đã thêm dateFrom & dateTo
    const limit = parseInt(req.query.limit) || 20;
    
    // Thêm JOIN LoaiChuongTrinh (lct) để tìm kiếm theo tên loại
    let sql = `
        SELECT 
            ct.MaChuongTrinh, 
            ct.TenChuongTrinh, 
            ct.Poster, 
            ct.NgayGioBatDau, 
            ct.DiaDiem,
            lct.TenLoai,       
            MIN(lcn.GiaVe) as GiaKhoiDiem
        FROM ChuongTrinh ct
        LEFT JOIN SoDoChoNgoi sd ON ct.MaChuongTrinh = sd.ChuongTrinhMaChuongTrinh
        LEFT JOIN LoaiChoNgoi lcn ON sd.MaSoDo = lcn.SoDoChoNgoiMaSoDo
        LEFT JOIN LoaiChuongTrinh lct ON ct.LoaiChuongTrinhMaLoai = lct.MaLoai 
        WHERE ct.TrangThai = 'DangBan' 
    `;
    let params = [];
    
    // Lọc: CHỈ LẤY CÁC SỰ KIỆN CHƯA DIỄN RA (Mặc định)
    // Nếu có dateFrom, ta sẽ dùng dateFrom để lọc, nếu không có dateFrom thì dùng NOW()
    if (!dateFrom) {
         sql += ` AND ct.NgayGioBatDau >= NOW() `;
    }


    // 1. Lọc theo Category ID (Nếu bấm từ menu/tab)
    if (category) {
        sql += ` AND ct.LoaiChuongTrinhMaLoai = ?`;
        params.push(category);
    }

    // 2. LỌC THEO NGÀY (MỚI)
    if (dateFrom) {
        // Ngày Bắt đầu (NgayGioBatDau >= dateFrom)
        sql += ` AND ct.NgayGioBatDau >= ?`;
        params.push(dateFrom);
    }
    
    if (dateTo) {
        // Ngày Kết thúc (NgayGioBatDau < dateTo)
        sql += ` AND ct.NgayGioBatDau < ?`; 
        params.push(dateTo);
    }

    // 3. TÌM KIẾM TỪ KHÓA
    if (keyword) {
        const kw = keyword.trim();
        const searchPattern = `%${kw}%`;

        // Sử dụng COLLATE utf8mb4_general_ci để so sánh KHÔNG phân biệt dấu
        sql += ` AND (
            ct.TenChuongTrinh COLLATE utf8mb4_general_ci LIKE ? 
            OR ct.DiaDiem COLLATE utf8mb4_general_ci LIKE ? 
            OR ct.MoTa COLLATE utf8mb4_general_ci LIKE ? 
            OR lct.TenLoai COLLATE utf8mb4_general_ci LIKE ?
        )`;
        
        // Đẩy tham số vào 4 lần cho 4 dấu ?
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 4. Lọc theo Địa điểm
    if (location && location !== 'Toàn quốc') {
        if (location === 'Hồ Chí Minh') {
            sql += ` AND (ct.DiaDiem LIKE ? OR ct.DiaDiem LIKE ? OR ct.DiaDiem LIKE ?)`;
            params.push(`%Hồ Chí Minh%`, `%TP.HCM%`, `%HCM%`);
        } else {
            sql += ` AND ct.DiaDiem LIKE ?`;
            params.push(`%${location}%`);
        }
    }

    sql += ` 
        GROUP BY 
            ct.MaChuongTrinh, 
            ct.TenChuongTrinh, 
            ct.Poster, 
            ct.NgayGioBatDau, 
            ct.DiaDiem,
            lct.TenLoai
        ORDER BY ct.NgayGioBatDau ASC 
        LIMIT ?`;
        
    params.push(limit);

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('LỖI SQL TÌM KIẾM:', err);
            return res.status(500).json({ error: 'Lỗi truy vấn: ' + err.message });
        }
        res.json(results || []);
    });
});


// API 2.2 & 2.3 (Chi tiết và Vé)
app.get('/api/events/:id', (req, res) => {
    const sql = `SELECT ct.*, dv.TenDonVi, dv.GioiThieu FROM ChuongTrinh ct LEFT JOIN DonViToChuc dv ON ct.DonViToChucMaDonVi = dv.MaDonVi WHERE ct.MaChuongTrinh = ?`;
    db.query(sql, [req.params.id], (err, results) => res.json(results[0] || null));
});

app.get('/api/events/:id/tickets', (req, res) => {
    const sql = `SELECT lcn.* FROM LoaiChoNgoi lcn JOIN SoDoChoNgoi sd ON lcn.SoDoChoNgoiMaSoDo = sd.MaSoDo WHERE sd.ChuongTrinhMaChuongTrinh = ?`;
    db.query(sql, [req.params.id], (err, results) => res.json(results || []));
});



// TRONG server.js: Đảm bảo 2 khối này tồn tại và không bị comment (không có // phía trước)

// API 1.3: Lấy thông tin người mua vé
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const sql = `SELECT HoTen, Email, SoDienThoai, NgaySinh, GioiTinh FROM NguoiMuaVe WHERE MaNMV = ?`;
    
    db.query(sql, [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }
        res.json({ success: true, user: results[0] });
    });
});

// API 1.4: Cập nhật thông tin người mua vé
app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { hoTen, soDienThoai, ngaySinh, gioiTinh } = req.body; 
    
    const sql = `UPDATE NguoiMuaVe SET HoTen = ?, SoDienThoai = ?, NgaySinh = ?, GioiTinh = ?, NgayCapNhat = CURRENT_TIMESTAMP WHERE MaNMV = ?`;

    db.query(sql, [hoTen, soDienThoai, ngaySinh || null, gioiTinh, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông tin.' });
        }
        res.json({ success: true, message: 'Cập nhật thông tin thành công.' });
    });
});


// ==================================================
// 3. TRANSACTION (Khởi tạo Đơn hàng)
// ==================================================

// TRONG server.js (API 3.1: KHỞI TẠO ĐƠN HÀNG TRƯỚC THANH TOÁN)


app.post('/api/order/initialize', (req, res) => {
    const { user_id, selectedTickets, grandTotal } = req.body; 

    if (!user_id || !selectedTickets || selectedTickets.length === 0) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng hoặc vé.' });
    }

    const maDonHangCode = 'ORD' + Date.now().toString().slice(-8);

    // Bước 1: Tạo đơn hàng chính (Trạng thái: ChoThanhToan)
    const orderSql = `INSERT INTO DonHang (MaDonHangCode, TongTien, TrangThai, NguoiMuaVeMaNMV) VALUES (?, ?, 'ChoThanhToan', ?)`;

    db.query(orderSql, [maDonHangCode, grandTotal, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Lỗi tạo đơn hàng.' });
        }
        
        const maDonHang = result.insertId;

        // Bước 2: Chuẩn bị dữ liệu và Lưu Chi tiết đơn hàng
        const detailValues = selectedTickets.map(t => [maDonHang, t.ticket_type_id, t.quantity, t.price]);
        const detailSql = `INSERT INTO ChiTietDonHang (DonHangMaDonHang, LoaiChoNgoiMaLoai, SoLuongMua, GiaTaiThoiDiemMua) VALUES ?`;
        
        db.query(detailSql, [detailValues], (errDetail, resultDetail) => {
            if (errDetail) {
                console.error('Lỗi lưu chi tiết đơn hàng:', errDetail);
                db.query(`DELETE FROM DonHang WHERE MaDonHang = ?`, [maDonHang]);
                return res.status(500).json({ success: false, message: 'Lỗi lưu chi tiết vé. Vui lòng thử lại.' });
            }

            // --- BƯỚC MỚI 3: TẠO VÀ LƯU VÉ CON (VE DIEN TU) ---
            const maChiTietBanGhiIds = [];
            // Lấy ID của các ChiTietDonHang vừa tạo (Cần logic phức tạp hơn)
            // Tạm thời, do ta không có transaction, ta sẽ đơn giản hóa:
            
            // Lấy lại các bản ghi chi tiết vừa tạo để lấy MaChiTiet
            const getDetailSql = `SELECT MaChiTiet, SoLuongMua, LoaiChoNgoiMaLoai 
                                  FROM ChiTietDonHang 
                                  WHERE DonHangMaDonHang = ?`;
            
            db.query(getDetailSql, [maDonHang], (errGetDetails, detailRows) => {
                if (errGetDetails || detailRows.length === 0) {
                     console.error('Lỗi lấy chi tiết đơn hàng:', errGetDetails);
                     // Tiếp tục mà không tạo vé con, hoặc rollback (phức tạp)
                }

                const veDienTuValues = [];
                detailRows.forEach(row => {
                    for (let i = 0; i < row.SoLuongMua; i++) {
                        // TẠO MÃ TOKEN QR ĐỘC NHẤT cho mỗi vé
                        const token = `TICKET-${maDonHangCode}-${row.LoaiChoNgoiMaLoai}-${i}-${randomUUID().slice(0, 8)}`;
                        veDienTuValues.push([token, row.MaChiTiet]);
                    }
                });

                if (veDienTuValues.length > 0) {
                    const veDienTuSql = `INSERT INTO VeDienTu (MaTokenQR, ChiTietDonHangMaChiTiet) VALUES ?`;
                    db.query(veDienTuSql, [veDienTuValues], (errVe, resultVe) => {
                        if (errVe) {
                            console.error('Lỗi lưu vé điện tử:', errVe);
                        }
                        // Dù lỗi lưu vé con, ta vẫn phản hồi thành công đơn hàng chính
                        res.json({
                            success: true,
                            message: 'Đơn hàng đã được khởi tạo và giữ chỗ.',
                            order: { order_id: maDonHang, code: maDonHangCode, total: grandTotal }
                        });
                    });
                } else {
                     res.json({
                        success: true,
                        message: 'Đơn hàng đã được khởi tạo. (Không có vé con)',
                        order: { order_id: maDonHang, code: maDonHangCode, total: grandTotal }
                    });
                }
            });
            // --- KẾT THÚC BƯỚC MỚI 3 ---
        });
    });
});
// (Thêm API Phương thức thanh toán)

app.get('/api/payment/methods', (req, res) => {
    // Chỉ lấy các phương thức đang hoạt động (TrangThai = 1)
    const sql = `SELECT MaPhuongThuc, TenPhuongThuc, MaCode FROM PhuongThucThanhToan WHERE TrangThai = 1`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Lỗi truy vấn phương thức thanh toán.' });
        }
        res.json(results || []);
    });
});


// API 3.2: Cập nhật trạng thái đơn hàng (Sau khi thanh toán thành công)
app.put('/api/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; 
    
    const validStatuses = ['ChoThanhToan', 'DaThanhToan', 'Huy', 'HoanTien'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Trạng thái cập nhật không hợp lệ.'
        });
    }

    
    const sql = `UPDATE DonHang SET TrangThai = ? WHERE MaDonHang = ?`;

    db.query(sql, [status, orderId], (err, result) => {
        if (err) {
            console.error('Lỗi SQL cập nhật trạng thái:', err);
            return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật đơn hàng: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }
        res.json({ success: true, message: `Đơn hàng ${orderId} đã được chuyển sang trạng thái ${status}.` });
    });
});


app.get('/api/users/:userId/orders', (req, res) => {
    const userId = req.params.userId;
    const statusFilter = req.query.status || ''; 
    
    // TRUY VẤN CHÍNH XÁC: Thực hiện chuỗi JOIN qua bảng ChiTietDonHang để lấy thông tin Event
   let sql = `
    SELECT 
        dh.MaDonHang, dh.MaDonHangCode, dh.TongTien, dh.TrangThai AS TrangThaiDonHang, 
        dh.NgayTao AS NgayMua, /* Giữ alias NgayMua để frontend nhận diện */
        ct.TenChuongTrinh, ct.NgayGioBatDau, ct.DiaDiem, ct.Poster
    FROM DonHang dh
    JOIN ChiTietDonHang ctdh ON dh.MaDonHang = ctdh.DonHangMaDonHang
    JOIN LoaiChoNgoi lcn ON ctdh.LoaiChoNgoiMaLoai = lcn.MaLoaiCho
    JOIN SoDoChoNgoi sd ON lcn.SoDoChoNgoiMaSoDo = sd.MaSoDo
    JOIN ChuongTrinh ct ON sd.ChuongTrinhMaChuongTrinh = ct.MaChuongTrinh
    WHERE dh.NguoiMuaVeMaNMV = ?
`;
    let params = [userId];


    if (statusFilter && statusFilter.toLowerCase() !== 'tất cả') {
        sql += ` AND dh.TrangThai = ?`; 
        params.push(statusFilter);
}

    sql += ` 
    GROUP BY 
        dh.MaDonHang, 
        ct.MaChuongTrinh, ct.TenChuongTrinh, ct.NgayGioBatDau, ct.DiaDiem, ct.Poster,
        dh.NgayTao, dh.TongTien, dh.TrangThai, dh.MaDonHangCode
    ORDER BY 
        dh.NgayTao DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('LỖI SQL TRUY VẤN ĐƠN HÀNG:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn đơn hàng: ' + err.message });
        }
        res.json({ success: true, orders: results || [] });
    });
});




app.get('/api/admin/stats/daily', (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
    
    // SỬ DỤNG SUBQUERY ĐỂ TÁCH BIỆT CÁC SỐ LIỆU, TRÁNH LỖI NHÂN ĐÔI DOANH THU
    const sql = `
        SELECT
            -- 1. Tổng doanh thu (Chỉ tính trên bảng DonHang, KHÔNG JOIN bảng chi tiết)
            (SELECT COALESCE(SUM(TongTien), 0) 
             FROM DonHang 
             WHERE TrangThai = 'DaThanhToan' AND DATE(NgayTao) = ?) AS TongDoanhThu,

            -- 2. Tổng vé bán (Phải Join bảng ChiTiet để tính tổng số lượng)
            (SELECT COALESCE(SUM(CTDH.SoLuongMua), 0) 
             FROM ChiTietDonHang CTDH
             JOIN DonHang DH ON CTDH.DonHangMaDonHang = DH.MaDonHang
             WHERE DH.TrangThai = 'DaThanhToan' AND DATE(DH.NgayTao) = ?) AS TongVeBan,

            -- 3. Tổng số đơn hàng
            (SELECT COUNT(*) 
             FROM DonHang 
             WHERE TrangThai = 'DaThanhToan' AND DATE(NgayTao) = ?) AS TongDonHang,

            -- 4. Tổng người dùng mới
            (SELECT COUNT(MaNMV) 
             FROM NguoiMuaVe 
             WHERE DATE(NgayTao) = ?) AS TongNguoiDungMoi;
    `;
    
    // Lưu ý: Phải truyền biến 'today' 4 lần tương ứng với 4 dấu ? trong câu lệnh SQL
    db.query(sql, [today, today, today, today], (err, results) => {
        if (err) {
            console.error('Lỗi SQL Daily Stats:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn dữ liệu thống kê hàng ngày.' });
        }
        res.json({ success: true, stats: results[0] });
    });
});
// Hàm tiện ích: Lấy doanh thu theo ngày (30 ngày gần nhất)
app.get('/api/admin/stats/revenue-daily', (req, res) => {
    // Tạo danh sách 30 ngày qua để đảm bảo không thiếu ngày nào trong kết quả
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    // Tạo câu lệnh SQL để nhóm doanh thu theo ngày
    // ... (Phần code hiện tại của API /api/admin/stats/revenue-daily)

    // Tạo câu lệnh SQL để nhóm doanh thu theo ngày
    const sql = `
        SELECT 
            DATE_FORMAT(NgayTao, '%Y-%m-%d') AS Ngay,
            SUM(TongTien) AS DoanhThu
        FROM DonHang
        WHERE 
            TrangThai = 'DaThanhToan' AND NgayTao >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY Ngay
        ORDER BY Ngay ASC; /* <--- Cần SẮP XẾP TĂNG DẦN */
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Revenue Daily:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn dữ liệu doanh thu hàng ngày.' });
        }
        
        // Gộp kết quả truy vấn với danh sách 30 ngày để điền 0 cho ngày không có doanh thu
        const revenueMap = new Map(results.map(item => [item.Ngay, parseFloat(item.DoanhThu)]));
        const finalResults = dates.sort().map(date => ({
            Ngay: date,
            DoanhThu: revenueMap.get(date) || 0
        }));

        res.json({ success: true, revenue: finalResults });
    });
});

// ==================================================
// 5. USER MANAGEMENT API (Quản lí Người dùng)
// ==================================================

// API 5.1: Lấy danh sách Người mua vé (NMV)
app.get('/api/admin/users', (req, res) => {
    // Lấy tất cả các thuộc tính cần thiết, bao gồm cả NgaySinh
    const sql = `
        SELECT 
            MaNMV AS id, 
            HoTen, 
            SoDienThoai, 
            Email, 
            NgaySinh, 
            GioiTinh, 
            NgayTao,
            TrangThaiXacThuc
        FROM NguoiMuaVe 
        ORDER BY NgayTao DESC;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Lấy Người dùng:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn danh sách người dùng.' });
        }
        res.json({ success: true, users: results || [] });
    });
});

// API 5.2: Cập nhật thông tin Người mua vé
app.put('/api/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    const { HoTen, SoDienThoai, Email, NgaySinh, GioiTinh } = req.body; 

    const sql = `
        UPDATE NguoiMuaVe 
        SET HoTen = ?, SoDienThoai = ?, Email = ?, NgaySinh = ?, GioiTinh = ?, NgayCapNhat = CURRENT_TIMESTAMP
        WHERE MaNMV = ?
    `;
    
    db.query(sql, [HoTen, SoDienThoai, Email, NgaySinh || null, GioiTinh, userId], (err, result) => {
        if (err) {
            console.error('Lỗi SQL Cập nhật Người dùng:', err);
            return res.status(500).json({ success: false, message: 'Lỗi cập nhật người dùng: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật.' });
        }
        res.json({ success: true, message: 'Cập nhật người dùng thành công.' });
    });
});



// API 5.3: Xóa Người mua vé (Thực hiện xóa CASCADE thủ công qua Transaction)
app.delete('/api/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    
    // Bắt đầu Transaction
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi bắt đầu giao dịch.' });

        // --- BƯỚC 1: Xóa Vé Điện Tử và Chi Tiết Đơn Hàng (Nếu tồn tại) ---
        // Lấy tất cả MaChiTiet thuộc các đơn hàng của user này
        const getDetailIdsSql = `
            SELECT ctdh.MaChiTiet
            FROM ChiTietDonHang ctdh
            JOIN DonHang dh ON ctdh.DonHangMaDonHang = dh.MaDonHang
            WHERE dh.NguoiMuaVeMaNMV = ?
        `;

        db.query(getDetailIdsSql, [userId], (err, detailResults) => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi tìm chi tiết đơn hàng.' }));

            const maChiTiets = detailResults.map(r => r.MaChiTiet);
            
            // Xóa Vé Điện Tử trước (Nếu có)
            const deleteTicketsPromise = maChiTiets.length > 0 ? new Promise((resolve, reject) => {
                const deleteTicketsSql = `DELETE FROM VeDienTu WHERE ChiTietDonHangMaChiTiet IN (?)`;
                db.query(deleteTicketsSql, [maChiTiets], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            }) : Promise.resolve();
            
            deleteTicketsPromise.then(() => {
                // --- BƯỚC 2: Xóa Chi Tiết Đơn Hàng ---
                const deleteDetailSql = `
                    DELETE ctdh FROM ChiTietDonHang ctdh
                    JOIN DonHang dh ON ctdh.DonHangMaDonHang = dh.MaDonHang
                    WHERE dh.NguoiMuaVeMaNMV = ?
                `;
                db.query(deleteDetailSql, [userId], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa chi tiết đơn hàng.' }));

                    // --- BƯỚC 3: Xóa Đơn Hàng ---
                    const deleteOrderSql = `DELETE FROM DonHang WHERE NguoiMuaVeMaNMV = ?`;
                    db.query(deleteOrderSql, [userId], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng.' }));
                        
                        // --- BƯỚC 4: Xóa Người Mua Vé ---
                        const deleteUserSql = `DELETE FROM NguoiMuaVe WHERE MaNMV = ?`;
                        db.query(deleteUserSql, [userId], (err, result) => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa người dùng.' }));

                            // Commit giao dịch
                            db.commit(err => {
                                if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi commit giao dịch.' }));
                                
                                if (result.affectedRows === 0) {
                                    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để xóa.' });
                                }
                                res.json({ success: true, message: '✅ Xóa người dùng và toàn bộ dữ liệu liên quan thành công!' });
                            });
                        });
                    });
                });
            }).catch(err => {
                console.error('Lỗi xóa vé điện tử:', err);
                return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa vé điện tử/chi tiết.' }));
            });
        });
    });
});
// API MỚI: Lấy chi tiết vé con đã thanh toán (Dùng MaDonHangCode)
app.get('/api/orders/:orderCode/tickets', (req, res) => {
    const orderCode = req.params.orderCode;
    
    // TRUY VẤN: Lấy tất cả các mã QR/ID vé con thuộc về đơn hàng này
    const sql = `
        SELECT 
            vd.MaTokenQR, lcn.TenLoaiCho, lcn.GiaVe, dh.MaDonHangCode
        FROM DonHang dh
        JOIN ChiTietDonHang ctdh ON dh.MaDonHang = ctdh.DonHangMaDonHang
        JOIN VeDienTu vd ON ctdh.MaChiTiet = vd.ChiTietDonHangMaChiTiet
        JOIN LoaiChoNgoi lcn ON ctdh.LoaiChoNgoiMaLoai = lcn.MaLoaiCho
        WHERE dh.MaDonHangCode = ?
        ORDER BY lcn.MaLoaiCho, vd.MaVe`;
        
    db.query(sql, [orderCode], (err, results) => {
        if (err) {
            console.error('Lỗi truy vấn vé con:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn chi tiết vé con.' });
        }
        res.json({ success: true, tickets: results });
    });
});

// =================================================================================


// ==================================================
// 6. EVENT MANAGEMENT API (Quản lí Chương trình)
// ==================================================

// // API 6.1: Lấy danh sách Chương trình


app.get('/api/admin/events', (req, res) => {
    const sql = `
        SELECT 
            ct.MaChuongTrinh AS id, 
            ct.TenChuongTrinh, 
            ct.MoTa,
            ct.NgayGioBatDau, 
            ct.DiaDiem, 
            ct.DanhSachNgheSi,
            ct.TrangThai
        FROM ChuongTrinh ct
        ORDER BY ct.MaChuongTrinh DESC;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Lấy Chương trình:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn danh sách chương trình.' });
        }
        res.json({ success: true, events: results || [] });
    });
});

// API 6.2: Cập nhật Chương trình
app.put('/api/admin/events/:id', (req, res) => {
    const eventId = req.params.id;
    const { TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai } = req.body; 

    const sql = `
        UPDATE ChuongTrinh 
        SET TenChuongTrinh = ?, MoTa = ?, NgayGioBatDau = ?, DiaDiem = ?, DanhSachNgheSi = ?, TrangThai = ?
        WHERE MaChuongTrinh = ?
    `;
    
    db.query(sql, [TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai, eventId], (err, result) => {
        if (err) {
            console.error('Lỗi SQL Cập nhật Chương trình:', err);
            return res.status(500).json({ success: false, message: 'Lỗi cập nhật chương trình: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình để cập nhật.' });
        }
        res.json({ success: true, message: 'Cập nhật chương trình thành công.' });
    });
});

// API 6.3: Xóa Chương trình (có kiểm tra vé đã bán)
app.delete('/api/admin/events/:id', (req, res) => {
    const eventId = req.params.id;

    // Bước 1: Lấy trạng thái của chương trình
    const getStatusSql = `SELECT TrangThai FROM ChuongTrinh WHERE MaChuongTrinh = ?`;

    db.query(getStatusSql, [eventId], (err, statusResults) => {
        if (err) {
            console.error('Lỗi SQL kiểm tra trạng thái:', err);
            return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái chương trình: ' + err.message });
        }
        
        if (statusResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình.' });
        }
        
        const currentStatus = statusResults[0].TrangThai;

        // **LOGIC MỚI: Cho phép xóa nếu trạng thái là 'DaDienRa' hoặc 'Huy'**
        if (currentStatus === 'DaDienRa' || currentStatus === 'Huy') {
            // Nếu là 'DaDienRa' hoặc 'Huy', bỏ qua kiểm tra vé và tiến hành xóa
            console.log(`Chương trình #${eventId} ở trạng thái ${currentStatus}, tiến hành xóa.`);
            // Chuyển sang bước 2 để thực hiện xóa (giống như sau khi check vé)
            checkTicketAndProceed(0); 
            return;
        }

        // Bước 2: Kiểm tra xem đã có vé nào được bán cho sự kiện này chưa (Chỉ áp dụng cho các trạng thái còn lại)
        const checkTicketsSql = `
            SELECT 
                COALESCE(SUM(ctdh.SoLuongMua), 0) AS TotalSold
            FROM DonHang dh
            JOIN ChiTietDonHang ctdh ON dh.MaDonHang = ctdh.DonHangMaDonHang
            JOIN LoaiChoNgoi lcn ON ctdh.LoaiChoNgoiMaLoai = lcn.MaLoaiCho
            JOIN SoDoChoNgoi sd ON lcn.SoDoChoNgoiMaSoDo = sd.MaSoDo
            WHERE sd.ChuongTrinhMaChuongTrinh = ? AND dh.TrangThai = 'DaThanhToan';
        `;
        
        db.query(checkTicketsSql, [eventId], (err, results) => {
            if (err) {
                console.error('Lỗi SQL kiểm tra vé:', err);
                return res.status(500).json({ success: false, message: 'Lỗi kiểm tra vé đã bán: ' + err.message });
            }
            
            const totalSold = results[0].TotalSold || 0;
            checkTicketAndProceed(totalSold);
        });

        // Hàm chung để thực hiện kiểm tra và xóa
        function checkTicketAndProceed(totalSold) {
            if (totalSold > 0) {
                // Đã có vé được bán VÀ không thuộc 2 trạng thái ngoại lệ
                return res.status(409).json({ 
                    success: false, 
                    message: `🔴 Không thể xóa chương trình này. Đã có ${totalSold} vé được bán.`
                });
            }
            
            // Tiến hành xóa (Luôn dùng Transaction để đảm bảo tính toàn vẹn)
            db.beginTransaction(err => {
                if (err) return res.status(500).json({ success: false, message: 'Lỗi giao dịch.' });

                // Xóa các bảng phụ thuộc trước: LoaiChoNgoi -> SoDoChoNgoi -> ChuongTrinh

                // Lấy danh sách MaSoDo để xóa LoaiChoNgoi và SoDoChoNgoi
                const getSoDoSql = `SELECT MaSoDo FROM SoDoChoNgoi WHERE ChuongTrinhMaChuongTrinh = ?`;
                db.query(getSoDoSql, [eventId], (err, soDoResults) => {
                    if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi tìm sơ đồ.' }));

                    const maSoDos = soDoResults.map(r => r.MaSoDo);
                    
                    // Xóa LoaiChoNgoi (Các vé đã tạo/đã bán sẽ được xóa CASCADE qua ChiTietDonHang và VeDienTu)
                    const deleteLoaiChoNgoiSql = `DELETE FROM LoaiChoNgoi WHERE SoDoChoNgoiMaSoDo IN (?)`;
                    // Dùng Promise.all hoặc kiểm tra mảng rỗng trước khi chạy IN (?)
                    const deleteLoaiChoNgoiPromise = maSoDos.length > 0 ? new Promise((resolve, reject) => {
                         db.query(deleteLoaiChoNgoiSql, [maSoDos], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    }) : Promise.resolve();

                    deleteLoaiChoNgoiPromise.then(() => {
                        // Xóa SoDoChoNgoi
                        const deleteSoDoSql = `DELETE FROM SoDoChoNgoi WHERE ChuongTrinhMaChuongTrinh = ?`;
                        db.query(deleteSoDoSql, [eventId], (err) => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa sơ đồ chỗ ngồi.' }));

                            // Xóa Chương trình
                            const deleteEventSql = `DELETE FROM ChuongTrinh WHERE MaChuongTrinh = ?`;
                            db.query(deleteEventSql, [eventId], (err, result) => {
                                if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa chương trình.' }));
                                
                                db.commit(err => {
                                    if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi commit giao dịch.' }));
                                    
                                    if (result.affectedRows === 0) {
                                        return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình để xóa.' });
                                    }
                                    res.json({ success: true, message: '✅ Xóa chương trình thành công!' });
                                });
                            });
                        });
                    }).catch(err => {
                         db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa loại chỗ ngồi.' }));
                    });
                });
            });
        }
    });
});

// API 6.4: Admin tạo sự kiện cơ bản (Không kèm hình ảnh, sơ đồ vé)
app.post('/api/admin/events/basic', (req, res) => {
    const { TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai } = req.body;
    
    // Tạo một Slug tạm thời
    const Slug = 'admin-tao-' + Date.now();
    
    // Gán mặc định các khóa ngoại (Ví dụ: Đơn vị = 1, Loại CT = 1, Người tạo = 1)
    const sql = `
        INSERT INTO ChuongTrinh 
        (TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai, Slug, DonViToChucMaDonVi, LoaiChuongTrinhMaLoai, NguoiTaoChuongTrinhID) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)
    `;

    db.query(sql, [TenChuongTrinh, MoTa, NgayGioBatDau, DiaDiem, DanhSachNgheSi, TrangThai, Slug], (err, result) => {
        if (err) {
            console.error('Lỗi SQL Thêm Chương trình (Basic):', err);
            return res.status(500).json({ success: false, message: 'Lỗi tạo chương trình: ' + err.message });
        }
        res.json({ success: true, message: 'Tạo chương trình thành công.' });
    });
});
// ==================================================
// 7. STATISTIC CHARTS API
// ==================================================

// API 7.1: Lấy số lượng đơn hàng theo ngày (30 ngày gần nhất)
app.get('/api/admin/stats/orders-daily', (req, res) => {
    // Tạo câu lệnh SQL để nhóm đơn hàng (đã thanh toán) theo ngày
    const sql = `
        SELECT 
            DATE_FORMAT(NgayTao, '%Y-%m-%d') AS Ngay,
            COUNT(MaDonHang) AS SoDonHang
        FROM DonHang
        WHERE 
            TrangThai = 'DaThanhToan' AND NgayTao >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY Ngay
        ORDER BY Ngay ASC;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Orders Daily:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn dữ liệu đơn hàng hàng ngày.' });
        }
        
        // Tạo danh sách 30 ngày qua để điền 0 cho ngày không có đơn hàng
        const ordersMap = new Map(results.map(item => [item.Ngay, item.SoDonHang]));
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dates.push({
                Ngay: dateStr,
                SoDonHang: ordersMap.get(dateStr) || 0
            });
        }

        res.json({ success: true, orders: dates });
    });
});

// API 7.2: Lấy tỷ lệ vé đã bán (>= 1 triệu và < 1 triệu)
app.get('/api/admin/stats/ticket-ratio', (req, res) => {
    const sql = `
        SELECT
            CASE 
                WHEN CTDH.GiaTaiThoiDiemMua >= 1000000 THEN 'Giá >= 1 Triệu VND'
                ELSE 'Giá < 1 Triệu VND'
            END AS PriceCategory,
            COALESCE(SUM(CTDH.SoLuongMua), 0) AS TotalSold
        FROM ChiTietDonHang CTDH
        JOIN DonHang DH ON CTDH.DonHangMaDonHang = DH.MaDonHang
        WHERE DH.TrangThai = 'DaThanhToan'
        GROUP BY PriceCategory;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Ticket Ratio:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn tỷ lệ vé đã bán.' });
        }
        res.json({ success: true, ratio: results || [] });
    });
});

// ==================================================
// 3. QUẢN LÝ ĐƠN HÀNG (API cho Admin)
// ==================================================

// API 3.1: Lấy danh sách Đơn hàng cho Admin (Để hiển thị ra bảng)
app.get('/api/orders/admin', (req, res) => {
    const sql = `
        SELECT 
            DH.MaDonHang, 
            DH.MaDonHangCode, 
            DH.TongTien, 
            DH.TrangThai, 
            DH.NgayTao,
            NMV.HoTen AS TenNguoiMua,
            NMV.Email AS EmailNguoiMua
        FROM DonHang DH
        LEFT JOIN NguoiMuaVe NMV ON DH.NguoiMuaVeMaNMV = NMV.MaNMV
        ORDER BY DH.MaDonHang DESC;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('LỖI SQL TRUY VẤN DANH SÁCH ĐƠN HÀNG ADMIN:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn danh sách đơn hàng.' });
        }
        // Trả về mảng đơn hàng
        res.json({ success: true, orders: results || [] }); 
    });
});
// --------------------------------------------------

// API 3.2: Lấy thông tin chi tiết đơn hàng theo ID (Cho form Cập nhật)
app.get('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const sql = `
        SELECT 
            DH.MaDonHang, 
            DH.MaDonHangCode, 
            DH.TongTien, 
            DH.TrangThai, 
            DH.NgayTao,
            NMV.HoTen AS TenNguoiMua,
            NMV.Email AS EmailNguoiMua
        FROM DonHang DH
        LEFT JOIN NguoiMuaVe NMV ON DH.NguoiMuaVeMaNMV = NMV.MaNMV
        WHERE DH.MaDonHang = ?
    `;
    
    db.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error('Lỗi SQL Lấy chi tiết đơn hàng:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn cơ sở dữ liệu.' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng có ID: ${orderId}.` });
        }
        
        // Log khi tìm thấy để giúp debug
        console.log(`Đã tìm thấy chi tiết đơn hàng ID: ${orderId}`);
        res.json({ success: true, order: results[0] });
    });
});
// --------------------------------------------------

// TRONG server.js (API 3.4: Xóa Đơn hàng)

app.delete('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;

    // Bước 1: Kiểm tra trạng thái đơn hàng có thể xóa hay không
    const checkStatusSql = `SELECT TrangThai FROM DonHang WHERE MaDonHang = ?`;
    
    db.query(checkStatusSql, [orderId], (err, results) => {
        if (err) {
            console.error('Lỗi SQL Kiểm tra trạng thái:', err);
            return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái đơn hàng.' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }
        
        const currentStatus = results[0].TrangThai;
        const deletableStatuses = ['ChoThanhToan', 'Huy', 'HoanTien'];

        if (!deletableStatuses.includes(currentStatus)) {
            return res.status(403).json({ 
                success: false, 
                message: `🔴 Chỉ có thể xóa đơn hàng ở trạng thái "Chờ Thanh toán", "Hủy", hoặc "Hoàn tiền". Đơn hàng này đang ở trạng thái "${currentStatus}".`
            });
        }

        // Bước 2: Bắt đầu Transaction
        db.beginTransaction(err => {
            if (err) return res.status(500).json({ success: false, message: 'Lỗi bắt đầu giao dịch.' });

            // Bước 3: Lấy MaChiTiet để xác định Vé Điện Tử cần xóa
            const getDetailIdsSql = `SELECT MaChiTiet FROM ChiTietDonHang WHERE DonHangMaDonHang = ?`;
            db.query(getDetailIdsSql, [orderId], (err, detailResults) => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi tìm chi tiết đơn hàng.' }));

                const maChiTiets = detailResults.map(r => r.MaChiTiet);
                
                // Bước 4: Xóa Vé Điện Tử (Con) trước (nếu tồn tại)
                if (maChiTiets.length > 0) {
                    const deleteTicketsSql = `DELETE FROM VeDienTu WHERE ChiTietDonHangMaChiTiet IN (?)`;
                    db.query(deleteTicketsSql, [maChiTiets], (err) => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa vé điện tử.' }));
                        
                        // Chuyển sang Bước 5: Xóa ChiTietDonHang
                        performDeleteDetailsAndOrder(orderId, res); 
                    });
                } else {
                    // Nếu không có ChiTietDonHang (hoặc vé con) nào, chuyển sang Bước 5
                    performDeleteDetailsAndOrder(orderId, res);
                }
            });

            // Hàm thực hiện xóa ChiTietDonHang và DonHang
            function performDeleteDetailsAndOrder(orderId, res) {
                // Bước 5: Xóa ChiTietDonHang (Cha)
                const deleteDetailSql = `DELETE FROM ChiTietDonHang WHERE DonHangMaDonHang = ?`;
                db.query(deleteDetailSql, [orderId], (err) => {
                    // Nếu lỗi ở đây, rollback
                    if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa chi tiết đơn hàng.' }));

                    // Bước 6: Sau đó xóa DonHang
                    const deleteOrderSql = `DELETE FROM DonHang WHERE MaDonHang = ?`;
                    db.query(deleteOrderSql, [orderId], (err, result) => {
                        // Nếu lỗi ở đây, rollback
                        if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng.' }));
                        
                        // Bước 7: Commit giao dịch
                        db.commit(err => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'Lỗi commit giao dịch.' }));
                            
                            if (result.affectedRows === 0) {
                                return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để xóa.' });
                            }
                            res.json({ success: true, message: `✅ Xóa đơn hàng #${orderId} thành công!` });
                        });
                    });
                });
            }
        });
    });
});


/////////////////////////////////////////////////////////////////////////////////
// --- THÊM VÀO CUỐI FILE server.js HOẶC TRONG PHẦN API TƯƠNG ỨNG ---

// ==================================================
// 9. QUẢN LÝ VÉ ĐIỆN TỬ (Admin)
// ==================================================

// API 9.1: Lấy danh sách Đơn hàng đã thanh toán (grouped by order)
app.get('/api/admin/tickets-by-order', (req, res) => {
    // Trả về danh sách đơn hàng đã thanh toán, bao gồm thông tin người mua và số lượng vé
    const sql = `
        SELECT 
            dh.MaDonHang, 
            dh.MaDonHangCode, 
            dh.TongTien, 
            dh.TrangThai, 
            dh.NgayTao,
            nmv.MaNMV, 
            nmv.HoTen AS TenKhachHang, 
            nmv.Email,
            COUNT(vd.MaTokenQR) AS SoLuongVe
        FROM DonHang dh
        JOIN NguoiMuaVe nmv ON dh.NguoiMuaVeMaNMV = nmv.MaNMV
        LEFT JOIN ChiTietDonHang ctdh ON dh.MaDonHang = ctdh.DonHangMaDonHang
        LEFT JOIN VeDienTu vd ON ctdh.MaChiTiet = vd.ChiTietDonHangMaChiTiet
        WHERE dh.TrangThai = 'DaThanhToan'
        GROUP BY dh.MaDonHang, nmv.MaNMV, nmv.HoTen, nmv.Email, dh.MaDonHangCode, dh.TongTien, dh.TrangThai, dh.NgayTao
        ORDER BY dh.NgayTao DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL API 9.1:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn cơ sở dữ liệu.' });
        }
        res.json({ success: true, orders: results });
    });
});

// API 9.2: Lấy danh sách MaTokenQR của các vé trong một Đơn hàng
app.get('/api/admin/tickets/:orderId', (req, res) => {
    const orderId = req.params.orderId; // Đây là MaDonHang
    
    const sql = `
        SELECT 
            vd.MaTokenQR,
            vd.TrangThaiQuet,
            ctdh.DonHangMaDonHang,
            lcn.TenLoaiCho,
            ct.TenChuongTrinh,
            ct.NgayGioBatDau,
            ct.Poster
        FROM VeDienTu vd
        JOIN ChiTietDonHang ctdh ON vd.ChiTietDonHangMaChiTiet = ctdh.MaChiTiet
        JOIN LoaiChoNgoi lcn ON ctdh.LoaiChoNgoiMaLoai = lcn.MaLoaiCho
        JOIN SoDoChoNgoi sd ON lcn.SoDoChoNgoiMaSoDo = sd.MaSoDo
        JOIN ChuongTrinh ct ON sd.ChuongTrinhMaChuongTrinh = ct.MaChuongTrinh
        WHERE ctdh.DonHangMaDonHang = ?
    `;
    
    db.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error('Lỗi SQL API 9.2:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn cơ sở dữ liệu.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vé cho đơn hàng này.' });
        }
        res.json({ success: true, tickets: results });
    });
});



///////////////////////////////////////////////////////////////////
// ==================================================
// 10. PAYMENT MANAGEMENT API (Quản lí Thanh Toán)
// ==================================================

// API 10.1: Lấy danh sách Thanh Toán (Cho Admin)
app.get('/api/admin/payments', (req, res) => {
    const sql = `
        SELECT 
            TT.MaThanhToan,
            TT.MaGiaoDich,
            TT.SoTien,
            TT.TrangThai AS TrangThaiThanhToan,
            TT.NgayThanhToan,
            DH.MaDonHangCode,
            DH.MaDonHang AS DonHangMaDonHang,
            PTT.TenPhuongThuc
        FROM ThanhToan TT
        JOIN DonHang DH ON TT.DonHangMaDonHang = DH.MaDonHang
        JOIN PhuongThucThanhToan PTT ON TT.PhuongThucMaPhuongThuc = PTT.MaPhuongThuc
        ORDER BY TT.NgayThanhToan DESC;
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Lỗi SQL Lấy Thanh Toán:', err);
            return res.status(500).json({ success: false, message: 'Lỗi truy vấn danh sách thanh toán.' });
        }
        res.json({ success: true, payments: results || [] });
    });
});


// HÀM TỰ ĐỘNG GỬI EMAIL CHỨA MÃ QR VÉ ĐIỆN TỬ
function sendPaymentSuccessEmail(maDonHang) {
    // 1. Truy vấn lấy thông tin người dùng, sự kiện và tất cả mã QR
    const sql = `
        SELECT 
            dh.MaDonHangCode, dh.TongTien,
            nmv.HoTen, nmv.Email,
            ct.TenChuongTrinh, ct.NgayGioBatDau, ct.DiaDiem,
            vd.MaTokenQR, lcn.TenLoaiCho
        FROM DonHang dh
        JOIN NguoiMuaVe nmv ON dh.NguoiMuaVeMaNMV = nmv.MaNMV
        JOIN ChiTietDonHang ctdh ON dh.MaDonHang = ctdh.DonHangMaDonHang
        JOIN VeDienTu vd ON ctdh.MaChiTiet = vd.ChiTietDonHangMaChiTiet
        JOIN LoaiChoNgoi lcn ON ctdh.LoaiChoNgoiMaLoai = lcn.MaLoaiCho
        JOIN SoDoChoNgoi sd ON lcn.SoDoChoNgoiMaSoDo = sd.MaSoDo
        JOIN ChuongTrinh ct ON sd.ChuongTrinhMaChuongTrinh = ct.MaChuongTrinh
        WHERE dh.MaDonHang = ?
    `;

    db.query(sql, [maDonHang], (err, results) => {
        if (err || results.length === 0) {
            console.error("Lỗi lấy thông tin gửi email vé:", err);
            return;
        }

        const userInfo = results[0];
        const emailTo = userInfo.Email;
        
        // 2. Tạo HTML cho danh sách vé con và mã QR
        let ticketsHtml = '';
        results.forEach((ticket, index) => {
            // Sử dụng API qrserver để nhúng trực tiếp ảnh QR vào Email (Gmail rất hỗ trợ định dạng này)
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.MaTokenQR}`;
            ticketsHtml += `
                <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; text-align: left;">
                    <h3 style="color: #FF6A88; margin-top: 0;">Vé #${index + 1}: ${ticket.TenLoaiCho}</h3>
                    <p style="margin: 5px 0; font-size: 13px; color: #555;"><strong>Mã Token:</strong> ${ticket.MaTokenQR}</p>
                    <img src="${qrUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 1px solid #eee; padding: 5px; margin-top: 10px;">
                </div>
            `;
        });

        // 3. Cấu hình nội dung Email
        const mailOptions = {
            from: 'Festicket Support <furutehieuvip@gmail.com>', // Email đã cấu hình ở đầu file
            to: emailTo,
            subject: `[Festicket] Thanh toán thành công - Mã ĐH: ${userInfo.MaDonHangCode}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
                    <div style="background: white; padding: 30px; border-radius: 10px; border-top: 5px solid #00c853; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <h2 style="color: #00c853; margin-top: 0;">Cảm ơn bạn đã mua vé tại Festicket!</h2>
                        <p>Chào <strong>${userInfo.HoTen}</strong>,</p>
                        <p>Chúng tôi đã nhận được thanh toán cho đơn hàng <strong>${userInfo.MaDonHangCode}</strong> của bạn.</p>
                        
                        <hr style="border: 0; border-top: 1px dashed #ddd; margin: 20px 0;">
                        
                        <h3 style="color: #333;">📅 Thông tin sự kiện:</h3>
                        <p><strong>${userInfo.TenChuongTrinh}</strong></p>
                        <p><strong>Thời gian:</strong> ${new Date(userInfo.NgayGioBatDau).toLocaleString('vi-VN')}</p>
                        <p><strong>Địa điểm:</strong> ${userInfo.DiaDiem}</p>
                        
                        <hr style="border: 0; border-top: 1px dashed #ddd; margin: 20px 0;">
                        
                        <h3 style="color: #333;">🎟️ Vé điện tử của bạn:</h3>
                        <p style="color: #777; font-size: 14px;">Vui lòng lưu lại các mã QR bên dưới hoặc tải về máy để check-in tại sự kiện.</p>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            ${ticketsHtml}
                        </div>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #888;">
                            Trân trọng,<br>
                            <strong>Đội ngũ Festicket</strong>
                        </p>
                    </div>
                </div>
            `
        };

        // 4. Thực thi gửi email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('Lỗi gửi email QR vé:', error);
            else console.log('Đã gửi email vé điện tử thành công: ' + info.response);
        });
    });
}

// API 10.2: Cập nhật Trạng thái Thanh Toán (Thực hiện bởi Admin)
app.put('/api/admin/payments/:id/status', (req, res) => {
    const paymentId = req.params.id;
    const { newStatus } = req.body; 
    const validStatuses = ['ThanhCong', 'ThatBai', 'ChoXuLy'];

    if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, message: 'Trạng thái cập nhật không hợp lệ.' });
    }
    
    // Bước 1: Cập nhật trạng thái ThanhToan
    const updatePaymentSql = `UPDATE ThanhToan SET TrangThai = ? WHERE MaThanhToan = ?`;
    
    db.query(updatePaymentSql, [newStatus, paymentId], (err, result) => {
        if (err || result.affectedRows === 0) {
            console.error('Lỗi SQL Cập nhật Thanh Toán:', err);
            return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái thanh toán.' });
        }
        
        // Bước 2: Lấy MaDonHang để cập nhật trạng thái đơn hàng tương ứng
        const getOrderSql = `SELECT DonHangMaDonHang FROM ThanhToan WHERE MaThanhToan = ?`;
        db.query(getOrderSql, [paymentId], (err, orderResults) => {
            if (err || orderResults.length === 0) {
                return res.json({ success: true, message: 'Cập nhật Thanh Toán thành công, nhưng không tìm thấy Đơn hàng để đồng bộ.' });
            }
            
            const maDonHang = orderResults[0].DonHangMaDonHang;
            
            // Xác định trạng thái Đơn hàng dựa trên trạng thái Thanh Toán
            const newOrderStatus = (newStatus === 'ThanhCong') ? 'DaThanhToan' : ((newStatus === 'ThatBai') ? 'Huy' : 'ChoThanhToan');
            
            // Bước 3: Cập nhật trạng thái DonHang
            const updateOrderSql = `UPDATE DonHang SET TrangThai = ? WHERE MaDonHang = ?`;
            db.query(updateOrderSql, [newOrderStatus, maDonHang], (errOrder, resultOrder) => {
                if (errOrder) {
                    return res.status(500).json({ success: false, message: 'Cập nhật Thanh Toán thành công, nhưng lỗi đồng bộ Đơn hàng.' });
                }
                
                // ==========================================
                // BƯỚC MỚI: GỌI HÀM GỬI EMAIL NẾU THÀNH CÔNG
                // ==========================================
                if (newOrderStatus === 'DaThanhToan') {
                    sendPaymentSuccessEmail(maDonHang);
                }
                
                res.json({ 
                    success: true, 
                    message: `✅ Cập nhật Thanh Toán và đồng bộ Đơn hàng sang [${newOrderStatus}] thành công!`,
                    finalOrderStatus: newOrderStatus
                });
            });
        });
    });
});

// TRONG server.js (Thêm vào Mục 3: TRANSACTION)

// API 3.5: LƯU BẢN GHI THANH TOÁN (Trạng thái mặc định ChoXuLy)
app.post('/api/payment/record', (req, res) => {
    const { order_id, payment_method_id, maGiaoDich, soTien } = req.body;
    
    // MaGiaoDich ở đây có thể là mã tham chiếu/hash đơn giản
    const defaultMaGiaoDich = maGiaoDich || `TXN-${Date.now()}`; 

    const sql = `
        INSERT INTO ThanhToan (MaGiaoDich, SoTien, TrangThai, DonHangMaDonHang, PhuongThucMaPhuongThuc)
        VALUES (?, ?, 'ChoXuLy', ?, ?)
    `;
    
    db.query(sql, [defaultMaGiaoDich, soTien, order_id, payment_method_id], (err, result) => {
        if (err) {
            console.error('Lỗi SQL Lưu Thanh Toán:', err);
            return res.status(500).json({ success: false, message: 'Lỗi lưu bản ghi thanh toán.' });
        }
        res.json({ success: true, message: 'Đã lưu bản ghi thanh toán, đang chờ xác nhận từ Admin.', payment_id: result.insertId });
    });
});





// --- API MỚI: XÓA SỰ KIỆN (DÀNH RIÊNG CHO ORGANIZER) ---


app.delete('/api/organizer/events/:id', (req, res) => {
    const eventId = req.params.id;

    // BƯỚC 1: Tìm tất cả Sơ đồ ghế ngồi của sự kiện này
    const sqlGetSoDo = `SELECT MaSoDo FROM SoDoChoNgoi WHERE ChuongTrinhMaChuongTrinh = ?`;

    db.query(sqlGetSoDo, [eventId], (err, sodoList) => {
        if (err) {
            console.error('Lỗi tìm sơ đồ:', err);
            return res.status(500).json({ success: false, message: 'Lỗi server khi tìm dữ liệu.' });
        }

        // Lấy danh sách ID các sơ đồ (nếu có)
        const sodoIds = sodoList.map(item => item.MaSoDo);

        // Hàm xóa sự kiện chính (Chỉ chạy khi đã dọn sạch rác)
        const deleteMainEvent = () => {
            db.query(`DELETE FROM ChuongTrinh WHERE MaChuongTrinh = ?`, [eventId], (errDel, result) => {
                if (errDel) {
                    console.error('Lỗi xóa sự kiện gốc:', errDel);
                    return res.status(500).json({ success: false, message: 'Không thể xóa sự kiện này (có thể do đã bán vé).' });
                }
                res.json({ success: true, message: 'Đã xóa sự kiện thành công!' });
            });
        };

        // BƯỚC 2: Bắt đầu quy trình xóa
        if (sodoIds.length > 0) {
            // 2.1: Xóa tất cả Vé (Loại chỗ ngồi) thuộc các sơ đồ trên
            const sqlDelTicket = `DELETE FROM LoaiChoNgoi WHERE SoDoChoNgoiMaSoDo IN (?)`;
            db.query(sqlDelTicket, [sodoIds], (errTicket) => {
                if (errTicket) console.log('Lỗi xóa vé phụ (bỏ qua):', errTicket);

                // 2.2: Sau khi xóa vé xong -> Xóa Sơ đồ
                const sqlDelSoDo = `DELETE FROM SoDoChoNgoi WHERE ChuongTrinhMaChuongTrinh = ?`;
                db.query(sqlDelSoDo, [eventId], (errSoDo) => {
                    if (errSoDo) {
                        return res.status(500).json({ success: false, message: 'Lỗi khi xóa sơ đồ ghế.' });
                    }
                    // 2.3: Sạch sẽ rồi -> Xóa sự kiện chính
                    deleteMainEvent();
                });
            });
        } else {
            // Nếu sự kiện chưa có sơ đồ/vé nào -> Xóa luôn
            deleteMainEvent();
        }
    });
});





///////////////////////////////
// Hàm tiện ích: Chuyển Base64 sang file và trả về đường dẫn
function saveBase64Image(base64Data, filename) {
    if (!base64Data || !base64Data.startsWith('data:image')) {
        return null; // Không có ảnh hoặc không phải Base64
    }

    // Tách phần metadata khỏi dữ liệu Base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        console.error('Lỗi định dạng Base64');
        return null;
    }
    const type = matches[1].split('/')[1]; // Lấy đuôi file (png, jpeg)
    const data = Buffer.from(matches[2], 'base64');
    
    // Tạo tên file duy nhất trong thư mục trangchu/images/
    const saveDir = path.join(__dirname, 'trangchu', 'images');
    const finalFilename = `${filename}_${Date.now()}.${type}`;
    const filePath = path.join(saveDir, finalFilename);

    try {
        fs.writeFileSync(filePath, data);
        // Lưu đường dẫn TƯƠNG ĐỐI mà client có thể truy cập được
        return `trangchu/images/${finalFilename}`; 
    } catch (err) {
        console.error('Lỗi ghi file ảnh:', err);
        return null;
    }
}
// API MỚI: TẠO CHƯƠNG TRÌNH (POST /api/admin/events)
app.post('/api/admin/events', (req, res) => {
    // Thu thập các trường dữ liệu từ payload của client (taochuongtrinh.js)
    const { 
        TenChuongTrinh, Slug, MoTa, NgayGioBatDau, DiaDiem, 
        TrangThai, IsNoiBat, DonViToChucMaDonVi, LoaiChuongTrinhMaLoai, 
        NguoiKiemDuyetID, tickets, images,
        NguoiTaoChuongTrinhID // <--- DÒNG MỚI: NHẬN THÊM TRƯỜNG ID
    } = req.body;
    
    // --- BƯỚC MỚI: XỬ LÝ VÀ LƯU ẢNH ---
    const posterPath = saveBase64Image(images.event, `poster_${Slug}`);
    const coverPath = saveBase64Image(images.cover, `cover_${Slug}`);
    // -------------------------------------

    // 1. CHÈN VÀO BẢNG ChuongTrinh
    const eventSql = `
        INSERT INTO ChuongTrinh 
        (TenChuongTrinh, Slug, MoTa, NgayGioBatDau, DiaDiem, Poster, AnhBia, TrangThai, IsNoiBat, DonViToChucMaDonVi, LoaiChuongTrinhMaLoai, NguoiKiemDuyetID, NguoiTaoChuongTrinhID) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(eventSql, [
        TenChuongTrinh, Slug, MoTa, NgayGioBatDau, DiaDiem, posterPath, coverPath, TrangThai, IsNoiBat, DonViToChucMaDonVi, LoaiChuongTrinhMaLoai, NguoiKiemDuyetID, NguoiTaoChuongTrinhID // <--- THÊM ID NGƯỜI TẠO
    ], (err, result) => {
        if (err) {
            console.error('Lỗi SQL tạo Chương trình:', err);
            return res.status(500).json({ success: false, message: 'Lỗi tạo Chương trình: ' + err.message });
        }
        
        const maChuongTrinh = result.insertId;
        
        // 2. CHÈN VÀO BẢNG SoDoChoNgoi (Giả định 1 sự kiện có 1 sơ đồ mặc định)
        const soDoSql = `INSERT INTO SoDoChoNgoi (TenSoDo, ChuongTrinhMaChuongTrinh) VALUES (?, ?)`;
        db.query(soDoSql, ['Sơ đồ mặc định', maChuongTrinh], (errSoDo, resultSoDo) => {
            if (errSoDo) {
                console.error('Lỗi SQL tạo Sơ đồ:', errSoDo);
                return res.status(500).json({ success: false, message: 'Lỗi tạo Sơ đồ chỗ ngồi.' });
            }
            
            const maSoDo = resultSoDo.insertId;
            
            // 3. CHÈN VÀO BẢNG LoaiChoNgoi (Các loại vé)
            if (tickets && tickets.length > 0) {
                // ... (Logic tạo LoaiChoNgoi giữ nguyên)
                const ticketValues = tickets.map(t => [
                    t.TenLoaiCho, t.GiaVe, t.SoLuongCho, 0, maSoDo, t.MoTa, t.MauSac
                ]);
                const ticketSql = `
                    INSERT INTO LoaiChoNgoi (TenLoaiCho, GiaVe, SoLuongCho, SoChoDaBan, SoDoChoNgoiMaSoDo, MoTa, MauSac) 
                    VALUES ?
                `;
                db.query(ticketSql, [ticketValues], (errTicket) => {
                    if (errTicket) {
                        console.error('Lỗi SQL tạo Loại vé:', errTicket);
                        return res.status(500).json({ success: false, message: 'Lỗi tạo Loại vé.' });
                    }
                    res.json({ success: true, message: '✅ Tạo chương trình thành công!', maChuongTrinh });
                });
            } else {
                 res.json({ success: true, message: '✅ Tạo chương trình thành công (Không có vé).', maChuongTrinh });
            }
        });
    });
});


app.get('/api/organizer/my-events', (req, res) => {
    // 1. NHẬN userId TỪ QUERY (Đây chính là NguoiTaoChuongTrinhID)
    const { status: statusFilter, query: searchQ, userId } = req.query; // Thêm userId
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Lấy thời gian hiện tại chuẩn SQL
    
    // YÊU CẦU BẮT BUỘC: Phải có userId (NguoiTaoChuongTrinhID) để lọc
    if (!userId) {
        return res.status(400).json({ success: false, message: 'Thiếu ID người dùng (userId) để truy vấn.' });
    }

    // KHỞI TẠO: Lọc theo NguoiTaoChuongTrinhID
    let sql = `
        SELECT 
            MaChuongTrinh, TenChuongTrinh, NgayGioBatDau, DiaDiem, Poster, TrangThai, MoTa, Slug 
        FROM ChuongTrinh
        WHERE 
            NguoiTaoChuongTrinhID = ? 
    `;
    let params = [userId]; // SỬ DỤNG userId TỪ FRONTEND

    // Thêm điều kiện lọc theo Trạng thái (statusFilter)
    if (statusFilter) {
        // 1. Logic cho SẮP TỚI (DangBan)
        if (statusFilter === 'DangBan') {
            // SỰ KIỆN SẮP TỚI: Ngày Bắt Đầu phải LỚN HƠN hoặc BẰNG thời gian hiện tại 
            // VÀ trạng thái phải là Đang Bán/Chờ Duyệt
            sql += ` AND NgayGioBatDau >= ? AND (TrangThai = 'DangBan' OR TrangThai = 'ChoDuyet')`;
            params.push(now);
        } 
        // 2. Logic cho ĐÃ QUA (DaDienRa)
        else if (statusFilter === 'KetThuc') {
            // SỰ KIỆN ĐÃ QUA:
            // HOẶC 1: Trạng thái đã là DaDienRa/Huy
            // HOẶC 2: Sự kiện đang là DangBan/ChoDuyet nhưng NGÀY ĐÃ QUÁ KHỨ (NgayGioBatDau < NOW())
            sql += ` AND (
                TrangThai = 'DaDienRa' 
                OR TrangThai = 'Huy' 
                OR (NgayGioBatDau < ? AND (TrangThai = 'DangBan' OR TrangThai = 'ChoDuyet')) 
            )`;
            params.push(now);
        } 
        // 3. Logic cho Chờ duyệt, Nháp, v.v. (chỉ lọc theo trạng thái)
        else {
            // Lọc chính xác theo trạng thái (ChoDuyet, Nháp,...)
            sql += ` AND TrangThai = ?`; 
            params.push(statusFilter);
        }
    }

    // Thêm điều kiện tìm kiếm theo tên
    if (searchQ) {
        sql += ` AND TenChuongTrinh LIKE ?`;
        params.push(`%${searchQ}%`);
    }
        
    // Sắp xếp các sự kiện SẮP TỚI lên đầu
    sql += ` ORDER BY NgayGioBatDau ASC;`; 

    db.query(sql, params, (err, results) => { 
        if (err) {
            console.error('Lỗi SQL truy vấn sự kiện của tôi:', err);
            return res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách sự kiện.' });
        }
        res.json({ success: true, events: results || [] });
    });
});

// ==================================================
// 1.3: QUÊN MẬT KHẨU (Sử dụng OTP 6 chữ số - GỬI EMAIL THẬT)
// ==================================================

// Hàm tạo mã OTP 6 chữ số ngẫu nhiên
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });
    }
    
    // 1. Kiểm tra email tồn tại trong DB
    const sql = `SELECT MaNMV FROM NguoiMuaVe WHERE Email = ?`;
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Lỗi SQL tìm email:', err);
            return res.status(500).json({ success: false, message: 'Lỗi server.' });
        }
        
        if (results.length === 0) {
            // Bảo mật: Vẫn thông báo chung chung dù email không tồn tại
            return res.json({ success: true, message: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi Mã OTP đặt lại mật khẩu.' });
        }
        
        const userId = results[0].MaNMV;
        
        // 2. Tạo Mã OTP 6 số và thời gian hết hạn (5 phút)
        const otpCode = generateOTP(); 
        const resetExpires = new Date(Date.now() + 300000); 

        // 3. Lưu OTP vào DB
        const updateSql = `UPDATE NguoiMuaVe SET ResetToken = ?, ResetExpires = ? WHERE MaNMV = ?`;
        db.query(updateSql, [otpCode, resetExpires, userId], (errUpdate) => {
            if (errUpdate) {
                console.error('Lỗi SQL cập nhật OTP:', errUpdate);
                return res.status(500).json({ success: false, message: 'Lỗi server khi tạo OTP.' });
            }
            
            // 4. GỬI EMAIL THẬT VỚI OTP
            const mailOptions = {
                to: email, 
                from: 'Festicket Support <EMAIL_CỦA_BẠN@gmail.com>', // <--- THAY THẾ EMAIL CỦA BẠN
                subject: 'Mã OTP Đặt Lại Mật Khẩu Festicket',
                html: `
                    <p>Xin chào,</p>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Festicket của mình.</p>
                    <p>Mã Xác Minh (OTP) của bạn là:</p>
                    <h2 style="color: #FF6A88; font-size: 24px; text-align: center;">${otpCode}</h2>
                    <p>Mã này sẽ hết hạn sau 5 phút. Vui lòng nhập mã này vào trang đặt lại mật khẩu để tiếp tục.</p>
                    <p style="color: #999;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('LỖI GỬI EMAIL:', error);
                    // Vẫn thông báo thành công cho người dùng dù lỗi gửi mail, để không lộ thông tin server
                    return res.json({ success: true, message: 'Đã tạo OTP, nhưng lỗi gửi email. Vui lòng kiểm tra console server.' });
                }
                console.log('Email gửi thành công: ' + info.response);
                
                // 5. Phản hồi thành công
                res.json({ success: true, message: '✅ Đã gửi Mã OTP 6 chữ số đến email của bạn. Mã sẽ hết hạn sau 5 phút.' });
            });
        });
    });
});

// ==================================================
// 1.4: ĐẶT LẠI MẬT KHẨU MỚI (Sử dụng OTP)
// ==================================================

app.post('/api/auth/reset-password', (req, res) => {
    // Lưu ý: 'token' ở đây chính là Mã OTP 6 chữ số từ Frontend
    const { token, email, newPassword } = req.body;
    
    if (!token || !email || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ.' });
    }

    // 1. Tìm người dùng dựa trên email VÀ token (OTP) VÀ đảm bảo token chưa hết hạn
    const sql = `
        SELECT MaNMV FROM NguoiMuaVe 
        WHERE Email = ? AND ResetToken = ? AND ResetExpires > CURRENT_TIMESTAMP()
    `;
    
    db.query(sql, [email, token], (err, results) => {
        if (err) {
            console.error('Lỗi SQL tìm OTP:', err);
            return res.status(500).json({ success: false, message: 'Lỗi server.' });
        }
        
        if (results.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mã OTP không hợp lệ, đã hết hạn hoặc email không chính xác.' 
            });
        }
        
        const userId = results[0].MaNMV;
        
        // 2. Mã hóa mật khẩu mới (BẮT BUỘC DÙNG BCrypt)
        bcrypt.hash(newPassword, saltRounds, (errHash, newHashedPassword) => {
            if (errHash) {
                console.error('Lỗi mã hóa mật khẩu:', errHash);
                return res.status(500).json({ success: false, message: 'Lỗi mã hóa mật khẩu.' });
            }
            
            // 3. Cập nhật mật khẩu, xóa token và thời hạn
            const updateSql = `
                UPDATE NguoiMuaVe 
                SET MatKhau = ?, ResetToken = NULL, ResetExpires = NULL 
                WHERE MaNMV = ?
            `;
            
            db.query(updateSql, [newHashedPassword, userId], (errUpdate) => {
                if (errUpdate) {
                    console.error('Lỗi SQL cập nhật mật khẩu:', errUpdate);
                    return res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu.' });
                }
                
                res.json({ 
                    success: true, 
                    message: '✅ Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' 
                });
            });
        });
    });
});
// Route phục vụ file HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'trangchu', 'trangchu.html'));
});


app.listen(3000, () => {
    console.log(`🚀 Server chạy tại http://localhost:3000`);
});











