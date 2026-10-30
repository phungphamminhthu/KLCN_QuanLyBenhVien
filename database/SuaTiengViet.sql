USE quanlybenhvien;

SET NAMES utf8mb4;

START TRANSACTION;

-- Sửa tên người dùng liên kết với bác sĩ mã 1
UPDATE nguoidung
SET HoTen = 'Nguyễn Văn An'
WHERE MaNguoiDung = (
    SELECT MaNguoiDung
    FROM bacsi
    WHERE MaBacSi = 1
);

UPDATE khoa
SET TenKhoa = 'Khoa Nội'
WHERE MaKhoa = 1;

UPDATE phongchuyentrach
SET TenPhong = 'Phòng Xét nghiệm'
WHERE MaPhong = 1;

COMMIT;

-- Kiểm tra lại
SELECT
    nd.HoTen AS TenBacSi,
    k.TenKhoa,
    p.TenPhong
FROM bacsi bs
JOIN nguoidung nd
    ON nd.MaNguoiDung = bs.MaNguoiDung
JOIN khoa k
    ON k.MaKhoa = bs.MaKhoa
JOIN phongchuyentrach p
    ON p.MaPhong = 1
WHERE bs.MaBacSi = 1;