package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface YeuCauDieuChinhLichRepository
        extends JpaRepository<YeuCauDieuChinhLich, Integer> {

    List<YeuCauDieuChinhLich>
    findByTrangThaiOrderByNgayTaoDesc(String trangThai);

    List<YeuCauDieuChinhLich>
    findByBacSi_MaBacSiOrderByNgayTaoDesc(Integer maBacSi);

    boolean existsByLichLamViec_MaLichLamViecAndTrangThai(
            Integer maLichLamViec,
            String trangThai
    );

    boolean existsByLichLamViec_MaLichLamViec(Integer maLichLamViec);
}