package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.LichSuDieuPhoiLichKham;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LichSuDieuPhoiLichKhamRepository
        extends JpaRepository<LichSuDieuPhoiLichKham, Integer> {

    List<LichSuDieuPhoiLichKham>
    findByMaLichKhamOrderByNgayDieuPhoiDesc(Integer maLichKham);
}