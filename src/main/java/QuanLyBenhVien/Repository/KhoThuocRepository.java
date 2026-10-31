
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.KhoThuoc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface KhoThuocRepository
        extends JpaRepository<KhoThuoc, Integer> {

    // Lấy tất cả thuốc trong kho
    List<KhoThuoc> findAllByOrderByMaKhoThuocAsc();

    // Lấy các lô của một thuốc, sắp xếp theo hạn sử dụng
    List<KhoThuoc> findByThuoc_MaThuocOrderByHanSuDungAsc(
            Integer maThuoc
    );

    // Kiểm tra thuốc đã tồn tại trong kho chưa
    boolean existsByThuoc_MaThuoc(
            Integer maThuoc
    );

    // Kiểm tra thuốc + số lô đã tồn tại chưa
    boolean existsByThuoc_MaThuocAndSoLo(
            Integer maThuoc,
            String soLo
    );

    // Lấy kho thuốc theo thuốc + số lô
    Optional<KhoThuoc> findByThuoc_MaThuocAndSoLo(
            Integer maThuoc,
            String soLo
    );

    // =====================================================
    // MỚI: TÍNH TỔNG TỒN KHO CỦA CÁC LÔ THUỐC CÒN HẠN
    // =====================================================

    @Query("""
        SELECT COALESCE(SUM(k.soLuongTon), 0)
        FROM KhoThuoc k
        WHERE k.thuoc.maThuoc = :maThuoc
          AND k.hanSuDung >= :homNay
          AND k.soLuongTon > 0
    """)
    Long tongSoLuongConHan(
            @Param("maThuoc") Integer maThuoc,
            @Param("homNay") LocalDate homNay
    );
}
