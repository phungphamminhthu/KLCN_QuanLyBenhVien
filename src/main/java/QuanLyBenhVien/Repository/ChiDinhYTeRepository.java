package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChiDinhYTeRepository
        extends JpaRepository<ChiDinhYTe, Integer> {

    // =========================================================
    // LẤY DANH SÁCH CHỈ ĐỊNH THEO HỒ SƠ BỆNH ÁN
    // =========================================================
    List<ChiDinhYTe>
    findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
            Integer maHoSoBenhAn
    );

    // =========================================================
    // TÌM MỘT CHỈ ĐỊNH THUỘC HỒ SƠ BỆNH ÁN
    // =========================================================
    Optional<ChiDinhYTe>
    findByMaChiDinhAndHoSoBenhAn_MaHoSoBenhAn(
            Integer maChiDinh,
            Integer maHoSoBenhAn
    );

    // =========================================================
    // LẤY TẤT CẢ CHỈ ĐỊNH CỦA BÁC SĨ
    // =========================================================
    List<ChiDinhYTe>
    findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
            Integer maBacSi
    );
}