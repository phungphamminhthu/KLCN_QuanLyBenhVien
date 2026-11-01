package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface YeuCauDieuChinhLichRepository
        extends JpaRepository<YeuCauDieuChinhLich, Integer> {

    @Query("""
        SELECT CASE WHEN COUNT(y) > 0 THEN true ELSE false END
        FROM YeuCauDieuChinhLich y
        WHERE y.lichLamViec.maLichLamViec = :maLichLamViec
          AND y.trangThai = :trangThai
    """)
    boolean existsYeuCauTheoLichVaTrangThai(
            @Param("maLichLamViec") Integer maLichLamViec,
            @Param("trangThai") String trangThai
    );
}