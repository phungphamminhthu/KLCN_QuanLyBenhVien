package QuanLyBenhVien.Security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException)
            throws IOException, ServletException {

        Object codeAttr = request.getAttribute(
                JwtAuthenticationFilter.AUTH_ERROR_CODE_ATTR);
        Object messageAttr = request.getAttribute(
                JwtAuthenticationFilter.AUTH_ERROR_MESSAGE_ATTR);

        String code = (codeAttr instanceof String s && !s.isBlank())
                ? s
                : "UNAUTHORIZED";

        String message = (messageAttr instanceof String s && !s.isBlank())
                ? s
                : "Vui lòng đăng nhập để truy cập chức năng này.";

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String json = "{\"success\":false,\"code\":\""
                + escapeJson(code)
                + "\",\"message\":\""
                + escapeJson(message)
                + "\"}";

        response.getWriter().write(json);
    }

    private static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}

