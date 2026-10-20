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
import org.springframework.http.HttpMethod;

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
        System.out.println(
                "JWT FILTER: " + Request.getMethod()
                        + " " + Request.getRequestURI()
        );

        String Authorization = Request.getHeader("Authorization");

        System.out.println("======================================");
        System.out.println("REQUEST: "
                + Request.getMethod()
                + " "
                + Request.getRequestURI());

        System.out.println("Authorization type: "
                + (Authorization == null
                ? "NONE"
                : Authorization.startsWith("Bearer ")
                ? "BEARER"
                : Authorization.startsWith("Apikey ")
                ? "SEPAY_API_KEY"
                : "OTHER"));

        // Không có token
        if (Authorization == null
                || !Authorization.startsWith("Bearer ")) {

            System.out.println("JWT: KHÔNG CÓ TOKEN");

            FilterChain.doFilter(Request, Response);
            return;
        }

        String Token = Authorization.substring(7);

        try {

            String TenDangNhap =
                    JwtService.extractTenDangNhap(Token);

            System.out.println("Username từ JWT: "
                    + TenDangNhap);

            if (TenDangNhap != null
                    && SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {

                CustomUserDetails UserDetails =
                        (CustomUserDetails)
                                CustomUserDetailsService
                                        .loadUserByUsername(
                                                TenDangNhap
                                        );

                System.out.println(
                        "Authorities từ UserDetails: "
                                + UserDetails.getAuthorities()
                );

                boolean TokenValid =
                        JwtService.isTokenValid(
                                Token,
                                UserDetails
                        );

                System.out.println(
                        "Token valid: "
                                + TokenValid
                );

                if (TokenValid) {

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

                    System.out.println(
                            "===== JWT AUTH SUCCESS ====="
                    );

                    System.out.println(
                            "Username: "
                                    + TenDangNhap
                    );

                    System.out.println(
                            "Authorities: "
                                    + UserDetails.getAuthorities()
                    );
                }
            }

        } catch (Exception Exception) {

            System.out.println(
                    "===== JWT ERROR ====="
            );

            System.out.println(
                    "Request: "
                            + Request.getMethod()
                            + " "
                            + Request.getRequestURI()
            );

            System.out.println(
                    "Error: "
                            + Exception.getMessage()
            );

            Exception.printStackTrace();
        }

        System.out.println(
                "Authentication hiện tại: "
                        + SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );

        System.out.println("======================================");

        FilterChain.doFilter(
                Request,
                Response
        );
    }
}