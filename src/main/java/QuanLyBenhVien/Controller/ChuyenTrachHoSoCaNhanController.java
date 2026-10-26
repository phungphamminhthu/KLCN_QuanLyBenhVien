package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Security.CustomUserDetails;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Controller;

import java.util.LinkedHashMap;
import java.util.Map;

/** Chỉ tác động đến hồ sơ của người đang đăng nhập với ROLE_CHUYENTRACH. */
@Controller
public class ChuyenTrachHoSoCaNhanController {

    @GetMapping("/ChuyenTrach/ho-so-ca-nhan")
    public String trangHoSoCaNhan() {
        return "ChuyenTrach/ho-so-ca-nhan";
    }

    @PersistenceContext
    private EntityManager entityManager;

    private NguoiDung taiKhoanHienTai(CustomUserDetails principal) {
        if (principal == null || principal.getAuthorities().stream()
                .noneMatch(a -> "ROLE_CHUYENTRACH".equals(a.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ nhân viên chuyên trách mới được truy cập hồ sơ này.");
        }
        Integer maNguoiDung = principal.getNguoiDung().getMaNguoiDung();
        NguoiDung user = entityManager.find(NguoiDung.class, maNguoiDung);
        if (user == null || !Boolean.TRUE.equals(user.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tài khoản không tồn tại hoặc đã bị khóa.");
        }
        if (user.getVaiTro() == null ||
                !"CHUYENTRACH".equals(user.getVaiTro().getTenVaiTro())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Tài khoản không thuộc vai trò nhân viên chuyên trách.");
        }
        return user;
    }

    private Object thuocTinhNeuCo(Object object, String... names) {
        if (object == null) return null;
        BeanWrapper bean = new BeanWrapperImpl(object);
        for (String name : names) {
            if (bean.isReadableProperty(name)) {
                Object value = bean.getPropertyValue(name);
                if (value != null) return value;
            }
        }
        return null;
    }

    private String thuocTinhDienThoaiCoTheSua(NguoiDung user) {
        BeanWrapper bean = new BeanWrapperImpl(user);
        for (String name : new String[]{"soDienThoai", "sdt", "dienThoai"}) {
            if (bean.isReadableProperty(name) && bean.isWritableProperty(name)
                    && bean.getPropertyType(name) == String.class) {
                return name;
            }
        }
        return null;
    }

    private Map<String, Object> toResponse(NguoiDung user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("maNguoiDung", user.getMaNguoiDung());
        data.put("hoTen", user.getHoTen());
        data.put("tenDangNhap", user.getTenDangNhap());
        data.put("email", user.getEmail());
        data.put("soDienThoai", thuocTinhNeuCo(user,
                "soDienThoai", "sdt", "dienThoai"));
        data.put("coTheSuaSoDienThoai", thuocTinhDienThoaiCoTheSua(user) != null);
        data.put("anhDaiDien", user.getAnhDaiDien());
        data.put("vaiTro", user.getVaiTro().getTenVaiTro());
        data.put("trangThai", user.getTrangThai());
        // Vai trò là dữ liệu thật, còn tên bộ phận chỉ là nhãn hiển thị của phân hệ.
        data.put("boPhanHienThi", "Phòng chuyên trách");
        return data;
    }

    @ResponseBody
    @GetMapping("/api/chuyen-trach/ho-so-ca-nhan")
    @Transactional(readOnly = true)
    public Map<String, Object> xem(@AuthenticationPrincipal CustomUserDetails principal) {
        return toResponse(taiKhoanHienTai(principal));
    }

    public record CapNhatHoSo(String hoTen, String soDienThoai) {}

    @ResponseBody
    @PutMapping("/api/chuyen-trach/ho-so-ca-nhan")
    @Transactional
    public Map<String, Object> capNhat(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestBody CapNhatHoSo input) {
        NguoiDung user = taiKhoanHienTai(principal);
        if (input == null || input.hoTen() == null || input.hoTen().trim().length() < 2
                || input.hoTen().trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Họ tên phải có từ 2 đến 100 ký tự.");
        }

        String phone = input.soDienThoai() == null ? "" : input.soDienThoai().trim();
        if (!phone.isEmpty() && !phone.matches("^(?:\\+84|0)[0-9]{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số điện thoại không đúng định dạng Việt Nam.");
        }

        String phoneProperty = thuocTinhDienThoaiCoTheSua(user);
        if (phoneProperty == null && !phone.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bảng NguoiDung chưa có cột số điện thoại có thể sửa. Cần kiểm tra Entity.");
        }

        // Không cho chỉnh email, quyền hay mật khẩu tại đây.
        user.setHoTen(input.hoTen().trim());
        if (phoneProperty != null) {
            BeanWrapper bean = new BeanWrapperImpl(user);
            bean.setPropertyValue(phoneProperty, phone.isEmpty() ? null : phone);
        }
        entityManager.flush();
        return toResponse(user);
    }
}
