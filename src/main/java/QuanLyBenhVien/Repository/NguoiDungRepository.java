package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.NguoiDung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NguoiDungRepository
        extends JpaRepository<NguoiDung, Integer> {

    @Query("""
        SELECT n
        FROM NguoiDung n
        WHERE n.TenDangNhap = :ThongTinDangNhap
           OR n.Email = :ThongTinDangNhap
    """)
    Optional<NguoiDung> findByTenDangNhapHoacEmail(
            @Param("ThongTinDangNhap") String ThongTinDangNhap
    );

    boolean existsByTenDangNhap(String TenDangNhap);

    @Query("""
        SELECT CASE WHEN COUNT(n) > 0 THEN true ELSE false END
        FROM NguoiDung n
        WHERE n.Email = :Email
    """)
    boolean existsByEmail(@Param("Email") String Email);
    //boolean existsByEmail(String Email);

    // TÌM MAIL
    @Query("""
    SELECT n
    FROM NguoiDung n
    WHERE n.Email = :Email
""")
    Optional<NguoiDung> findByEmail(
            @Param("Email") String Email
    );
}