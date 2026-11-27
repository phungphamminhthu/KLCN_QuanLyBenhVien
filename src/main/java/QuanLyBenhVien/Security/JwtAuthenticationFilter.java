package QuanLyBenhVien.Security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    public static final String AUTH_ERROR_CODE_ATTR = "qlbv.auth.error.code";
    public static final String AUTH_ERROR_MESSAGE_ATTR = "qlbv.auth.error.message";

    private static final Logger log =
            LoggerFactory.getLogger(JwtAuthenticationFilter.class);

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
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod())
                && "/api/sepay/webhook".equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest Request,
            HttpServletResponse Response,
            FilterChain FilterChain)
            throws ServletException, IOException {

        String Authorization = Request.getHeader("Authorization");

        // Không có Bearer token → để SecurityFilterChain quyết định (permitAll hoặc 401)
        if (Authorization == null
                || !Authorization.startsWith("Bearer ")) {

            FilterChain.doFilter(Request, Response);
            return;
        }

        String Token = Authorization.substring(7).trim();

        if (Token.isEmpty()) {
            SecurityContextHolder.clearContext();
            setAuthError(
                    Request,
                    "TOKEN_INVALID",
                    "Token xác thực không hợp lệ."
            );
            FilterChain.doFilter(Request, Response);
            return;
        }

        try {
            String TenDangNhap =
                    JwtService.extractTenDangNhap(Token);

            if (TenDangNhap == null || TenDangNhap.isBlank()) {
                SecurityContextHolder.clearContext();
                setAuthError(
                        Request,
                        "TOKEN_INVALID",
                        "Token xác thực không hợp lệ."
                );
            } else if (SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                CustomUserDetails UserDetails =
                        (CustomUserDetails)
                                CustomUserDetailsService
                                        .loadUserByUsername(
                                                TenDangNhap
                                        );

                if (!UserDetails.isEnabled()) {
                    SecurityContextHolder.clearContext();
                    setAuthError(
                            Request,
                            "ACCOUNT_DISABLED",
                            "Tài khoản đã bị khóa hoặc vô hiệu hóa."
                    );
                    log.warn(
                            "Từ chối JWT vì tài khoản bị khóa: {} {} (user={})",
                            Request.getMethod(),
                            Request.getRequestURI(),
                            TenDangNhap
                    );
                } else if (JwtService.isTokenValid(Token, UserDetails)) {

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

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(
                                    Authentication
                            );
                } else {
                    SecurityContextHolder.clearContext();
                    setAuthError(
                            Request,
                            "TOKEN_INVALID",
                            "Token xác thực không hợp lệ."
                    );
                }
            }

        } catch (ExpiredJwtException ex) {
            SecurityContextHolder.clearContext();
            setAuthError(
                    Request,
                    "TOKEN_EXPIRED",
                    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            );
            log.debug(
                    "JWT hết hạn cho request {} {}",
                    Request.getMethod(),
                    Request.getRequestURI()
            );
        } catch (JwtException | IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();
            setAuthError(
                    Request,
                    "TOKEN_INVALID",
                    "Token xác thực không hợp lệ."
            );
            log.debug(
                    "JWT không hợp lệ cho request {} {}: {}",
                    Request.getMethod(),
                    Request.getRequestURI(),
                    ex.getMessage()
            );
        } catch (UsernameNotFoundException ex) {
            SecurityContextHolder.clearContext();
            setAuthError(
                    Request,
                    "TOKEN_INVALID",
                    "Tài khoản không tồn tại hoặc không hợp lệ."
            );
            log.warn(
                    "Không tìm thấy tài khoản từ JWT cho request {} {}",
                    Request.getMethod(),
                    Request.getRequestURI()
            );
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            setAuthError(
                    Request,
                    "UNAUTHORIZED",
                    "Xác thực không thành công. Vui lòng đăng nhập lại."
            );
            log.warn(
                    "Lỗi xác thực JWT cho request {} {}: {}",
                    Request.getMethod(),
                    Request.getRequestURI(),
                    ex.getMessage()
            );
        }

        FilterChain.doFilter(
                Request,
                Response
        );
    }

    private void setAuthError(
            HttpServletRequest request,
            String code,
            String message) {
        request.setAttribute(AUTH_ERROR_CODE_ATTR, code);
        request.setAttribute(AUTH_ERROR_MESSAGE_ATTR, message);
    }
}