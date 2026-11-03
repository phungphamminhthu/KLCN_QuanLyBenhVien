package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.BacSi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BacSiRepository extends JpaRepository<BacSi, Integer> {

    @Query("""
            SELECT b
            FROM BacSi b
            WHERE b.nguoiDung.maNguoiDung = :maNguoiDung
            """)
    Optional<BacSi> timTheoMaNguoiDung(
            @Param("maNguoiDung") Integer maNguoiDung
    );

    // =======================================
    // tìm bac si hoạt đong
    // =======================================
    @Query("""
    SELECT b
    FROM BacSi b
    JOIN FETCH b.nguoiDung nd
    JOIN FETCH b.khoa k
    WHERE b.trangThai = true
      AND nd.trangThai = true
    ORDER BY nd.hoTen ASC
    """)
    List<BacSi> findBacSiHoatDong();
}