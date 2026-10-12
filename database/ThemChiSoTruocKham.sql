USE quanlybenhvien;

SET @NgayTest = DATE(
    UTC_TIMESTAMP() + INTERVAL 7 HOUR
);

-- Chọn tối đa 2 lịch của bệnh nhân mẫu hôm nay.
-- Ưu tiên lịch đã gọi, sau đó đến lịch chờ khám.
DROP TEMPORARY TABLE IF EXISTS tmp_lich_dang_kham;

CREATE TEMPORARY TABLE tmp_lich_dang_kham (
    MaLichKham INT PRIMARY KEY
);

INSERT INTO tmp_lich_dang_kham (MaLichKham)
SELECT l.MaLichKham
FROM lichdangkykham l
JOIN benhnhan bn
    ON bn.MaBenhNhan = l.MaBenhNhan
JOIN nguoidung nd
    ON nd.MaNguoiDung = bn.MaNguoiDung
WHERE l.NgayKham = @NgayTest
  AND nd.TenDangNhap LIKE 'testbn!_%' ESCAPE '!'
  AND l.LyDoKham =
      'Lịch khám mẫu phục vụ kiểm thử giao diện'
  AND l.TrangThai IN ('DaGoi', 'ChoKham')
  AND NOT EXISTS (
      SELECT 1
      FROM hosobenhan h
      WHERE h.MaLichKham = l.MaLichKham
        AND h.TrangThai = 'HoanTat'
  )
ORDER BY
    CASE WHEN l.TrangThai = 'DaGoi' THEN 0 ELSE 1 END,
    l.GioKham,
    l.MaLichKham
LIMIT 2;

START TRANSACTION;

UPDATE lichdangkykham l
JOIN tmp_lich_dang_kham t
    ON t.MaLichKham = l.MaLichKham
SET l.TrangThai = 'DangKham'
WHERE l.NgayKham = @NgayTest
  AND l.TrangThai IN ('DaGoi', 'ChoKham');

COMMIT;

-- Xem các bệnh nhân vừa đổi trạng thái.
SELECT
    l.MaLichKham,
    nd.HoTen,
    l.NgayKham,
    l.GioKham,
    l.TrangThai
FROM tmp_lich_dang_kham t
JOIN lichdangkykham l
    ON l.MaLichKham = t.MaLichKham
JOIN benhnhan bn
    ON bn.MaBenhNhan = l.MaBenhNhan
JOIN nguoidung nd
    ON nd.MaNguoiDung = bn.MaNguoiDung
ORDER BY l.GioKham, l.MaLichKham;

DROP TEMPORARY TABLE tmp_lich_dang_kham;