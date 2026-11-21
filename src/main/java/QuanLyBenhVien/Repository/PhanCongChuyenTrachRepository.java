
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

    // Tìm nhân viên được phân công đang trực tại thời điểm hiện tại
    @Query("""
        SELECT p.maNguoiDung
        FROM PhanCongChuyenTrach p
        WHERE p.ngayLamViec = :ngayLamViec
          AND p.trangThai = 1
          AND :gioHienTai >= p.gioBatDau
          AND :gioHienTai < p.gioKetThuc
        """)
    List<Integer> findNhanVienDangTruc(
            @Param("ngayLamViec") LocalDate ngayLamViec,
            @Param("gioHienTai") LocalTime gioHienTai
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
