package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ChiTietKetQua;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChiTietKetQuaRepository
        extends JpaRepository<ChiTietKetQua, Integer> {

    List<ChiTietKetQua>
    findByKetQuaDichVu_MaKetQuaOrderByMaChiTietKetQuaAsc(
            Integer maKetQua
    );
}