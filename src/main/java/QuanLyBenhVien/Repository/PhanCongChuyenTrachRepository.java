
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.PhanCongChuyenTrach;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface PhanCongChuyenTrachRepository
        extends JpaRepository<PhanCongChuyenTrach, Integer> {

    List<PhanCongChuyenTrach>
    findAllByOrderByNgayLamViecDescGioBatDauDesc();

    List<PhanCongChuyenTrach>
    findByMaNguoiDungOrderByNgayLamViecDescGioBatDauDesc(
            Integer maNguoiDung
    );

    @Query("""
        SELECT COUNT(p) > 0
        FROM PhanCongChuyenTrach p
        WHERE p.maNguoiDung = :maNguoiDung
          AND p.ngayLamViec = :ngayLamViec
          AND p.trangThai = 1
          AND :gioBatDau < p.gioKetThuc
          AND :gioKetThuc > p.gioBatDau
        """)
    boolean existsCaTrung(
            @Param("maNguoiDung") Integer maNguoiDung,
            @Param("ngayLamViec") LocalDate ngayLamViec,
            @Param("gioBatDau") LocalTime gioBatDau,
            @Param("gioKetThuc") LocalTime gioKetThuc
    );
}
