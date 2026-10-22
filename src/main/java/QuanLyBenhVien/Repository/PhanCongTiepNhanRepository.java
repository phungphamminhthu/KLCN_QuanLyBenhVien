
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.PhanCongTiepNhan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface PhanCongTiepNhanRepository
        extends JpaRepository<PhanCongTiepNhan, Integer> {

    @Query("""
        SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END
        FROM PhanCongTiepNhan p
        WHERE p.maNhanVienTiepNhan = :maNhanVien
          AND p.trangThai = 1
          AND p.thoiGianBatDau < :ketThuc
          AND p.thoiGianKetThuc > :batDau
    """)
    boolean existsCaTrung(
            @Param("maNhanVien") Integer maNhanVien,
            @Param("batDau") LocalDateTime batDau,
            @Param("ketThuc") LocalDateTime ketThuc
    );
}
