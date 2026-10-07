package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.DonThuoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DonThuocRepository extends JpaRepository<DonThuoc, Integer> {

    Optional<DonThuoc> findByHoSoBenhAn_MaHoSoBenhAn(Integer maHoSoBenhAn);

    List<DonThuoc> findByBacSi_MaBacSiOrderByNgayKeThuocDesc(Integer maBacSi);
}