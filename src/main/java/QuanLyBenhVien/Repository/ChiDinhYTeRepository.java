package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChiDinhYTeRepository
        extends JpaRepository<ChiDinhYTe, Integer> {

    // Danh sách chỉ định theo hồ sơ bệnh án
    List<ChiDinhYTe>
    findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
            Integer maHoSoBenhAn
    );

    // Tìm chỉ định thuộc hồ sơ bệnh án
    Optional<ChiDinhYTe>
    findByMaChiDinhAndHoSoBenhAn_MaHoSoBenhAn(
            Integer maChiDinh,
            Integer maHoSoBenhAn
    );

    // Danh sách chỉ định của bác sĩ
    List<ChiDinhYTe>
    findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
            Integer maBacSi
    );

    // Danh sách chỉ định trong khoảng ngày - Nhân viên chuyên trách
    List<ChiDinhYTe>
    findByNgayChiDinhGreaterThanEqualAndNgayChiDinhLessThanOrderByNgayChiDinhDesc(
            LocalDateTime tuNgay,
            LocalDateTime denNgay
    );
}