package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.KetQuaDichVu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KetQuaDichVuRepository
        extends JpaRepository<KetQuaDichVu, Integer> {

    // =========================================================
    // TÌM KẾT QUẢ THEO MỘT CHỈ ĐỊNH
    // =========================================================
    Optional<KetQuaDichVu>
    findByChiDinhYTe_MaChiDinh(
            Integer maChiDinh
    );


    // =========================================================
    // LẤY TẤT CẢ KẾT QUẢ CẬN LÂM SÀNG CỦA BÁC SĨ
    // =========================================================
    List<KetQuaDichVu>
    findByChiDinhYTe_HoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayCoKetQuaDesc(
            Integer maBacSi
    );
}