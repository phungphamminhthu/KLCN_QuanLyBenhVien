package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.KhoThuoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KhoThuocRepository extends JpaRepository<KhoThuoc, Integer> {

    List<KhoThuoc> findAllByOrderByMaKhoThuocAsc();

    List<KhoThuoc> findByThuoc_MaThuocOrderByHanSuDungAsc(
            Integer maThuoc
    );

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
}