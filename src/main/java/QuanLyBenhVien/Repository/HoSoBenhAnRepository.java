package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.HoSoBenhAn;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
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

    // ==========================================================
    // Lấy danh sách tất cả hồ sơ bệnh án của một bệnh nhân theo TenDangNhap
    // ==========================================================
    List<HoSoBenhAn>
    findByLichDangKyKham_BenhNhan_NguoiDung_TenDangNhapOrderByLichDangKyKham_NgayKhamDesc(
            String tenDangNhap
    );

    // ======================================================
    // Tìm chi tiết một hồ sơ bệnh án cụ thể theo mã hồ sơ (maHoSoBenhAn)
    // kèm theo điều kiện kiểm tra chủ sở hữu (tenDangNhap).
    // =======================================================
    Optional<HoSoBenhAn>
    findByMaHoSoBenhAnAndLichDangKyKham_BenhNhan_NguoiDung_TenDangNhap(
            Integer maHoSoBenhAn,
            String tenDangNhap
    );
}