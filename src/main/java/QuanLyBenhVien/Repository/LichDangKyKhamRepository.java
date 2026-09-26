package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.LichDangKyKham;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LichDangKyKhamRepository
        extends JpaRepository<LichDangKyKham, Integer> {

    // =========================================================
    // 1. LẤY TOÀN BỘ LỊCH KHÁM CỦA BÁC SĨ TRONG NGÀY
    // =========================================================
    List<LichDangKyKham>
    findByBacSi_MaBacSiAndNgayKhamOrderByGioKhamAsc(
            Integer maBacSi,
            LocalDate ngayKham
    );


    // =========================================================
    // 2. TÌM LỊCH KHÁM THUỘC ĐÚNG BÁC SĨ
    // =========================================================
    Optional<LichDangKyKham>
    findByMaLichKhamAndBacSi_MaBacSi(
            Integer maLichKham,
            Integer maBacSi
    );


    // =========================================================
    // 3. LẤY LỊCH THEO BÁC SĨ + NGÀY + TRẠNG THÁI
    // =========================================================
    List<LichDangKyKham>
    findByBacSi_MaBacSiAndNgayKhamAndTrangThaiOrderByGioKhamAsc(
            Integer maBacSi,
            LocalDate ngayKham,
            String trangThai
    );


    // =========================================================
    // 4. DANH SÁCH BỆNH NHÂN ĐÃ TIẾP NHẬN VÀ ĐANG CHỜ KHÁM
    // =========================================================
    @Query("""
            SELECT l
            FROM LichDangKyKham l
            WHERE l.bacSi.maBacSi = :maBacSi
              AND l.ngayKham = :ngayKham
              AND l.trangThai = 'ChoKham'
              AND EXISTS (
                    SELECT t.maTiepNhan
                    FROM TiepNhanBenhNhan t
                    WHERE t.lichDangKyKham.maLichKham = l.maLichKham
                      AND t.trangThai = 'DaTiepNhan'
              )
            ORDER BY l.soThuTu.soThuTu ASC
            """)
    List<LichDangKyKham> findDanhSachChoKham(
            @Param("maBacSi") Integer maBacSi,
            @Param("ngayKham") LocalDate ngayKham
    );


    // =========================================================
    // 5. ĐẾM BỆNH NHÂN ĐÃ TIẾP NHẬN VÀ ĐANG CHỜ KHÁM
    // =========================================================
    @Query("""
            SELECT COUNT(l)
            FROM LichDangKyKham l
            WHERE l.bacSi.maBacSi = :maBacSi
              AND l.ngayKham = :ngayKham
              AND l.trangThai = 'ChoKham'
              AND EXISTS (
                    SELECT t.maTiepNhan
                    FROM TiepNhanBenhNhan t
                    WHERE t.lichDangKyKham.maLichKham = l.maLichKham
                      AND t.trangThai = 'DaTiepNhan'
              )
            """)
    long countDanhSachChoKham(
            @Param("maBacSi") Integer maBacSi,
            @Param("ngayKham") LocalDate ngayKham
    );


    // =========================================================
    // 6. ĐẾM LỊCH THEO BÁC SĨ + NGÀY + TRẠNG THÁI
    // Dùng cho: DangKham và DaKham
    // =========================================================
    long countByBacSi_MaBacSiAndNgayKhamAndTrangThai(
            Integer maBacSi,
            LocalDate ngayKham,
            String trangThai
    );


    // =========================================================
    // 7. LỊCH SỬ KHÁM CỦA BÁC SĨ
    //
    // Chỉ lấy những lịch đã khám xong:
    // LichDangKyKham.TrangThai = 'DaKham'
    //
    // Sắp xếp:
    // - Ngày khám mới nhất trước
    // - Trong cùng ngày: giờ khám mới nhất trước
    // =========================================================
    List<LichDangKyKham>
    findByBacSi_MaBacSiAndTrangThaiOrderByNgayKhamDescGioKhamDesc(
            Integer maBacSi,
            String trangThai
    );


    // =========================================================
    // 8. LỊCH SỬ KHÁM THEO KHOẢNG NGÀY
    //
    // Dùng sau này cho bộ lọc:
    // Từ ngày -> Đến ngày
    // =========================================================
    List<LichDangKyKham>
    findByBacSi_MaBacSiAndTrangThaiAndNgayKhamBetweenOrderByNgayKhamDescGioKhamDesc(
            Integer maBacSi,
            String trangThai,
            LocalDate tuNgay,
            LocalDate denNgay
    );
}