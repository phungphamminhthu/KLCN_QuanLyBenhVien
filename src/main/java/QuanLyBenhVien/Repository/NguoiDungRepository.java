package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.NguoiDung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NguoiDungRepository
        extends JpaRepository<NguoiDung, Integer> {

    // =====================================================
    // TÌM THEO TÊN ĐĂNG NHẬP
    // =====================================================

    Optional<NguoiDung> findByTenDangNhap(String tenDangNhap);

    // =====================================================
    // LẤY NGƯỜI DÙNG THEO 1 VAI TRÒ
    // =====================================================

    @Query("""
        SELECT n
        FROM NguoiDung n
        JOIN n.vaiTro v
        WHERE UPPER(v.TenVaiTro) = UPPER(:tenVaiTro)
          AND n.trangThai = true
    """)
    List<NguoiDung> findByVaiTro_TenVaiTroIgnoreCaseAndTrangThaiTrue(
            @Param("tenVaiTro") String tenVaiTro
    );


    // =====================================================
    // LẤY NGƯỜI DÙNG THEO NHIỀU VAI TRÒ
    // =====================================================

    @Query("""
        SELECT n
        FROM NguoiDung n
        JOIN n.vaiTro v
        WHERE UPPER(v.TenVaiTro) IN :tenVaiTro
          AND n.trangThai = true
    """)
    List<NguoiDung> findByVaiTro_TenVaiTroInIgnoreCaseAndTrangThaiTrue(
            @Param("tenVaiTro") List<String> tenVaiTro
    );


    // =====================================================
    // TÌM THEO TÊN ĐĂNG NHẬP HOẶC EMAIL
    // =====================================================

    @Query("""
        SELECT n
        FROM NguoiDung n
        WHERE n.tenDangNhap = :ThongTinDangNhap
           OR n.email = :ThongTinDangNhap
    """)
    Optional<NguoiDung> findByTenDangNhapHoacEmail(
            @Param("ThongTinDangNhap") String ThongTinDangNhap
    );


    // =====================================================
    // KIỂM TRA THÔNG TIN ĐÃ TỒN TẠI
    // =====================================================

    boolean existsByTenDangNhap(String TenDangNhap);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsBySoDienThoai(String soDienThoai);


    // =====================================================
    // KIỂM TRA EMAIL ĐÃ TỒN TẠI
    // =====================================================

    @Query("""
        SELECT CASE WHEN COUNT(n) > 0 THEN true ELSE false END
        FROM NguoiDung n
        WHERE n.email = :Email
    """)
    boolean existsByEmail(
            @Param("Email") String Email
    );


    // =====================================================
    // TÌM NGƯỜI DÙNG THEO EMAIL
    // =====================================================

    @Query("""
        SELECT n
        FROM NguoiDung n
        WHERE n.email = :Email
    """)
    Optional<NguoiDung> findByEmail(
            @Param("Email") String Email
    );


    // =====================================================
    // TÌM NGƯỜI DÙNG THEO NHIỀU VAI TRÒ
    // =====================================================

    @Query("""
        SELECT n
        FROM NguoiDung n
        JOIN n.vaiTro v
        WHERE UPPER(v.TenVaiTro) IN :tenVaiTro
          AND n.trangThai = true
    """)
    List<NguoiDung> timNguoiDungTheoNhieuVaiTro(
            @Param("tenVaiTro") List<String> tenVaiTro
    );


}