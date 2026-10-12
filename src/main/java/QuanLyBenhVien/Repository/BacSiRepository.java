package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.BacSi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BacSiRepository extends JpaRepository<BacSi, Integer> {

    @Query("""
            SELECT b
            FROM BacSi b
            WHERE b.nguoiDung.MaNguoiDung = :maNguoiDung
            """)
    Optional<BacSi> timTheoMaNguoiDung(
            @Param("maNguoiDung") Integer maNguoiDung
    );
}