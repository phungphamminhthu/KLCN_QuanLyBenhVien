package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HoSoBenhAnRepository
        extends JpaRepository<HoSoBenhAn, Integer> {

    // Tìm hồ sơ bệnh án theo lịch khám
    Optional<HoSoBenhAn> findByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );

    // Kiểm tra lịch khám đã có hồ sơ bệnh án hay chưa
    boolean existsByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );


    // =========================================================
    // LỊCH SỬ KHÁM CỦA BỆNH NHÂN
    //
    // Chỉ lấy những hồ sơ đã hoàn tất.
    // Sắp xếp lần khám mới nhất trước.
    // =========================================================
    List<HoSoBenhAn>
    findByLichDangKyKham_BenhNhan_MaBenhNhanAndTrangThaiOrderByLichDangKyKham_NgayKhamDescLichDangKyKham_GioKhamDesc(
            Integer maBenhNhan,
            String trangThai
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