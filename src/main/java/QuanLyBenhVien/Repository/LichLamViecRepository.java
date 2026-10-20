
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.LichLamViec;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface LichLamViecRepository
        extends JpaRepository<LichLamViec, Integer> {

    List<LichLamViec>
    findByBacSi_MaBacSiOrderByNgayLamViecAscGioBatDauAsc(
            Integer maBacSi);

    List<LichLamViec>
    findByBacSi_MaBacSiAndNgayLamViecBetweenOrderByNgayLamViecAscGioBatDauAsc(
            Integer maBacSi, LocalDate tuNgay, LocalDate denNgay);

    List<LichLamViec> findByBacSi_MaBacSiAndNgayLamViecAndGioBatDauLessThanEqualAndGioKetThucGreaterThanEqual(
            Integer maBacSi,
            LocalDate ngayLamViec,
            LocalTime gioKham1,
            LocalTime gioKham2
    );

    @Query("""
        SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
        FROM LichLamViec l
        WHERE l.bacSi.maBacSi = :maBacSi
          AND l.ngayLamViec = :ngay
          AND (:maLich IS NULL OR l.maLichLamViec <> :maLich)
          AND l.gioBatDau < :gioKetThuc
          AND l.gioKetThuc > :gioBatDau
        """)

    boolean existsXungDotBacSi(
            @Param("maBacSi") Integer maBacSi,
            @Param("ngay") LocalDate ngay,
            @Param("gioBatDau") LocalTime gioBatDau,
            @Param("gioKetThuc") LocalTime gioKetThuc,
            @Param("maLich") Integer maLich);

    @Query("""
        SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
        FROM LichLamViec l
        WHERE l.phong.maPhong = :maPhong
          AND l.ngayLamViec = :ngay
          AND (:maLich IS NULL OR l.maLichLamViec <> :maLich)
          AND l.gioBatDau < :gioKetThuc
          AND l.gioKetThuc > :gioBatDau
        """)

    boolean existsXungDotPhong(
            @Param("maPhong") Integer maPhong,
            @Param("ngay") LocalDate ngay,
            @Param("gioBatDau") LocalTime gioBatDau,
            @Param("gioKetThuc") LocalTime gioKetThuc,
            @Param("maLich") Integer maLich);

    @Query("""
    SELECT l
    FROM LichLamViec l
    JOIN FETCH l.bacSi b
    JOIN FETCH b.khoa k
    JOIN FETCH l.phong p
    WHERE k.maKhoa = :maKhoa
      AND l.ngayLamViec = :ngayKham
      AND l.trangThai = 'DangLamViec'
      AND b.trangThai = true
    ORDER BY l.gioBatDau ASC
    """)
    List<LichLamViec> findLichBacSiDatKham(
            @Param("maKhoa") Integer maKhoa,
            @Param("ngayKham") LocalDate ngayKham
    );
}
