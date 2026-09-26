package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.TiepNhanBenhNhan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TiepNhanBenhNhanRepository
        extends JpaRepository<TiepNhanBenhNhan, Integer> {

    // Kiểm tra lịch khám đã được tiếp nhận hay chưa
    boolean existsByLichDangKyKham_MaLichKhamAndTrangThai(
            Integer maLichKham,
            String trangThai
    );

    // Lấy thông tin tiếp nhận của một lịch khám
    Optional<TiepNhanBenhNhan> findFirstByLichDangKyKham_MaLichKhamOrderByThoiGianTiepNhanDesc(
            Integer maLichKham
    );

    // Lấy các lần tiếp nhận theo trạng thái
    List<TiepNhanBenhNhan> findByTrangThai(String trangThai);
}