package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.HoSoBenhAn;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HoSoBenhAnRepository
        extends JpaRepository<HoSoBenhAn, Integer> {

    // =========================================================
    // TÌM HỒ SƠ BỆNH ÁN THEO LỊCH KHÁM
    // =========================================================
    Optional<HoSoBenhAn> findByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );


    // =========================================================
    // KIỂM TRA LỊCH KHÁM ĐÃ CÓ HỒ SƠ BỆNH ÁN HAY CHƯA
    // =========================================================
    boolean existsByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );


    // =========================================================
    // LỊCH SỬ KHÁM CỦA BỆNH NHÂN - CÓ PHÂN TRANG
    //
    // Điều kiện:
    // - Đúng bệnh nhân
    // - Hồ sơ đã hoàn tất
    // - Không lấy lịch khám hiện tại
    // - Phân trang bằng Pageable
    //
    // Việc sắp xếp theo ngày khám + giờ khám sẽ được truyền
    // từ Service thông qua Pageable.
    // =========================================================
    Page<HoSoBenhAn>
    findByLichDangKyKham_BenhNhan_MaBenhNhanAndTrangThaiAndLichDangKyKham_MaLichKhamNot(
            Integer maBenhNhan,
            String trangThai,
            Integer maLichKham,
            Pageable pageable
    );


    // =========================================================
    // TÌM HỒ SƠ CỤ THỂ CỦA MỘT BỆNH NHÂN
    //
    // Dùng khi bác sĩ bấm "Xem chi tiết".
    // =========================================================
    Optional<HoSoBenhAn>
    findByMaHoSoBenhAnAndLichDangKyKham_BenhNhan_MaBenhNhan(
            Integer maHoSoBenhAn,
            Integer maBenhNhan
    );
}