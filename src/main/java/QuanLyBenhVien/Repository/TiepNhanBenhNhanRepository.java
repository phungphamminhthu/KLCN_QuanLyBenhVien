package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.TiepNhanBenhNhan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TiepNhanBenhNhanRepository
        extends JpaRepository<TiepNhanBenhNhan, Integer> {

    // 1. Kiểm tra bệnh nhân đã được tiếp nhận
    boolean existsByLichDangKyKham_MaLichKhamAndTrangThai(
            Integer maLichKham,
            String trangThai
    );

    // 2. Lấy thông tin tiếp nhận mới nhất của lịch khám
    Optional<TiepNhanBenhNhan>
    findFirstByLichDangKyKham_MaLichKhamOrderByThoiGianTiepNhanDesc(
            Integer maLichKham
    );

    // 3. Lấy danh sách tiếp nhận theo trạng thái
    List<TiepNhanBenhNhan> findByTrangThai(
            String trangThai
    );

    // 4. Cập nhật trạng thái tiếp nhận theo mã lịch khám
    @Modifying
    @Query(value = """
            UPDATE TiepNhanBenhNhan
            SET TrangThai = :trangThai
            WHERE MaLichKham = :maLichKham
            """, nativeQuery = true)
    int capNhatTrangThaiTheoLich(
            @Param("maLichKham") Integer maLichKham,
            @Param("trangThai") String trangThai
    );
}