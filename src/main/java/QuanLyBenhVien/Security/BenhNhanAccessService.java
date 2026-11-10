package QuanLyBenhVien.Security;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Repository.BenhNhanRepository;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BenhNhanAccessService {

    private final BenhNhanRepository benhNhanRepository;

    public BenhNhanAccessService(
            BenhNhanRepository benhNhanRepository) {
        this.benhNhanRepository = benhNhanRepository;
    }

    // Lấy mã người dùng từ tài khoản đã xác thực bằng JWT
    public Integer getMaNguoiDungHienTai() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {

            throw new AccessDeniedException(
                    "Người dùng chưa được xác thực."
            );
        }

        return userDetails.getMaNguoiDung();
    }

    // Kiểm tra hồ sơ bệnh nhân có thuộc tài khoản đang đăng nhập không
    @Transactional(readOnly = true)
    public BenhNhan kiemTraQuyenSoHuu(Integer maBenhNhan) {

        Integer maNguoiDung = getMaNguoiDungHienTai();

        return benhNhanRepository
                .findByMaBenhNhanAndNguoiDung_MaNguoiDung(
                        maBenhNhan,
                        maNguoiDung
                )
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "Bạn không có quyền truy cập hồ sơ bệnh nhân này."
                        )
                );
    }
}