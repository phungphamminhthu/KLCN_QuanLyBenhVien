package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.CTDonThuoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CTDonThuocRepository extends JpaRepository<CTDonThuoc, Integer> {

    List<CTDonThuoc> findByDonThuoc_MaDonThuocOrderByMaCTDonThuocAsc(
            Integer maDonThuoc
    );

    void deleteByDonThuoc_MaDonThuoc(Integer maDonThuoc);
}