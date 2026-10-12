package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ThongBao;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ThongBaoRepository
        extends JpaRepository<ThongBao, Integer> {

    List<ThongBao> findByNguoiDung_MaNguoiDungOrderByNgayTaoDesc(
            Integer maNguoiDung,
            Pageable pageable
    );

    long countByNguoiDung_MaNguoiDungAndDaDocFalse(
            Integer maNguoiDung
    );

    Optional<ThongBao> findByMaThongBaoAndNguoiDung_MaNguoiDung(
            Integer maThongBao,
            Integer maNguoiDung
    );

    @Modifying
    @Query(""" 
        UPDATE ThongBao t 
        SET t.daDoc = true 
        WHERE t.nguoiDung.maNguoiDung = :maNguoiDung 
          AND t.daDoc = false 
        """)
    int danhDauTatCaDaDoc(
            @Param("maNguoiDung") Integer maNguoiDung
    );
}