CREATE DATABASE IF NOT EXISTS QuanLyBenhVien
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE QuanLyBenhVien;

-- =========================================================
-- 1. VAI TRÒ
-- =========================================================

CREATE TABLE VaiTro (
    MaVaiTro INT AUTO_INCREMENT PRIMARY KEY,
    TenVaiTro VARCHAR(100) NOT NULL,
    MoTa VARCHAR(255)
);

-- =========================================================
-- 2. NGƯỜI DÙNG
-- =========================================================

CREATE TABLE Nguoidung (
    MaNguoiDung INT AUTO_INCREMENT PRIMARY KEY,
    MaVaiTro INT NOT NULL,
    TenDangNhap VARCHAR(255) NOT NULL UNIQUE,
    MatKhau VARCHAR(255) NOT NULL,
    HoTen VARCHAR(100) NOT NULL,
    Email VARCHAR(255) UNIQUE,
    SoDienThoai VARCHAR(15),
    AnhDaiDien VARCHAR(255),
    TrangThai TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT FK_Nguoidung_VaiTro
        FOREIGN KEY (MaVaiTro)
        REFERENCES VaiTro(MaVaiTro),

    CONSTRAINT CK_Nguoidung_TrangThai
        CHECK (TrangThai IN (0,1))
);

-- =========================================================
-- 3. NHÓM QUYỀN
-- =========================================================

CREATE TABLE NhomQuyen (
    MaQuyen INT AUTO_INCREMENT PRIMARY KEY,
    TenQuyen VARCHAR(100) NOT NULL,
    MoTa VARCHAR(255)
);

-- =========================================================
-- 4. CHI TIẾT QUYỀN
-- =========================================================

CREATE TABLE CTQuyen (
    MaChiTietQuyen INT AUTO_INCREMENT PRIMARY KEY,
    MaVaiTro INT NOT NULL,
    MaQuyen INT NOT NULL,

    QuyenXem TINYINT(1) NOT NULL DEFAULT 0,
    QuyenThem TINYINT(1) NOT NULL DEFAULT 0,
    QuyenSua TINYINT(1) NOT NULL DEFAULT 0,
    QuyenXoa TINYINT(1) NOT NULL DEFAULT 0,

    CONSTRAINT FK_CTQuyen_VaiTro
        FOREIGN KEY (MaVaiTro)
        REFERENCES VaiTro(MaVaiTro),

    CONSTRAINT FK_CTQuyen_NhomQuyen
        FOREIGN KEY (MaQuyen)
        REFERENCES NhomQuyen(MaQuyen),

    CONSTRAINT UQ_CTQuyen_VaiTro_Quyen
        UNIQUE (MaVaiTro, MaQuyen),

    CONSTRAINT CK_CTQuyen_Xem
        CHECK (QuyenXem IN (0,1)),

    CONSTRAINT CK_CTQuyen_Them
        CHECK (QuyenThem IN (0,1)),

    CONSTRAINT CK_CTQuyen_Sua
        CHECK (QuyenSua IN (0,1)),

    CONSTRAINT CK_CTQuyen_Xoa
        CHECK (QuyenXoa IN (0,1))
);

-- =========================================================
-- 5. BỆNH NHÂN
-- =========================================================

CREATE TABLE BenhNhan (
    MaBenhNhan INT AUTO_INCREMENT PRIMARY KEY,
    MaNguoiDung INT NOT NULL UNIQUE,
    NgaySinh DATE,
    GioiTinh VARCHAR(10),
    DiaChi VARCHAR(255),
    SoDienThoaiKhanCap VARCHAR(15),
    TienSuBenh TEXT,

    CONSTRAINT FK_BenhNhan_Nguoidung
        FOREIGN KEY (MaNguoiDung)
        REFERENCES Nguoidung(MaNguoiDung)
);

-- =========================================================
-- 6. KHOA
-- =========================================================

CREATE TABLE Khoa (
    MaKhoa INT AUTO_INCREMENT PRIMARY KEY,
    TenKhoa VARCHAR(100) NOT NULL,
    MoTa VARCHAR(255)
);

-- =========================================================
-- 7. BÁC SĨ
-- =========================================================

CREATE TABLE BacSi (
    MaBacSi INT AUTO_INCREMENT PRIMARY KEY,
    MaNguoiDung INT NOT NULL UNIQUE,
    MaKhoa INT NOT NULL,
    ChuyenMon VARCHAR(255),
    TrinhDo VARCHAR(100),
    SoChungChiHanhNghe VARCHAR(100),
    TrangThai TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT FK_BacSi_Nguoidung
        FOREIGN KEY (MaNguoiDung)
        REFERENCES Nguoidung(MaNguoiDung),

    CONSTRAINT FK_BacSi_Khoa
        FOREIGN KEY (MaKhoa)
        REFERENCES Khoa(MaKhoa),

    CONSTRAINT CK_BacSi_TrangThai
        CHECK (TrangThai IN (0,1))
);

-- =========================================================
-- 8. PHÒNG CHUYÊN TRÁCH
-- =========================================================

CREATE TABLE PhongChuyenTrach (
    MaPhong INT AUTO_INCREMENT PRIMARY KEY,
    MaKhoa INT NOT NULL,
    TenPhong VARCHAR(100) NOT NULL,
    LoaiPhong VARCHAR(100),
    ViTri VARCHAR(255),
    TrangThai TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT FK_PhongChuyenTrach_Khoa
        FOREIGN KEY (MaKhoa)
        REFERENCES Khoa(MaKhoa),

    CONSTRAINT CK_PhongChuyenTrach_TrangThai
        CHECK (TrangThai IN (0,1))
);

-- =========================================================
-- 9. LỊCH LÀM VIỆC
-- =========================================================

CREATE TABLE LichLamViec (
    MaLichLamViec INT AUTO_INCREMENT PRIMARY KEY,
    MaBacSi INT NOT NULL,
    MaPhong INT,
    NgayLamViec DATE NOT NULL,
    GioBatDau TIME NOT NULL,
    GioKetThuc TIME NOT NULL,
    TrangThai VARCHAR(50),

    CONSTRAINT FK_LichLamViec_BacSi
        FOREIGN KEY (MaBacSi)
        REFERENCES BacSi(MaBacSi),

    CONSTRAINT FK_LichLamViec_Phong
        FOREIGN KEY (MaPhong)
        REFERENCES PhongChuyenTrach(MaPhong),

    CONSTRAINT CK_LichLamViec_ThoiGian
        CHECK (GioKetThuc > GioBatDau)
);

-- =========================================================
-- 10. SỐ THỨ TỰ
-- =========================================================

CREATE TABLE SoThuTu (
    MaSoThuTu INT AUTO_INCREMENT PRIMARY KEY,
    SoThuTu INT NOT NULL,
    MaKhoa INT NOT NULL,
    NgayCapSo DATE NOT NULL,
    TrangThai VARCHAR(50),
    ThoiGianTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_SoThuTu_Khoa
        FOREIGN KEY (MaKhoa)
        REFERENCES Khoa(MaKhoa),

    CONSTRAINT CK_SoThuTu_SoThuTu
        CHECK (SoThuTu > 0),

    CONSTRAINT UQ_SoThuTu
        UNIQUE (MaKhoa, NgayCapSo, SoThuTu)
);

-- =========================================================
-- 11. LỊCH ĐĂNG KÝ KHÁM
-- =========================================================

CREATE TABLE LichDangKyKham (
    MaLichKham INT AUTO_INCREMENT PRIMARY KEY,
    MaBenhNhan INT NOT NULL,
    MaBacSi INT NOT NULL,
    MaKhoa INT NOT NULL,
    MaSoThuTu INT NOT NULL,
    NgayKham DATE NOT NULL,
    GioKham TIME NOT NULL,
    LyDoKham VARCHAR(255),
    NgayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'ChoKham',

    CONSTRAINT FK_LichDangKyKham_BenhNhan
        FOREIGN KEY (MaBenhNhan)
        REFERENCES BenhNhan(MaBenhNhan),

    CONSTRAINT FK_LichDangKyKham_BacSi
        FOREIGN KEY (MaBacSi)
        REFERENCES BacSi(MaBacSi),

    CONSTRAINT FK_LichDangKyKham_Khoa
        FOREIGN KEY (MaKhoa)
        REFERENCES Khoa(MaKhoa),

    CONSTRAINT FK_LichDangKyKham_SoThuTu
        FOREIGN KEY (MaSoThuTu)
        REFERENCES SoThuTu(MaSoThuTu)
);

-- =========================================================
-- 12. TIẾP NHẬN BỆNH NHÂN
-- =========================================================

CREATE TABLE TiepNhanBenhNhan (
    MaTiepNhan INT AUTO_INCREMENT PRIMARY KEY,
    MaLichKham INT NOT NULL,
    ThoiGianTiepNhan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(50),
    GhiChu VARCHAR(255),

    CONSTRAINT FK_TiepNhanBenhNhan_LichKham
        FOREIGN KEY (MaLichKham)
        REFERENCES LichDangKyKham(MaLichKham)
);

-- =========================================================
-- 13. HỒ SƠ BỆNH ÁN
-- =========================================================

CREATE TABLE HoSoBenhAn (
    MaHoSoBenhAn INT AUTO_INCREMENT PRIMARY KEY,
    MaLichKham INT NOT NULL UNIQUE,
    TrieuChung TEXT,
    ChanDoan TEXT,
    KetLuan TEXT,
    HuongDieuTri TEXT,
    QRToken VARCHAR(255) UNIQUE,
    NgayTaiKham DATE,
    GhiChuTaiKham VARCHAR(255),
    TrangThai VARCHAR(50) NOT NULL DEFAULT 'DangKham',

    CONSTRAINT FK_HoSoBenhAn_LichKham
        FOREIGN KEY (MaLichKham)
        REFERENCES LichDangKyKham(MaLichKham),

    CONSTRAINT CK_HoSoBenhAn_TrangThai
        CHECK (TrangThai IN ('DangKham', 'HoanTat'))
);

-- =========================================================
-- 14. DỊCH VỤ Y TẾ
-- =========================================================

CREATE TABLE DichVuYTe (
    MaDichVu INT AUTO_INCREMENT PRIMARY KEY,
    TenDichVu VARCHAR(255) NOT NULL,
    LoaiDichVu VARCHAR(100),
    MoTa VARCHAR(255),
    Gia DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT CK_DichVuYTe_Gia
        CHECK (Gia >= 0)
);

-- =========================================================
-- 15. CHỈ ĐỊNH Y TẾ
-- =========================================================

CREATE TABLE ChiDinhYTe (
    MaChiDinh INT AUTO_INCREMENT PRIMARY KEY,
    MaHoSoBenhAn INT NOT NULL,
    MaDichVu INT NOT NULL,
    MaPhong INT,
    NgayChiDinh DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    LoaiChiDinh VARCHAR(100),
    TrangThai VARCHAR(50),

    CONSTRAINT FK_ChiDinhYTe_HoSo
        FOREIGN KEY (MaHoSoBenhAn)
        REFERENCES HoSoBenhAn(MaHoSoBenhAn),

    CONSTRAINT FK_ChiDinhYTe_DichVu
        FOREIGN KEY (MaDichVu)
        REFERENCES DichVuYTe(MaDichVu),

    CONSTRAINT FK_ChiDinhYTe_Phong
        FOREIGN KEY (MaPhong)
        REFERENCES PhongChuyenTrach(MaPhong)
);

-- =========================================================
-- 16. KẾT QUẢ DỊCH VỤ
-- =========================================================

CREATE TABLE KetQuaDichVu (
    MaKetQua INT AUTO_INCREMENT PRIMARY KEY,
    MaChiDinh INT NOT NULL UNIQUE,
    NgayCoKetQua DATETIME,
    NoiDungKetQua TEXT,
    KetLuan TEXT,
    FileURL VARCHAR(500),
    TrangThai VARCHAR(50),

    CONSTRAINT FK_KetQuaDichVu_ChiDinh
        FOREIGN KEY (MaChiDinh)
        REFERENCES ChiDinhYTe(MaChiDinh)
);

-- =========================================================
-- 17. CHI TIẾT KẾT QUẢ
-- =========================================================

CREATE TABLE ChiTietKetQua (
    MaChiTietKetQua INT AUTO_INCREMENT PRIMARY KEY,
    MaKetQua INT NOT NULL,
    TenChiSo VARCHAR(255) NOT NULL,
    GiaTri DECIMAL(15,4),
    DonVi VARCHAR(50),
    GiaTriThamChieu VARCHAR(255),
    TrangThai VARCHAR(50),

    CONSTRAINT FK_ChiTietKetQua_KetQua
        FOREIGN KEY (MaKetQua)
        REFERENCES KetQuaDichVu(MaKetQua)
        ON DELETE CASCADE
);

-- =========================================================
-- 18. THUỐC
-- =========================================================

CREATE TABLE Thuoc (
    MaThuoc INT AUTO_INCREMENT PRIMARY KEY,
    TenThuoc VARCHAR(255) NOT NULL,
    DonViTinh VARCHAR(50),
    NhaSanXuat VARCHAR(255),
    Gia DECIMAL(15,2) NOT NULL DEFAULT 0,
    MoTa VARCHAR(255),
    TrangThai TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT CK_Thuoc_Gia
        CHECK (Gia >= 0),

    CONSTRAINT CK_Thuoc_TrangThai
        CHECK (TrangThai IN (0,1))
);

-- =========================================================
-- 19. KHO THUỐC
-- =========================================================

CREATE TABLE KhoThuoc (
    MaKhoThuoc INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT NOT NULL,
    SoLuongTon INT NOT NULL DEFAULT 0,
    SoLo VARCHAR(100) NOT NULL,
    HanSuDung DATE NOT NULL,
    SoLuongToiThieu INT NOT NULL DEFAULT 0,
    ThoiGianCapNhatCuoi DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT FK_KhoThuoc_Thuoc
        FOREIGN KEY (MaThuoc)
        REFERENCES Thuoc(MaThuoc),

    CONSTRAINT CK_KhoThuoc_SoLuongTon
        CHECK (SoLuongTon >= 0),

    CONSTRAINT CK_KhoThuoc_SoLuongToiThieu
        CHECK (SoLuongToiThieu >= 0),

    CONSTRAINT UQ_KhoThuoc_Thuoc_SoLo
        UNIQUE (MaThuoc, SoLo)
);

-- =========================================================
-- 20. THUỐC TƯƠNG ĐƯƠNG
-- =========================================================

CREATE TABLE ThuocTuongDuong (
    MaThuocTuongDuong INT AUTO_INCREMENT PRIMARY KEY,
    MaThuoc INT NOT NULL,
    MaThuocThayThe INT NOT NULL,
    GhiChu VARCHAR(255),
    TrangThai VARCHAR(50),

    CONSTRAINT FK_ThuocTuongDuong_Thuoc
        FOREIGN KEY (MaThuoc)
        REFERENCES Thuoc(MaThuoc),

    CONSTRAINT FK_ThuocTuongDuong_ThuocThayThe
        FOREIGN KEY (MaThuocThayThe)
        REFERENCES Thuoc(MaThuoc),

    CONSTRAINT UQ_ThuocTuongDuong
        UNIQUE (MaThuoc, MaThuocThayThe),

    CONSTRAINT CK_ThuocTuongDuong_KhacNhau
        CHECK (MaThuoc <> MaThuocThayThe)
);

-- =========================================================
-- 21. ĐƠN THUỐC
-- =========================================================

CREATE TABLE DonThuoc (
    MaDonThuoc INT AUTO_INCREMENT PRIMARY KEY,
    MaHoSoBenhAn INT NOT NULL,
    MaBacSi INT NOT NULL,
    NgayKeThuoc DATETIME NOT NULL,
    ChanDoan TEXT,
    GhiChu VARCHAR(255),
    TrangThai VARCHAR(50),

    CONSTRAINT FK_DonThuoc_HoSo
        FOREIGN KEY (MaHoSoBenhAn)
        REFERENCES HoSoBenhAn(MaHoSoBenhAn),

    CONSTRAINT FK_DonThuoc_BacSi
        FOREIGN KEY (MaBacSi)
        REFERENCES BacSi(MaBacSi)
);

-- =========================================================
-- 22. CHI TIẾT ĐƠN THUỐC
-- =========================================================

CREATE TABLE CTDonThuoc (
    MaCTDonThuoc INT AUTO_INCREMENT PRIMARY KEY,
    MaDonThuoc INT NOT NULL,
    MaThuoc INT NOT NULL,
    DonGiaBan DECIMAL(15,2) NOT NULL DEFAULT 0,
    SoLuong INT NOT NULL,
    LieuDung VARCHAR(255),
    ThoiGianDung INT,
    HuongDanSuDung VARCHAR(500),

    CONSTRAINT FK_CTDonThuoc_DonThuoc
        FOREIGN KEY (MaDonThuoc)
        REFERENCES DonThuoc(MaDonThuoc),

    CONSTRAINT FK_CTDonThuoc_Thuoc
        FOREIGN KEY (MaThuoc)
        REFERENCES Thuoc(MaThuoc),

    CONSTRAINT CK_CTDonThuoc_DonGiaBan
        CHECK (DonGiaBan >= 0),

    CONSTRAINT CK_CTDonThuoc_SoLuong
        CHECK (SoLuong > 0),

    CONSTRAINT CK_CTDonThuoc_ThoiGianDung
        CHECK (ThoiGianDung IS NULL OR ThoiGianDung > 0)
);

-- =========================================================
-- 23. HÓA ĐƠN
-- =========================================================

CREATE TABLE HoaDon (
    MaHoaDon INT AUTO_INCREMENT PRIMARY KEY,
    MaBenhNhan INT NOT NULL,
    MaLichKham INT NOT NULL UNIQUE,
    NgayLapHoaDon DATETIME NOT NULL,
    TongTien DECIMAL(15,2) NOT NULL DEFAULT 0,
    TrangThai VARCHAR(50),

    CONSTRAINT FK_HoaDon_BenhNhan
        FOREIGN KEY (MaBenhNhan)
        REFERENCES BenhNhan(MaBenhNhan),

    CONSTRAINT FK_HoaDon_LichKham
        FOREIGN KEY (MaLichKham)
        REFERENCES LichDangKyKham(MaLichKham),

    CONSTRAINT CK_HoaDon_TongTien
        CHECK (TongTien >= 0)
);

-- =========================================================
-- 24. CHI TIẾT HÓA ĐƠN
-- =========================================================

CREATE TABLE CTHoaDon (
    MaCTHoaDon INT AUTO_INCREMENT PRIMARY KEY,
    MaHoaDon INT NOT NULL,
    MaChiDinh INT NULL,
    MaCTDonThuoc INT NULL,
    NoiDung VARCHAR(255),
    SoLuong INT NOT NULL DEFAULT 1,
    DonGia DECIMAL(15,2) NOT NULL DEFAULT 0,
    ThanhTien DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT FK_CTHoaDon_HoaDon
        FOREIGN KEY (MaHoaDon)
        REFERENCES HoaDon(MaHoaDon),

    CONSTRAINT FK_CTHoaDon_ChiDinh
        FOREIGN KEY (MaChiDinh)
        REFERENCES ChiDinhYTe(MaChiDinh),

    CONSTRAINT FK_CTHoaDon_CTDonThuoc
        FOREIGN KEY (MaCTDonThuoc)
        REFERENCES CTDonThuoc(MaCTDonThuoc),

    CONSTRAINT CK_CTHoaDon_SoLuong
        CHECK (SoLuong > 0),

    CONSTRAINT CK_CTHoaDon_DonGia
        CHECK (DonGia >= 0),

    CONSTRAINT CK_CTHoaDon_ThanhTien
        CHECK (ThanhTien >= 0),

    CONSTRAINT CK_CTHoaDon_Nguon
        CHECK (
            (MaChiDinh IS NOT NULL AND MaCTDonThuoc IS NULL)
            OR
            (MaChiDinh IS NULL AND MaCTDonThuoc IS NOT NULL)
        )
);

-- =========================================================
-- 25. THANH TOÁN
-- =========================================================

CREATE TABLE ThanhToan (
    MaThanhToan INT AUTO_INCREMENT PRIMARY KEY,
    MaHoaDon INT NOT NULL,
    NgayThanhToan DATETIME NOT NULL,
    SoTien DECIMAL(15,2) NOT NULL,
    PhuongThucThanhToan VARCHAR(50) NOT NULL,
    TrangThai VARCHAR(50),
    MaGiaoDich VARCHAR(255),

    CONSTRAINT FK_ThanhToan_HoaDon
        FOREIGN KEY (MaHoaDon)
        REFERENCES HoaDon(MaHoaDon),

    CONSTRAINT CK_ThanhToan_SoTien
        CHECK (SoTien > 0),

    CONSTRAINT CK_ThanhToan_PhuongThuc
        CHECK (
            PhuongThucThanhToan IN ('Tiền mặt', 'Chuyển khoản')
        )
);

-- =========================================================
-- 26. THÔNG BÁO
-- =========================================================

CREATE TABLE ThongBao (
    MaThongBao INT AUTO_INCREMENT PRIMARY KEY,
    MaNguoiDung INT NOT NULL,
    TieuDe VARCHAR(255) NOT NULL,
    NoiDung TEXT,
    LoaiThongBao VARCHAR(100),
    NgayTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DaDoc TINYINT(1) NOT NULL DEFAULT 0,
    TrangThai VARCHAR(50),

    CONSTRAINT FK_ThongBao_Nguoidung
        FOREIGN KEY (MaNguoiDung)
        REFERENCES Nguoidung(MaNguoiDung),

    CONSTRAINT CK_ThongBao_DaDoc
        CHECK (DaDoc IN (0,1))
);

-- =========================================================
-- 27. DANH MỤC TIN TỨC
-- =========================================================

CREATE TABLE DanhMucTinTuc (
    MaDanhMuc INT AUTO_INCREMENT PRIMARY KEY,
    TenDanhMuc VARCHAR(100) NOT NULL,
    MoTa VARCHAR(255)
);

-- =========================================================
-- 28. TIN TỨC
-- =========================================================

CREATE TABLE TinTuc (
    MaTinTuc INT AUTO_INCREMENT PRIMARY KEY,
    MaDanhMuc INT NOT NULL,
    TieuDe VARCHAR(255) NOT NULL,
    NoiDung TEXT NOT NULL,
    ImageURL VARCHAR(500),
    NgayDang DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TrangThai VARCHAR(50),

    CONSTRAINT FK_TinTuc_DanhMuc
        FOREIGN KEY (MaDanhMuc)
        REFERENCES DanhMucTinTuc(MaDanhMuc)
);

-- =========================================================
-- 29. PHIÊN TRÒ CHUYỆN
-- =========================================================

CREATE TABLE PhienTroChuyen (
    MaPhien INT AUTO_INCREMENT PRIMARY KEY,
    MaNguoiDung INT NOT NULL,
    ThoiGianBatDau DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ThoiGianKetThuc DATETIME NULL,
    TrangThai VARCHAR(50),

    CONSTRAINT FK_PhienTroChuyen_Nguoidung
        FOREIGN KEY (MaNguoiDung)
        REFERENCES Nguoidung(MaNguoiDung)
);

-- =========================================================
-- 30. TIN NHẮN
-- =========================================================

CREATE TABLE TinNhan (
    MaTinNhan INT AUTO_INCREMENT PRIMARY KEY,
    MaPhien INT NOT NULL,
    NoiDung TEXT NOT NULL,
    NguoiGui VARCHAR(20) NOT NULL,
    ThoiGianTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_TinNhan_Phien
        FOREIGN KEY (MaPhien)
        REFERENCES PhienTroChuyen(MaPhien),

    CONSTRAINT CK_TinNhan_NguoiGui
        CHECK (NguoiGui IN ('NguoiDung', 'AI'))
);

-- =========================================================
-- 31. CHỈ SỐ DỊCH VỤ
-- =========================================================

CREATE TABLE ChiSoDichVu (
    MaChiSoDichVu INT AUTO_INCREMENT PRIMARY KEY,
    MaDichVu INT NOT NULL,
    TenChiSo VARCHAR(255) NOT NULL,
    DonVi VARCHAR(50),
    GiaTriThamChieu VARCHAR(255),
    MoTa VARCHAR(255),
    TrangThai TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT FK_ChiSoDichVu_DichVu
        FOREIGN KEY (MaDichVu)
        REFERENCES DichVuYTe(MaDichVu),

    CONSTRAINT CK_ChiSoDichVu_TrangThai
        CHECK (TrangThai IN (0,1))
);
-- =========================================================
-- 32. AUDIT LOG
-- =========================================================

CREATE TABLE AuditLog (
    MaAuditLog BIGINT AUTO_INCREMENT PRIMARY KEY,
    MaNguoiDung INT NULL,
    HanhDong VARCHAR(100) NOT NULL,
    DoiTuong VARCHAR(100) NOT NULL,
    MaDoiTuong VARCHAR(100) NULL,
    NoiDung TEXT NULL,
    DiaChiIP VARCHAR(45) NULL,
    ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_AuditLog_Nguoidung
        FOREIGN KEY (MaNguoiDung)
        REFERENCES Nguoidung(MaNguoiDung)
);
-- =================================
-- OTP
-- =================================
CREATE TABLE IF NOT EXISTS PasswordResetOtp (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expiresAt DATETIME NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME NOT NULL,
     -- Token được tạo sau khi OTP xác thực thành công
    resetToken VARCHAR(255) UNIQUE,
    -- Thời gian hết hạn của reset token
    resetTokenExpiresAt DATETIME
);

select * from PasswordResetOtp;
SELECT *
FROM PasswordResetOtp
ORDER BY id DESC;

DESCRIBE PasswordResetOtp;

-- ============================================================
-- INSERT DỮ LIỆU
-- ============================================================

-- Vai trò
SELECT *FROM VaiTro;
INSERT INTO VaiTro (TenVaiTro, MoTa)
VALUES
('ADMIN', 'Quản trị viên'),
('BACSI', 'Bác sĩ'),
('TIEPNHAN', 'Nhân viên tiếp nhận'),
('DUOCSI', 'Dược sĩ'),
('CHUYENTRAch', 'Nhân viên phòng chuyên trách'),
('BENHNHAN', 'Bệnh nhân');

-- Người dùng
INSERT INTO Nguoidung
(
    TenDangNhap,
    HoTen,
    Email,
    MatKhau,
    SoDienThoai,
    AnhDaiDien,
    MaVaiTro,
    TrangThai
)
VALUES
(
    'admin',
    'Nguyễn Văn Admin',
    'admin@gmail.com',
    '123456',
    '0900000001',
    NULL,
    1,
    1
),
(
    'bacsi',
    'Nguyễn Văn An',
    'bacsi@gmail.com',
    '123456',
    '0900000002',
    NULL,
    2,
    1
),
(
    'tiepnhan',
    'Trần Thị Bình',
    'tiepnhan@gmail.com',
    '123456',
    '0900000003',
    NULL,
    3,
    1
),
(
    'duocsi',
    'Lê Thị Hoa',
    'duocsi@gmail.com',
    '123456',
    '0900000004',
    NULL,
    4,
    1
),
(
    'benhnhan',
    'Phạm Văn Nam',
    'benhnhan@gmail.com',
    '123456',
    '0900000005',
    NULL,
    6,
    1
);
INSERT INTO Nguoidung
(
    MaVaiTro,
    TenDangNhap,
    MatKhau,
    HoTen,
    Email,
    SoDienThoai,
    TrangThai
)
VALUES
(
    5,
    'chuyentrach',
    '$2a$10$Hiw0TXoAjBsWvCO.TMAKlOzOV3cAjFMWeCoo8Yzd0g8ATB8dnVe8u',
    'Nhân viên chuyên trách',
    'chuyentrach@gmail.com',
    '0900000005',
    1
);
INSERT INTO Nguoidung
(MaVaiTro, TenDangNhap, MatKhau, HoTen, Email, SoDienThoai, TrangThai)
VALUES
(
    2,
    'bacsi2',
    '$2a$10$Hiw0TXoAjBsWvCO.TMAKlOzOV3cAjFMWeCoo8Yzd0g8ATB8dnVe8u',
    'Trần Thị Bình',
    'bacsi2@gmail.com',
    '0900000006',
    1
),
(
    2,
    'bacsi3',
    '$2a$10$Hiw0TXoAjBsWvCO.TMAKlOzOV3cAjFMWeCoo8Yzd0g8ATB8dnVe8u',
    'Lê Văn Cường',
    'bacsi3@gmail.com',
    '0900000007',
    1
),
(
    2,
    'bacsi4',
    '$2a$10$Hiw0TXoAjBsWvCO.TMAKlOzOV3cAjFMWeCoo8Yzd0g8ATB8dnVe8u',
    'Phạm Thị Dung',
    'bacsi4@gmail.com',
    '0900000008',
    1
);

-- KHOA
INSERT INTO Khoa (TenKhoa, MoTa) VALUES
('Khoa Nội', 'Khám và điều trị các bệnh lý nội khoa'),
('Khoa Ngoại', 'Khám và điều trị các bệnh lý ngoại khoa'),
('Khoa Nhi', 'Khám và điều trị bệnh cho trẻ em'),
('Khoa Sản', 'Khám và chăm sóc sức khỏe sản phụ'),
('Khoa Tim mạch', 'Khám và điều trị các bệnh lý tim mạch'),
('Khoa Tai Mũi Họng', 'Khám và điều trị bệnh tai mũi họng'),
('Khoa Răng Hàm Mặt', 'Khám và điều trị các bệnh răng hàm mặt'),
('Khoa Da liễu', 'Khám và điều trị các bệnh về da'),
('Khoa Mắt', 'Khám và điều trị các bệnh về mắt'),
('Khoa Cấp cứu', 'Tiếp nhận và xử lý các trường hợp cấp cứu');

-- BÁC SĨ 
INSERT INTO BacSi
(MaNguoiDung, MaKhoa, ChuyenMon, TrinhDo, SoChungChiHanhNghe, TrangThai)
VALUES
(2, 1, 'Nội tổng quát', 'Bác sĩ chuyên khoa I', 'CCHN-BS-0001', 1),
(7,2,'Ngoại tổng quát','Bác sĩ chuyên khoa I','CCHN-BS-0002',1),
(8,3,'Nhi khoa','Bác sĩ chuyên khoa I','CCHN-BS-0003',1),
(9,5,'Tim mạch','Bác sĩ chuyên khoa II','CCHN-BS-0004',1);

-- DỊCH VỤ Y TẾ 
INSERT INTO DichVuYTe
(TenDichVu, LoaiDichVu, MoTa, Gia)
VALUES
('Xét nghiệm công thức máu', 'Xét nghiệm','Đánh giá các thành phần tế bào máu', 150000),
('Xét nghiệm đường huyết', 'Xét nghiệm', 'Đo nồng độ glucose trong máu', 80000),
('Xét nghiệm chức năng gan', 'Xét nghiệm','Đánh giá chức năng gan thông qua các chỉ số men gan', 180000),
('Xét nghiệm chức năng thận', 'Xét nghiệm','Đánh giá chức năng thận', 180000),
('Siêu âm ổ bụng', 'Siêu âm','Khảo sát các cơ quan trong ổ bụng', 200000),
('Siêu âm tim', 'Siêu âm','Đánh giá cấu trúc và chức năng tim', 250000),
('X-quang ngực', 'Chẩn đoán hình ảnh','Chụp X-quang vùng ngực', 180000),
('X-quang xương', 'Chẩn đoán hình ảnh','Chụp X-quang hệ thống xương', 150000),
('Điện tim', 'Thăm dò chức năng','Ghi điện tâm đồ', 120000),
('Nội soi dạ dày', 'Nội soi','Nội soi kiểm tra thực quản và dạ dày', 500000),
('Xét nghiệm HbA1c','Xét nghiệm', 'Đánh giá mức đường huyết trung bình trong khoảng 2 đến 3 tháng',150000),
('Xét nghiệm mỡ máu','Xét nghiệm','Định lượng cholesterol và các thành phần lipid trong máu', 200000),
('Xét nghiệm acid uric','Xét nghiệm','Định lượng acid uric trong máu',90000),
('Xét nghiệm tổng phân tích nước tiểu','Xét nghiệm','Phân tích các chỉ số hóa lý và tế bào trong nước tiểu',100000),
('Xét nghiệm nhóm máu ABO','Xét nghiệm','Xác định nhóm máu hệ ABO',80000),
('Xét nghiệm Rh', 'Xét nghiệm','Xác định yếu tố Rh trong máu', 80000),
('Xét nghiệm CRP', 'Xét nghiệm', 'Đánh giá tình trạng viêm trong cơ thể', 120000),
('Xét nghiệm viêm gan B','Xét nghiệm', 'Xét nghiệm sàng lọc virus viêm gan B',150000),
('X-quang cột sống', 'Chẩn đoán hình ảnh','Chụp X-quang đánh giá cấu trúc cột sống',180000),
('Siêu âm tuyến giáp','Chẩn đoán hình ảnh','Khảo sát cấu trúc và các tổn thương tuyến giáp',180000),
('Siêu âm tuyến vú','Chẩn đoán hình ảnh','Khảo sát mô tuyến vú và phát hiện các bất thường',200000),
('Siêu âm sản khoa','Chẩn đoán hình ảnh', 'Siêu âm đánh giá thai và các cấu trúc liên quan',200000),
('Siêu âm Doppler mạch máu','Chẩn đoán hình ảnh','Đánh giá dòng chảy của máu trong hệ thống mạch',250000),
('Đo huyết áp', 'Thăm dò chức năng','Đo và ghi nhận chỉ số huyết áp của người bệnh',50000),
('Đo chức năng hô hấp','Thăm dò chức năng','Đánh giá chức năng thông khí của phổi',150000),
('Điện não đồ','Thăm dò chức năng','Ghi nhận hoạt động điện của não',250000),
('Nội soi đại tràng','Nội soi','Khảo sát trực tràng và đại tràng bằng nội soi', 700000),
('Nội soi tai mũi họng','Nội soi', 'Khảo sát các cấu trúc vùng tai, mũi và họng', 200000),
('Khám Nội tổng quát','Khám chuyên khoa','Khám và đánh giá các bệnh lý nội khoa thường gặp', 100000),
('Khám Tim mạch','Khám chuyên khoa','Khám và đánh giá các bệnh lý tim mạch', 120000);
 
-- CHỈ SỐ DỊCH VỤ 
INSERT INTO ChiSoDichVu
(MaDichVu, TenChiSo, DonVi, GiaTriThamChieu, MoTa, TrangThai)
VALUES
-- 1. Xét nghiệm công thức máu
(1, 'RBC', 'T/L', 'Nữ: 3.8 - 5.2 | Nam: 4.2 - 5.8','Số lượng hồng cầu', 1),
(1, 'WBC', 'G/L', '4.0 - 10.0','Số lượng bạch cầu', 1),
(1, 'HGB', 'g/dL', 'Nữ: 12.0 - 16.0 | Nam: 13.0 - 17.0','Nồng độ huyết sắc tố', 1),
(1, 'PLT', 'G/L', '150 - 450','Số lượng tiểu cầu', 1),
(1, 'HCT', '%', 'Nữ: 36 - 46 | Nam: 40 - 50', 'Dung tích hồng cầu', 1),
-- 2. Xét nghiệm đường huyết
(2, 'Glucose', 'mmol/L', '3.9 - 6.4','Nồng độ glucose trong máu', 1),
-- 3. Xét nghiệm chức năng gan
(3, 'AST', 'U/L', 'Nam: < 40 | Nữ: < 35','Men gan AST', 1),
(3, 'ALT', 'U/L', 'Nam: < 41 | Nữ: < 33', 'Men gan ALT', 1),
-- 4. Xét nghiệm chức năng thận
(4, 'Creatinine', 'µmol/L', 'Nam: 62 - 120 | Nữ: 53 - 100', 'Nồng độ Creatinine trong máu', 1),
(4, 'Ure', 'mmol/L', '2.5 - 7.5','Nồng độ Ure trong máu', 1);
INSERT INTO ChiSoDichVu
(MaDichVu, TenChiSo, DonVi, GiaTriThamChieu, MoTa, TrangThai)
VALUES
-- 11. Xét nghiệm HbA1c
(11, 'HbA1c', '%', '< 5.7', 'Tỷ lệ Hemoglobin gắn glucose trong máu', 1),
-- 12. Xét nghiệm mỡ máu
(12, 'Cholesterol toàn phần', 'mmol/L', '< 5.2','Nồng độ cholesterol toàn phần trong máu', 1),
(12, 'Triglyceride', 'mmol/L', '< 1.7','Nồng độ triglyceride trong máu', 1),
(12, 'HDL-C', 'mmol/L', '> 1.0','Lipoprotein cholesterol tỷ trọng cao', 1),
(12, 'LDL-C', 'mmol/L', '< 3.4','Lipoprotein cholesterol tỷ trọng thấp', 1),
-- 13. Xét nghiệm acid uric
(13, 'Acid uric', 'µmol/L','Nam: 210 - 420 | Nữ: 150 - 360','Nồng độ acid uric trong máu', 1),
-- 14. Tổng phân tích nước tiểu
(14, 'pH', '','5.0 - 8.0','Độ pH của nước tiểu', 1),
(14, 'Protein', '','Âm tính','Định tính protein trong nước tiểu', 1),
(14, 'Glucose', '','Âm tính', 'Định tính glucose trong nước tiểu', 1),
(14, 'Hồng cầu', 'Tế bào/µL', 'Âm tính hoặc trong giới hạn cho phép','Phát hiện hồng cầu trong nước tiểu', 1),
(14, 'Bạch cầu', 'Tế bào/µL','Âm tính hoặc trong giới hạn cho phép','Phát hiện bạch cầu trong nước tiểu', 1),
-- 15. Xét nghiệm nhóm máu ABO
(15, 'Nhóm máu ABO', '','A / B / AB / O','Xác định nhóm máu hệ ABO', 1),
-- 16. Xét nghiệm Rh
(16, 'Yếu tố Rh', '','Dương tính / Âm tính','Xác định yếu tố Rh của người bệnh', 1),
-- 17. Xét nghiệm CRP
(17, 'CRP', 'mg/L', '< 5','Đánh giá tình trạng viêm trong cơ thể', 1),
-- 18. Xét nghiệm viêm gan B
(18, 'HBsAg', '','Âm tính', 'Xét nghiệm sàng lọc kháng nguyên bề mặt virus viêm gan B', 1);

-- PHÒNG CHUYÊN TRÁCH
INSERT INTO PhongChuyenTrach
(MaKhoa, TenPhong, LoaiPhong, ViTri, TrangThai)
VALUES
(1, 'Phòng Xét nghiệm', 'Xét nghiệm', 'Tầng 1 - Khu A', 1),
(1, 'Phòng Siêu âm', 'Siêu âm', 'Tầng 1 - Khu B', 1),
(2, 'Phòng X-quang', 'Chẩn đoán hình ảnh', 'Tầng 1 - Khu C', 1),
(5, 'Phòng Điện tim', 'Điện tim', 'Tầng 2 - Khu A', 1),
(6, 'Phòng Nội soi Tai Mũi Họng', 'Nội soi', 'Tầng 2 - Khu B', 1),
(7, 'Phòng Răng Hàm Mặt', 'Điều trị răng hàm mặt', 'Tầng 2 - Khu C', 1);

-- THUỐC
INSERT INTO Thuoc
(TenThuoc, DonViTinh, NhaSanXuat, Gia, MoTa, TrangThai)
VALUES
-- 1. Giảm đau - hạ sốt
('Paracetamol', 'Viên', 'DHG Pharma', 500.00, 'Thuốc giảm đau, hạ sốt', 1),
('Paracetamol 650mg', 'Viên', 'DHG Pharma', 800.00, 'Thuốc giảm đau, hạ sốt', 1),
('Ibuprofen', 'Viên', 'Medipharco', 1000.00,'Thuốc giảm đau và chống viêm', 1),
('Diclofenac', 'Viên', 'Traphaco', 1200.00,'Thuốc giảm đau, chống viêm không steroid', 1),
-- 5. Kháng sinh
('Amoxicillin', 'Viên', 'DHG Pharma', 1500.00, 'Kháng sinh nhóm penicillin', 1),
('Amoxicillin + Clavulanate', 'Viên', 'GSK', 12000.00,'Kháng sinh phối hợp điều trị nhiễm khuẩn', 1),
('Azithromycin', 'Viên', 'Stella', 5000.00,'Kháng sinh nhóm macrolide', 1),
('Cefuroxime', 'Viên', 'Sandoz', 8000.00, 'Kháng sinh nhóm cephalosporin', 1),
('Cefixime', 'Viên', 'Stada', 7000.00, 'Kháng sinh nhóm cephalosporin', 1),
('Metronidazole', 'Viên', 'DHG Pharma', 1000.00,'Thuốc điều trị một số nhiễm khuẩn', 1),
-- 11. Dị ứng - hô hấp
('Cetirizine', 'Viên', 'DHG Pharma', 1200.00,'Thuốc chống dị ứng', 1),
('Loratadine', 'Viên', 'Traphaco', 1500.00,'Thuốc chống dị ứng', 1),
('Salbutamol', 'Viên', 'Imexpharm', 1000.00,'Thuốc hỗ trợ điều trị co thắt phế quản', 1),
('Ambroxol', 'Viên', 'Stada', 1200.00,'Thuốc long đờm', 1),
-- 15. Tim mạch - huyết áp
('Amlodipine', 'Viên', 'Stada', 1000.00,
 'Thuốc điều trị tăng huyết áp', 1),
('Losartan', 'Viên', 'DHG Pharma', 1500.00, 'Thuốc điều trị tăng huyết áp', 1),
('Bisoprolol', 'Viên', 'Merck', 2500.00,'Thuốc điều trị tăng huyết áp và bệnh tim mạch', 1),
('Atorvastatin', 'Viên', 'Stada', 3000.00, 'Thuốc điều trị rối loạn lipid máu', 1),
('Clopidogrel', 'Viên', 'Sanofi', 5000.00, 'Thuốc chống kết tập tiểu cầu', 1),
-- 20. Tiểu đường
('Metformin', 'Viên', 'DHG Pharma', 1000.00,'Thuốc điều trị đái tháo đường type 2', 1),
('Gliclazide', 'Viên', 'Servier', 2500.00,'Thuốc điều trị đái tháo đường', 1),
('Glimepiride', 'Viên', 'Stada', 2000.00,'Thuốc điều trị đái tháo đường type 2', 1),
-- 23. Tiêu hóa
('Omeprazole', 'Viên', 'DHG Pharma', 1200.00,'Thuốc giảm tiết acid dạ dày', 1),
('Esomeprazole', 'Viên', 'AstraZeneca', 6000.00, 'Thuốc điều trị các bệnh liên quan đến acid dạ dày', 1),
('Domperidone', 'Viên', 'Stada', 1000.00,'Thuốc hỗ trợ điều trị buồn nôn và rối loạn tiêu hóa', 1),
('Smecta', 'Gói', 'Ipsen', 5000.00,'Thuốc hỗ trợ điều trị tiêu chảy cấp', 1),
-- 27. Vitamin - bổ sung
('Vitamin C', 'Viên', 'DHG Pharma', 800.00,'Bổ sung vitamin C', 1),
('Vitamin B1', 'Viên', 'Traphaco', 500.00, 'Bổ sung vitamin B1', 1),
('Calcium + Vitamin D3', 'Viên', 'DHG Pharma', 2000.00,'Bổ sung canxi và vitamin D3', 1),
('Sắt + Acid Folic', 'Viên', 'Traphaco', 2500.00,'Bổ sung sắt và acid folic', 1);

-- KHO THUỐC
INSERT INTO KhoThuoc
(
    MaThuoc,
    SoLuongTon,
    SoLo,
    HanSuDung,
    SoLuongToiThieu
)
VALUES
(1, 500, 'LO-PARA-001', '2027-12-31', 100),
(2, 300, 'LO-PARA650-001', '2027-11-30', 80),
(3, 250, 'LO-IBU-001', '2027-10-31', 50),
(4, 180, 'LO-DIC-001', '2027-09-30', 50),

(5, 400, 'LO-AMOX-001', '2028-01-31', 100),
(6, 120, 'LO-AMOXCLAV-001', '2027-08-31', 50),
(7, 200, 'LO-AZI-001', '2027-12-31', 50),
(8, 150, 'LO-CEFU-001', '2027-10-31', 50),
(9, 100, 'LO-CEFIX-001', '2027-09-30', 30),
(10, 250, 'LO-METRO-001', '2028-02-29', 50),

(11, 300, 'LO-CET-001', '2028-03-31', 50),
(12, 220, 'LO-LORA-001', '2027-12-31', 50),
(13, 80, 'LO-SAL-001', '2027-07-31', 30),
(14, 150, 'LO-AMB-001', '2028-01-31', 40),

(15, 200, 'LO-AMLO-001', '2028-04-30', 50),
(16, 180, 'LO-LOSA-001', '2028-02-29', 50),
(17, 120, 'LO-BISO-001', '2027-11-30', 30),
(18, 100, 'LO-ATOR-001', '2028-03-31', 30),
(19, 60, 'LO-CLOPI-001', '2027-10-31', 20),

(20, 250, 'LO-METFOR-001', '2028-05-31', 50),
(21, 120, 'LO-GLIC-001', '2027-12-31', 30),
(22, 100, 'LO-GLIM-001', '2028-01-31', 30),

(23, 300, 'LO-OMEP-001', '2028-06-30', 50),
(24, 100, 'LO-ESOM-001', '2027-09-30', 30),
(25, 80, 'LO-DOM-001', '2027-11-30', 20),
(26, 60, 'LO-SMECTA-001', '2027-08-31', 20),

(27, 400, 'LO-VITC-001', '2028-07-31', 100),
(28, 200, 'LO-VITB1-001', '2028-05-31', 50),
(29, 150, 'LO-CALCIUM-001', '2028-06-30', 40),
(30, 100, 'LO-SAT-001', '2028-02-29', 30);

-- THUỐC TƯƠNG ĐƯƠNG / THAY THẾ
INSERT INTO ThuocTuongDuong
(MaThuoc, MaThuocThayThe, GhiChu, TrangThai)
VALUES
-- Giảm đau - hạ sốt
(1, 2, 'Cùng hoạt chất Paracetamol, khác hàm lượng', 'Đang áp dụng'),
(2, 1, 'Cùng hoạt chất Paracetamol, khác hàm lượng', 'Đang áp dụng'),
-- Kháng sinh
(5, 6, 'Kháng sinh cùng nhóm penicillin, cần kiểm tra chỉ định và dị ứng', 'Đang áp dụng'),
(6, 5, 'Kháng sinh cùng nhóm, không thay thế tự động', 'Đang áp dụng'),
(7, 8, 'Kháng sinh khác nhóm, chỉ dùng để tham khảo khi lựa chọn thuốc', 'Đang áp dụng'),
(8, 9, 'Kháng sinh cùng nhóm cephalosporin', 'Đang áp dụng'),
(9, 8, 'Kháng sinh cùng nhóm cephalosporin', 'Đang áp dụng'),
-- Thuốc chống dị ứng
(11, 12, 'Cùng nhóm thuốc kháng histamine H1', 'Đang áp dụng'),
(12, 11, 'Cùng nhóm thuốc kháng histamine H1', 'Đang áp dụng'),
-- Thuốc điều trị tăng huyết áp
(15, 16, 'Thuốc điều trị tăng huyết áp, cần bác sĩ/dược sĩ kiểm tra trước khi thay thế', 'Đang áp dụng'),
(16, 15, 'Thuốc điều trị tăng huyết áp, cần kiểm tra chỉ định', 'Đang áp dụng'),
-- Thuốc tiểu đường
(20, 21, 'Thuốc điều trị đái tháo đường, không tự động thay thế', 'Đang áp dụng'),
(21, 22, 'Cùng nhóm thuốc điều trị đái tháo đường', 'Đang áp dụng'),
-- Thuốc dạ dày
(23, 24, 'Cùng nhóm thuốc ức chế bơm proton (PPI)', 'Đang áp dụng'),
(24, 23, 'Cùng nhóm thuốc ức chế bơm proton (PPI)', 'Đang áp dụng');

-- DANH MỤC TIN TỨC
INSERT INTO DanhMucTinTuc
(TenDanhMuc, MoTa)
VALUES
('Phòng chống bệnh','Thông tin tuyên truyền và hướng dẫn phòng ngừa các bệnh thường gặp'),
('Hoạt động bệnh viện','Tin tức về các hoạt động, sự kiện và chương trình của bệnh viện'),
('Hướng dẫn khám','Hướng dẫn quy trình đăng ký, đặt lịch và thực hiện khám chữa bệnh'),
('Thông báo','Các thông báo và thông tin quan trọng từ bệnh viện'),
('Kiến thức y tế','Cung cấp kiến thức chăm sóc sức khỏe và các bệnh lý thường gặp'),
('Chương trình khuyến mãi','Thông tin về các chương trình ưu đãi và hỗ trợ chi phí khám chữa bệnh');

-- TIN TỨC
INSERT INTO TinTuc
(
    MaDanhMuc,
    TieuDe,
    NoiDung,
    ImageURL,
    TrangThai
)
VALUES
-- 1. PHÒNG CHỐNG BỆNH
(
    1,
    'Hướng dẫn phòng ngừa bệnh cúm mùa',
    'Cúm mùa là bệnh lý đường hô hấp thường gặp. Người dân nên giữ vệ sinh cá nhân, rửa tay thường xuyên, đeo khẩu trang khi đến nơi đông người và hạn chế tiếp xúc gần với người đang có triệu chứng hô hấp. Khi có các biểu hiện sốt, ho, đau họng hoặc mệt mỏi kéo dài, người bệnh nên đến cơ sở y tế để được thăm khám.',
    'images/5d6c0384-c3e6-4046-8301-c3c20f2c27d3.jpg',
    'Đang hiển thị'
),
(
    1,
    'Những cách bảo vệ sức khỏe trong mùa mưa',
    'Trong mùa mưa, người dân cần chú ý giữ cơ thể khô ráo, ăn uống hợp vệ sinh và sử dụng nguồn nước sạch. Cần chủ động phòng tránh muỗi và các bệnh truyền nhiễm có thể gia tăng trong thời điểm này. Khi xuất hiện các triệu chứng bất thường, người dân nên đến cơ sở y tế để được tư vấn.',
    'images/c9f44483-3b66-463c-be89-ae2a58da6fd3.jpg',
    'Đang hiển thị'
),
-- 2. HOẠT ĐỘNG BỆNH VIỆN
(
    2,
    'Bệnh viện tổ chức chương trình khám sức khỏe cộng đồng',
    'Bệnh viện tổ chức chương trình khám sức khỏe cộng đồng nhằm hỗ trợ người dân kiểm tra và theo dõi tình trạng sức khỏe. Chương trình bao gồm tư vấn sức khỏe, khám tổng quát và hướng dẫn chăm sóc sức khỏe phù hợp.',
    'images/418d14cf-eb79-43d6-bf1e-3dac43b941e0.jpg',
    'Đang hiển thị'
),
(
    2,
    'Bệnh viện triển khai cải tiến quy trình tiếp nhận người bệnh',
    'Bệnh viện triển khai cải tiến quy trình tiếp nhận nhằm giảm thời gian chờ và nâng cao trải nghiệm của người bệnh. Người bệnh có thể đăng ký lịch khám trước và theo dõi thông tin lịch hẹn trên ứng dụng.',
    'images/f450ffa2-71ec-4ab3-b0d3-7d0b923a0085.jpg',
    'Đang hiển thị'
),
-- 3. HƯỚNG DẪN KHÁM
(
    3,
    'Hướng dẫn đăng ký lịch khám trực tuyến',
    'Người bệnh có thể đăng nhập ứng dụng, lựa chọn chuyên khoa, bác sĩ và thời gian khám phù hợp. Sau khi đăng ký thành công, thông tin lịch hẹn sẽ được lưu trên hệ thống và người bệnh có thể theo dõi trạng thái lịch khám.',
    'images/b1dde79e-f22e-4963-bfaa-f735b7f6670a.jpg',
    'Đang hiển thị'
),
(
    3,
    'Hướng dẫn quy trình khám bệnh tại bệnh viện',
    'Người bệnh thực hiện đăng ký lịch khám, đến bệnh viện theo thời gian đã đặt, thực hiện thủ tục tiếp nhận và chờ đến lượt khám. Sau khi bác sĩ hoàn tất quá trình khám, người bệnh có thể xem thông tin kết quả và đơn thuốc trên ứng dụng nếu được hệ thống hỗ trợ.',
    'images/4a51d195-9acb-434c-b798-dd96e4077524.jpg',
    'Đang hiển thị'
),
-- 4. THÔNG BÁO
(
    4,
    'Thông báo lịch làm việc của bệnh viện',
    'Bệnh viện thông báo lịch làm việc và thời gian tiếp nhận người bệnh. Người bệnh nên kiểm tra lịch trước khi đến khám để chủ động sắp xếp thời gian.',
    'images/37cc8453-642d-4bf9-b3d3-d315541a0909.jpg',
    'Đang hiển thị'
),
(
    4,
    'Thông báo cập nhật hệ thống đặt lịch khám',
    'Hệ thống đặt lịch khám được cập nhật nhằm cải thiện khả năng tra cứu lịch hẹn và quản lý thông tin khám bệnh. Người bệnh vui lòng cập nhật ứng dụng lên phiên bản mới khi có thông báo.',
    'images/f611c739-4eba-4ff0-9745-31e371ae2f7a.jpg',
    'Đang hiển thị'
),
-- 5. KIẾN THỨC Y TẾ
(5,'Một số nguyên tắc chăm sóc sức khỏe hằng ngày','Duy trì chế độ ăn uống cân bằng, ngủ đủ giấc, vận động thường xuyên và hạn chế các thói quen có hại cho sức khỏe là những yếu tố quan trọng trong việc duy trì sức khỏe. Người dân nên kiểm tra sức khỏe định kỳ và tham khảo ý kiến nhân viên y tế khi có vấn đề bất thường.',
'images/319f6a64-86ae-432e-b0e6-49e79c085815.jpg','Đang hiển thị'),
-- 6. CHƯƠNG TRÌNH KHUYẾN MÃI
(
    6,
    'Chương trình ưu đãi khám sức khỏe tổng quát',
    'Bệnh viện triển khai chương trình hỗ trợ chi phí khám sức khỏe tổng quát trong thời gian quy định. Người bệnh có thể liên hệ bộ phận tiếp nhận để biết thêm thông tin về điều kiện và thời gian áp dụng chương trình.',
    'images/175fbe3a-fb45-440b-985d-07e9de8f831c.jpg',
    'Đang hiển thị'
);

-- =========================================================
-- 1. BỆNH NHÂN
-- =========================================================
-- Tài khoản bệnh nhân:
-- MaNguoiDung = 5
-- TenDangNhap = benhnhan
--
-- Chỉ tạo BenhNhan nếu chưa có.
-- =========================================================

INSERT INTO BenhNhan
(
    MaNguoiDung,
    NgaySinh,
    GioiTinh,
    DiaChi,
    SoDienThoaiKhanCap,
    TienSuBenh
)
VALUES
(
    5,
    '2004-05-15',
    'Nữ',
    'Quận 10, TP.HCM',
    '0909123456',
    'Không có tiền sử bệnh đặc biệt'
);

select * from BenhNhan;
-- =========================================================
-- 2. LỊCH LÀM VIỆC
-- =========================================================
-- Bác sĩ 1 làm tại phòng khám.
-- Theo nghiệp vụ của nhóm:
-- MaPhong là phòng được phân công.
--
-- Lưu ý:
-- Trong DDL bạn gửi, MaPhong đang cho phép NULL.
-- Nhưng trong bảng nghiệp vụ bạn vừa chốt là NOT NULL.
-- Dữ liệu test dưới đây luôn truyền MaPhong.
-- =========================================================

INSERT INTO LichLamViec
(
    MaBacSi,
    MaPhong,
    NgayLamViec,
    GioBatDau,
    GioKetThuc,
    TrangThai
)
VALUES
(
    1,
    1,
    CURDATE(),
    '07:30:00',
    '11:30:00',
    'DangLamViec'
),
(
    2,
    3,
    CURDATE(),
    '07:30:00',
    '11:30:00',
    'DangLamViec'
),
(
    3,
    2,
    CURDATE(),
    '13:30:00',
    '17:00:00',
    'DangLamViec'
);


-- =========================================================
-- 3. SỐ THỨ TỰ
-- =========================================================
-- Khoa Nội = MaKhoa 1
--
-- STT 1: đã khám
-- STT 2: đang khám
-- STT 3: đang chờ
-- STT 4: đã hủy
-- =========================================================

INSERT INTO SoThuTu
(
    SoThuTu,
    MaKhoa,
    NgayCapSo,
    TrangThai
)
VALUES
(
    1,
    1,
    CURDATE(),
    'DaKham'
),
(
    2,
    1,
    CURDATE(),
    'DangKham'
),
(
    3,
    1,
    CURDATE(),
    'DangCho'
),
(
    4,
    1,
    CURDATE(),
    'DaHuy'
);

select * from SoThuTu;
-- =========================================================
-- 4. LỊCH ĐĂNG KÝ KHÁM
-- =========================================================
--
-- CASE 1:
-- ChoKham
--
-- CASE 2:
-- DangKham
--
-- CASE 3:
-- DaKham
--
-- CASE 4:
-- DaHuy
-- =========================================================

INSERT INTO LichDangKyKham
(
    MaBenhNhan,
    MaBacSi,
    MaKhoa,
    MaSoThuTu,
    NgayKham,
    GioKham,
    LyDoKham,
    TrangThai
)
VALUES
(
    1,
    1,
    1,
    3,
    CURDATE(),
    '09:00:00',
    'Đau bụng và khó tiêu',
    'ChoKham'
),
(
    1,
    1,
    1,
    2,
    CURDATE(),
    '08:30:00',
    'Đau đầu và chóng mặt',
    'DangKham'
),
(
    1,
    1,
    1,
    1,
    DATE_SUB(CURDATE(), INTERVAL 1 DAY),
    '08:00:00',
    'Mệt mỏi và đau đầu',
    'DaKham'
),
(
    1,
    1,
    1,
    4,
    CURDATE(),
    '10:00:00',
    'Khám tổng quát',
    'DaHuy'
);
select * from LichDangKyKham;

-- =========================================================
-- 5. TIẾP NHẬN BỆNH NHÂN
-- =========================================================
-- Lịch 1: đã tiếp nhận, đang chờ bác sĩ
-- Lịch 2: đã tiếp nhận, đang khám
-- Lịch 3: đã tiếp nhận và đã khám
--
-- Lịch 4 đã hủy nên KHÔNG tạo tiếp nhận.
-- =========================================================

INSERT INTO TiepNhanBenhNhan
(
    MaLichKham,
    ThoiGianTiepNhan,
    TrangThai,
    GhiChu
)
VALUES
(
    1,
    NOW(),
    'DaTiepNhan',
    'Bệnh nhân đã đến bệnh viện và đang chờ khám'
),
(
    2,
    NOW(),
    'DaTiepNhan',
    'Bệnh nhân đã được tiếp nhận và đang khám'
),
(
    3,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    'DaTiepNhan',
    'Bệnh nhân đã hoàn tất tiếp nhận'
);


-- =========================================================
-- 6. HỒ SƠ BỆNH ÁN
-- =========================================================
--
-- Hồ sơ của lịch 2:
-- DangKham
-- -> bác sĩ vẫn được phép sửa.
--
-- Hồ sơ của lịch 3:
-- HoanTat
-- -> chỉ được xem.
-- =========================================================

INSERT INTO HoSoBenhAn
(
    MaLichKham,
    TrieuChung,
    ChanDoan,
    KetLuan,
    HuongDieuTri,
    QRToken,
    NgayTaiKham,
    GhiChuTaiKham,
    TrangThai
)
VALUES
(
    2,
    'Đau đầu, chóng mặt nhẹ',
    'Rối loạn tiền đình mức độ nhẹ',
    NULL,
    NULL,
    'QR-HS-000002',
    NULL,
    NULL,
    'DangKham'
),
(
    3,
    'Mệt mỏi, đau đầu kéo dài',
    'Thiếu máu nhẹ',
    'Tình trạng ổn định',
    'Theo dõi sức khỏe, sử dụng thuốc theo đơn và tái khám khi cần',
    'QR-HS-000003',
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    'Tái khám sau 14 ngày',
    'HoanTat'
);


-- =========================================================
-- 7. DỊCH VỤ Y TẾ
-- =========================================================
-- Phần này bạn đã có dữ liệu master rồi.
-- Không INSERT lại.
--
-- Dịch vụ sử dụng:
--
-- MaDichVu 1 = Xét nghiệm công thức máu
-- MaDichVu 5 = Siêu âm ổ bụng
-- MaDichVu 7 = X-quang ngực
-- =========================================================


-- =========================================================
-- 8. CHỈ ĐỊNH Y TẾ
-- =========================================================
--
-- Hồ sơ 2:
-- Chỉ định 1 -> ChoThucHien
-- Chỉ định 2 -> DangThucHien
--
-- Hồ sơ 3:
-- Chỉ định 3 -> DaHoanThanh
-- =========================================================

INSERT INTO ChiDinhYTe
(
    MaHoSoBenhAn,
    MaDichVu,
    MaPhong,
    NgayChiDinh,
    LoaiChiDinh,
    TrangThai
)
VALUES
(
    1,
    1,
    1,
    NOW(),
    'Xét nghiệm',
    'ChoThucHien'
),
(
    1,
    5,
    2,
    NOW(),
    'Siêu âm',
    'DangThucHien'
),
(
    2,
    1,
    1,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    'Xét nghiệm',
    'DaHoanThanh'
);


-- =========================================================
-- 9. KẾT QUẢ DỊCH VỤ
-- =========================================================
--
-- Chỉ định 3 đã hoàn thành
-- -> tạo kết quả.
--
-- Chỉ định 1 và 2 chưa có kết quả.
-- =========================================================

INSERT INTO KetQuaDichVu
(
    MaChiDinh,
    NgayCoKetQua,
    NoiDungKetQua,
    KetLuan,
    FileURL,
    TrangThai
)
VALUES
(
    3,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    'Kết quả công thức máu trong giới hạn tham chiếu.',
    'Chưa ghi nhận bất thường đáng kể.',
    NULL,
    'DaHoanThanh'
);


-- =========================================================
-- 10. CHI TIẾT KẾT QUẢ
-- =========================================================

INSERT INTO ChiTietKetQua
(
    MaKetQua,
    TenChiSo,
    GiaTri,
    DonVi,
    GiaTriThamChieu,
    TrangThai
)
VALUES
(
    1,
    'RBC',
    4.65,
    'T/L',
    '3.8 - 5.2',
    'BinhThuong'
),
(
    1,
    'WBC',
    7.20,
    'G/L',
    '4.0 - 10.0',
    'BinhThuong'
),
(
    1,
    'HGB',
    13.2,
    'g/dL',
    '12.0 - 16.0',
    'BinhThuong'
),
(
    1,
    'PLT',
    265,
    'G/L',
    '150 - 400',
    'BinhThuong'
),
(
    1,
    'HCT',
    39.5,
    '%',
    '36 - 46',
    'BinhThuong'
);


-- =========================================================
-- 11. ĐƠN THUỐC
-- =========================================================
-- Đơn thuốc thuộc hồ sơ bệnh án số 2.
--
-- Lưu ý:
-- Hồ sơ 2 đang DangKham.
-- Sau khi bác sĩ hoàn tất khám thì đơn thuốc mới được
-- xem là hoàn chỉnh.
-- =========================================================

INSERT INTO DonThuoc
(
    MaHoSoBenhAn,
    MaBacSi,
    NgayKeThuoc,
    ChanDoan,
    GhiChu,
    TrangThai
)
VALUES
(
    2,
    1,
    NOW(),
    'Rối loạn tiền đình mức độ nhẹ',
    'Theo dõi tình trạng bệnh và tái khám khi cần',
    'ChoCapThuoc'
);


-- =========================================================
-- 12. CHI TIẾT ĐƠN THUỐC
-- =========================================================
--
-- MaThuoc 1:
-- Paracetamol
--
-- MaThuoc 11:
-- Cetirizine
--
-- DonGiaBan lấy theo giá thuốc tại thời điểm kê.
-- =========================================================

INSERT INTO CTDonThuoc
(
    MaDonThuoc,
    MaThuoc,
    DonGiaBan,
    SoLuong,
    LieuDung,
    ThoiGianDung,
    HuongDanSuDung
)
VALUES
(
    1,
    1,
    500,
    10,
    '1 viên/lần',
    5,
    'Uống sau ăn khi đau đầu hoặc sốt'
),
(
    1,
    11,
    1200,
    5,
    '1 viên/ngày',
    5,
    'Uống buổi tối'
);


-- =========================================================
-- 13. KHO THUỐC
-- =========================================================
-- Phần này bạn đã seed 30 thuốc.
--
-- Dùng dữ liệu hiện tại để test:
--
--   SoLuongTon > SoLuongToiThieu
--       -> bình thường
--
--   SoLuongTon <= SoLuongToiThieu
--       -> cảnh báo sắp hết
--
-- Ví dụ:
-- Thuốc 1 còn 100, tối thiểu 20
-- Thuốc 11 còn 10, tối thiểu 20 -> cảnh báo
--
-- KHÔNG INSERT LẠI nếu bạn đã có 30 dòng KhoThuoc.
-- =========================================================


-- =========================================================
-- 14. HÓA ĐƠN
-- =========================================================
-- Hóa đơn cho lịch khám số 3.
--
-- Dịch vụ:
-- Xét nghiệm công thức máu = 150.000
--
-- Thuốc:
-- Paracetamol = 500 x 10 = 5.000
-- Cetirizine  = 1.200 x 5 = 6.000
--
-- Tổng = 161.000
--
-- =========================================================

INSERT INTO HoaDon
(
    MaBenhNhan,
    MaLichKham,
    NgayLapHoaDon,
    TongTien,
    TrangThai
)
VALUES
(
    1,
    3,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    161000,
    'ChuaThanhToan'
);


-- =========================================================
-- 15. CHI TIẾT HÓA ĐƠN
-- =========================================================

INSERT INTO CTHoaDon
(
    MaHoaDon,
    MaChiDinh,
    MaCTDonThuoc,
    NoiDung,
    SoLuong,
    DonGia,
    ThanhTien
)
VALUES
(
    1,
    3,
    NULL,
    'Xét nghiệm công thức máu',
    1,
    150000,
    150000
),
(
    1,
    NULL,
    1,
    'Paracetamol',
    10,
    500,
    5000
),
(
    1,
    NULL,
    2,
    'Cetirizine',
    5,
    1200,
    6000
);


-- =========================================================
-- 16. THANH TOÁN
-- =========================================================
-- Thanh toán một phần / hoặc toàn bộ hóa đơn.
-- Ở đây test thanh toán toàn bộ.
-- =========================================================

INSERT INTO ThanhToan
(
    MaHoaDon,
    NgayThanhToan,
    SoTien,
    PhuongThucThanhToan,
    TrangThai,
    MaGiaoDich
)
VALUES
(
    1,
    NOW(),
    161000,
    'Chuyển khoản',
    'ThanhCong',
    'GD-TEST-000001'
);


-- =========================================================
-- 17. THÔNG BÁO
-- =========================================================

INSERT INTO ThongBao
(
    MaNguoiDung,
    TieuDe,
    NoiDung,
    LoaiThongBao,
    DaDoc,
    TrangThai
)
VALUES
(
    5,
    'Kết quả xét nghiệm đã có',
    'Kết quả xét nghiệm của bạn đã được cập nhật.',
    'KetQua',
    0,
    'DangHienThi'
),
(
    2,
    'Có kết quả dịch vụ mới',
    'Bệnh nhân đã có kết quả xét nghiệm mới.',
    'KetQuaDichVu',
    0,
    'DangHienThi'
),
(
    3,
    'Có bệnh nhân đang chờ khám',
    'Có bệnh nhân đang chờ bác sĩ tiếp nhận.',
    'LichKham',
    0,
    'DangHienThi'
),
(
    6,
    'Có chỉ định cần thực hiện',
    'Phòng chuyên trách có chỉ định mới cần xử lý.',
    'ChiDinh',
    0,
    'DangHienThi'
),
(
    4,
    'Có đơn thuốc mới',
    'Có đơn thuốc mới đang chờ dược sĩ xử lý.',
    'DonThuoc',
    0,
    'DangHienThi'
);


-- =========================================================
-- 18. PHIÊN CHATBOT
-- =========================================================

INSERT INTO PhienTroChuyen
(
    MaNguoiDung,
    ThoiGianBatDau,
    ThoiGianKetThuc,
    TrangThai
)
VALUES
(
    5,
    NOW(),
    NULL,
    'DangHoatDong'
);


-- =========================================================
-- 19. TIN NHẮN CHATBOT
-- =========================================================

INSERT INTO TinNhan
(
    MaPhien,
    NoiDung,
    NguoiGui
)
VALUES
(
    1,
    'Tôi muốn xem lịch khám của mình.',
    'NguoiDung'
),
(
    1,
    'Bạn có thể xem lịch khám trong mục Lịch khám.',
    'AI'
),
(
    1,
    'Kết quả xét nghiệm của tôi đã có chưa?',
    'NguoiDung'
),
(
    1,
    'Kết quả xét nghiệm của bạn đã được cập nhật.',
    'AI'
);

-- ============================================
-- THAO TÁC VỚI DỮ LIỆU 
-- ===========================================
SELECT 
    n.MaNguoiDung,
    n.TenDangNhap,
    n.HoTen,
    n.MaVaiTro,
    v.TenVaiTro
FROM Nguoidung n
JOIN VaiTro v ON n.MaVaiTro = v.MaVaiTro
WHERE n.TenDangNhap = 'chuyentrach';

SELECT * FROM Nguoidung;
-- ========= mã hóa BCrypt

UPDATE Nguoidung
SET MatKhau = '$2a$10$Hiw0TXoAjBsWvCO.TMAKlOzOV3cAjFMWeCoo8Yzd0g8ATB8dnVe8u'
WHERE TenDangNhap IN (
    'admin',
    'bacsi',
    'tiepnhan',
    'duocsi',
    'benhnhan'
);
SELECT MaNguoiDung, TenDangNhap, MatKhau
FROM Nguoidung;

SELECT MaVaiTro, TenVaiTro
FROM VaiTro
WHERE TenVaiTro = 'CHUYENTRAch';

SELECT 
    n.MaNguoiDung,
    n.TenDangNhap,
    n.MaVaiTro,
    v.TenVaiTro
FROM Nguoidung n
JOIN VaiTro v ON n.MaVaiTro = v.MaVaiTro
ORDER BY n.MaVaiTro;

DELETE FROM VaiTro
WHERE MaVaiTro IN (7, 8, 9, 10, 11, 12);
SELECT * FROM VaiTro;
UPDATE VaiTro
SET TenVaiTro = 'CHUYENTRACH'
WHERE MaVaiTro = 5;
DESCRIBE Khoa;
DESCRIBE DichVuYTe;
DESCRIBE BacSi;
DESCRIBE PhongChuyenTrach;
describe Thuoc;
describe KhoThuoc;
describe ThuocTuongDuong;
describe DanhMucTinTuc;
DESCRIBE TinTuc;
describe Nguoidung;

SELECT * FROM KHOA;
SELECT * FROM DichVuYTe;
SELECT * FROM ChiSoDichVu;
SELECT * FROM PhongChuyenTrach;
SELECT * FROM Thuoc;
SELECT * FROM KhoThuoc;
SELECT * FROM ThuocTuongDuong;
SELECT * FROM DanhMucTinTuc;
SELECT * FROM Nguoidung;
select * from LichLamViec;
select * from VaiTro;
select * from ChiDinhYTe;
select * from ThanhToan;

-- coi thông tin bác sĩ
SELECT MaNguoiDung, TenDangNhap, HoTen, MaVaiTro
FROM Nguoidung
WHERE TenDangNhap IN ('bacsi', 'bacsi2', 'bacsi3', 'bacsi4');

-- coi ảnh trong tin tứ
SELECT MaTinTuc, TieuDe, ImageURL
FROM TinTuc;

-- update ảnh đại diện
UPDATE NguoiDung
SET AnhDaiDien = 'images/0775d6ea-194e-4348-a91d-53d3eccd8692.jpg'
WHERE TenDangNhap IN (
    'admin',
    'bacsi',
    'tiepnhan',
    'chuyentrach',
    'duocsi'
);

SELECT MaBacSi, MaNguoiDung, MaKhoa, ChuyenMon
FROM BacSi;

SELECT MaPhong, TenPhong
FROM PhongChuyenTrach;
select * from BacSi;
SELECT DATABASE();
