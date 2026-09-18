package QuanLyBenhVien.Security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private final JwtService JwtService;
    private final CustomUserDetailsService CustomUserDetailsService;

    public JwtAuthenticationFilter(
            JwtService JwtService,
            CustomUserDetailsService CustomUserDetailsService) {

        this.JwtService = JwtService;
        this.CustomUserDetailsService =
                CustomUserDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest Request,
            HttpServletResponse Response,
            FilterChain FilterChain)
            throws ServletException, IOException {

        // Lấy Authorization Header
        String Authorization =
                Request.getHeader("Authorization");

        // Không có JWT
        if (Authorization == null
                || !Authorization.startsWith("Bearer ")) {

            FilterChain.doFilter(Request, Response);
            return;
        }

        // Bỏ "Bearer "
        String Token =
                Authorization.substring(7);

        try {

            // Lấy tên đăng nhập từ token
            String TenDangNhap =
                    JwtService.extractTenDangNhap(Token);

            // Chưa có authentication
            if (TenDangNhap != null
                    && SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                // Tìm user trong database
                CustomUserDetails UserDetails =
                        (CustomUserDetails)
                                CustomUserDetailsService
                                        .loadUserByUsername(
                                                TenDangNhap
                                        );

                // Kiểm tra token
                if (JwtService.isTokenValid(
                        Token,
                        UserDetails)) {

                    UsernamePasswordAuthenticationToken Authentication =
                            new UsernamePasswordAuthenticationToken(
                                    UserDetails,
                                    null,
                                    UserDetails.getAuthorities()
                            );

                    Authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(Request)
                    );

                    // Xác nhận user đã đăng nhập
                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(
                                    Authentication
                            );
                }
            }

        } catch (Exception Exception) {

            // Token không hợp lệ
            // Không thiết lập Authentication
        }

        // Cho request đi tiếp
        FilterChain.doFilter(
                Request,
                Response
        );
    }
}