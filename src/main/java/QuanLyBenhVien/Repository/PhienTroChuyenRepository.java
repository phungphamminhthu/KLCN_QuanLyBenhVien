package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.PhienTroChuyen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PhienTroChuyenRepository
        extends JpaRepository<PhienTroChuyen, Integer> {

    List<PhienTroChuyen>
    findByNguoiDung_MaNguoiDungOrderByThoiGianBatDauDesc(
            Integer maNguoiDung
    );

    Optional<PhienTroChuyen>
    findByMaPhienAndNguoiDung_MaNguoiDung(
            Integer maPhien,
            Integer maNguoiDung
    );
}
