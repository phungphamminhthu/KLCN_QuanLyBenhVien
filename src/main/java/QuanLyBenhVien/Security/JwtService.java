package QuanLyBenhVien.Security;

import QuanLyBenhVien.Entity.NguoiDung;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final String Secret;
    private final long Expiration;

    public JwtService(
            @Value("${jwt.secret}") String Secret,
            @Value("${jwt.expiration}") long Expiration) {

        this.Secret = Secret;
        this.Expiration = Expiration;
    }

    // Tạo khóa bí mật dùng để ký và xác thực JWT
    private SecretKey getKey() {

        return Keys.hmacShaKeyFor(
                Secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    // Tạo JWT sau khi đăng nhập thành công
    public String generateToken(CustomUserDetails UserDetails) {

        NguoiDung User = UserDetails.getNguoiDung();

        return Jwts.builder()

                // Tên đăng nhập
                .subject(User.getTenDangNhap())

                // Mã người dùng
                .claim(
                        "MaNguoiDung",
                        User.getMaNguoiDung()
                )

                // Vai trò
                .claim(
                        "VaiTro",
                        User.getVaiTro().getTenVaiTro()
                )

                // Thời điểm tạo token
                .issuedAt(new Date())

                // Thời điểm hết hạn
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + Expiration
                        )
                )

                // Ký token
                .signWith(getKey())

                .compact();
    }

    // Lấy tên đăng nhập từ JWT
    public String extractTenDangNhap(String Token) {

        return getClaims(Token).getSubject();
    }

    // Kiểm tra JWT có hợp lệ không
    public boolean isTokenValid(
            String Token,
            CustomUserDetails UserDetails) {

        String TenDangNhap =
                extractTenDangNhap(Token);

        return TenDangNhap.equals(
                UserDetails.getUsername()
        )
                && !isTokenExpired(Token);
    }

    // Kiểm tra token đã hết hạn chưa
    private boolean isTokenExpired(String Token) {

        return getClaims(Token)
                .getExpiration()
                .before(new Date());
    }

    // Đọc Claims từ JWT
    private Claims getClaims(String Token) {

        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(Token)
                .getPayload();
    }
}