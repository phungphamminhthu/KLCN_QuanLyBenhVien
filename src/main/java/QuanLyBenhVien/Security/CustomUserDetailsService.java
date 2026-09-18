package QuanLyBenhVien.Security;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Service

//nhiệm vụ tìm tài khoản người dùng trong MySQL khi Spring Security cần xác thực đăng nhập.
public class CustomUserDetailsService implements UserDetailsService {

    private final NguoiDungRepository NguoiDungRepository;

    public CustomUserDetailsService(
            NguoiDungRepository NguoiDungRepository) {

        this.NguoiDungRepository = NguoiDungRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String ThongTinDangNhap)
            throws UsernameNotFoundException {

        NguoiDung NguoiDung =
                NguoiDungRepository
                        .findByTenDangNhapHoacEmail(ThongTinDangNhap)
                        .orElseThrow(() ->
                                new UsernameNotFoundException(
                                        "Không tìm thấy tài khoản: "
                                                + ThongTinDangNhap
                                )
                        );

        return new CustomUserDetails(NguoiDung);
    }
}
