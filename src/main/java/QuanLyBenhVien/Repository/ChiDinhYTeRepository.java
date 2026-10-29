package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface ChiDinhYTeRepository
        extends JpaRepository<ChiDinhYTe, Integer> {

    // =========================================================
    // LẤY DANH SÁCH CHỈ ĐỊNH THEO HỒ SƠ BỆNH ÁN
    // =========================================================
    // Danh sách chỉ định theo hồ sơ bệnh án
    List<ChiDinhYTe>
    findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
            Integer maHoSoBenhAn
    );

    // =========================================================
    // TÌM MỘT CHỈ ĐỊNH THUỘC HỒ SƠ BỆNH ÁN
    // =========================================================
    // Tìm chỉ định thuộc hồ sơ bệnh án
    Optional<ChiDinhYTe>
    findByMaChiDinhAndHoSoBenhAn_MaHoSoBenhAn(
            Integer maChiDinh,
            Integer maHoSoBenhAn
    );

    // =========================================================
    // LẤY TẤT CẢ CHỈ ĐỊNH CỦA BÁC SĨ
    // =========================================================
    // Danh sách chỉ định của bác sĩ
    List<ChiDinhYTe>
    findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
            Integer maBacSi
    );

    // Danh sách chỉ định trong khoảng ngày - Nhân viên chuyên trách
    List<ChiDinhYTe>
    findByNgayChiDinhGreaterThanEqualAndNgayChiDinhLessThanOrderByNgayChiDinhDesc(
            LocalDateTime start,
            LocalDateTime end
    );

    // tìm chi dinh tu mahosobenhan
    List<ChiDinhYTe> findByHoSoBenhAn_MaHoSoBenhAn(
            Integer maHoSoBenhAn
    );
}