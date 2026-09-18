package QuanLyBenhVien.Security;


import QuanLyBenhVien.Entity.NguoiDung;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;


import java.util.Collection;
import java.util.List;

//lấy những thông tin cần thiết từ NguoiDung và cung cấp cho Spring Security.
public class CustomUserDetails implements UserDetails {

    private final NguoiDung NguoiDung;

    public CustomUserDetails(NguoiDung NguoiDung) {
        this.NguoiDung = NguoiDung;
    }

    public NguoiDung getNguoiDung() {
        return NguoiDung;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {

        return List.of(
                new SimpleGrantedAuthority(
                        "ROLE_" + NguoiDung.getVaiTro().getTenVaiTro()
                )
        );
    }

    @Override
    public String getPassword() {
        return NguoiDung.getMatKhau();
    }

    @Override
    public String getUsername() {
        return NguoiDung.getTenDangNhap();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return NguoiDung.getTrangThai();
    }
}
