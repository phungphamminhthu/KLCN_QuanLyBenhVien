package QuanLyBenhVien.Security;

import QuanLyBenhVien.Config.WebSocketConfig;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.VaiTro;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationUnitTest {

    private static final String TEST_SECRET =
            "UnitTest-JWT-Secret-Key-At-Least-32-Bytes-Long-2026";
    private static final String OTHER_SECRET =
            "Different-Wrong-JWT-Secret-Key-At-Least-32-Bytes-2026";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private CustomUserDetails buildUser(
            int id,
            String username,
            String roleName,
            boolean enabled) {
        VaiTro vaiTro = new VaiTro();
        vaiTro.setTenVaiTro(roleName);

        NguoiDung user = new NguoiDung();
        user.setMaNguoiDung(id);
        user.setTenDangNhap(username);
        user.setMatKhau("$2a$10$dummyhashedpassword");
        user.setTrangThai(enabled);
        user.setVaiTro(vaiTro);
        return new CustomUserDetails(user);
    }

    private CustomUserDetailsService stubUserDetailsService(
            Map<String, CustomUserDetails> users) {
        return new CustomUserDetailsService(null) {
            @Override
            public UserDetails loadUserByUsername(String thongTinDangNhap)
                    throws UsernameNotFoundException {
                CustomUserDetails found = users.get(thongTinDangNhap);
                if (found == null) {
                    throw new UsernameNotFoundException(
                            "Không tìm thấy tài khoản: " + thongTinDangNhap);
                }
                return found;
            }
        };
    }

    @Test
    void validToken_populatesSecurityContextWithExpectedRole() throws Exception {
        JwtService jwtService = new JwtService(TEST_SECRET, 86_400_000L);
        CustomUserDetails activeDoctor = buildUser(10, "bs_an", "BACSI", true);
        String token = jwtService.generateToken(activeDoctor);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                stubUserDetailsService(Map.of("bs_an", activeDoctor))
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bac-si/kham-benh");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertTrue(auth.isAuthenticated());
        assertEquals("bs_an", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_BACSI".equals(a.getAuthority())));
    }

    @Test
    void missingToken_triggers401UnauthorizedFromEntryPoint() throws Exception {
        JwtService jwtService = new JwtService(TEST_SECRET, 86_400_000L);
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                stubUserDetailsService(Map.of())
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bac-si/kham-benh");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
        entryPoint.commence(request, response, new InsufficientAuthenticationException("No auth"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"UNAUTHORIZED\""));
    }

    @Test
    void expiredToken_doesNotAuthenticate_andEntryPointReturns401TokenExpired() throws Exception {
        JwtService expiredJwtService = new JwtService(TEST_SECRET, -5_000L);
        JwtService verifyingJwtService = new JwtService(TEST_SECRET, 86_400_000L);
        CustomUserDetails user = buildUser(11, "bs_binh", "BACSI", true);
        String expiredToken = expiredJwtService.generateToken(user);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                verifyingJwtService,
                stubUserDetailsService(Map.of("bs_binh", user))
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bac-si/kham-benh");
        request.addHeader("Authorization", "Bearer " + expiredToken);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("TOKEN_EXPIRED",
                request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_CODE_ATTR));

        JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
        entryPoint.commence(request, response, new InsufficientAuthenticationException("Expired"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"TOKEN_EXPIRED\""));
    }

    @Test
    void tamperedOrWrongSignatureToken_returns401TokenInvalid() throws Exception {
        JwtService otherSecretService = new JwtService(OTHER_SECRET, 86_400_000L);
        JwtService verifyingService = new JwtService(TEST_SECRET, 86_400_000L);
        CustomUserDetails user = buildUser(12, "bs_cuong", "BACSI", true);
        String wrongSigToken = otherSecretService.generateToken(user);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                verifyingService,
                stubUserDetailsService(Map.of("bs_cuong", user))
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/bac-si/kham-benh");
        request.addHeader("Authorization", "Bearer " + wrongSigToken);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("TOKEN_INVALID",
                request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_CODE_ATTR));

        JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
        entryPoint.commence(request, response, new InsufficientAuthenticationException("Invalid"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"TOKEN_INVALID\""));
    }

    @Test
    void disabledAccountWithUnexpiredToken_isRejectedWith401AccountDisabled() throws Exception {
        JwtService jwtService = new JwtService(TEST_SECRET, 86_400_000L);
        CustomUserDetails activeAtLogin = buildUser(13, "nv_dung", "TIEPNHAN", true);
        String issuedToken = jwtService.generateToken(activeAtLogin);

        // Sau khi cấp token, tài khoản bị khóa (TrangThai = false)
        CustomUserDetails lockedNow = buildUser(13, "nv_dung", "TIEPNHAN", false);

        assertFalse(jwtService.isTokenValid(issuedToken, lockedNow));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtService,
                stubUserDetailsService(Map.of("nv_dung", lockedNow))
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/tiep-nhan/ho-so-ca-nhan");
        request.addHeader("Authorization", "Bearer " + issuedToken);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("ACCOUNT_DISABLED",
                request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_CODE_ATTR));

        JwtAuthenticationEntryPoint entryPoint = new JwtAuthenticationEntryPoint();
        entryPoint.commence(request, response, new InsufficientAuthenticationException("Disabled"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"ACCOUNT_DISABLED\""));
    }

    @Test
    void accessDeniedHandler_returns403ForbiddenForAuthenticatedUserWithoutRole() throws Exception {
        JwtAccessDeniedHandler handler = new JwtAccessDeniedHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/phan-quyen/danh-sach");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("Forbidden"));

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"FORBIDDEN\""));
    }

    @Test
    void shortOrBlankSecret_rejectedAtStartup() {
        assertThrows(IllegalStateException.class, () -> new JwtService("", 86_400_000L));
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short-secret", 86_400_000L));
    }

    @Test
    void webSocketConnectInterceptor_allowsValidUser_andRejectsExpiredOrDisabled() throws Exception {
        JwtService validService = new JwtService(TEST_SECRET, 86_400_000L);
        JwtService expiredService = new JwtService(TEST_SECRET, -5_000L);

        CustomUserDetails activeUser = buildUser(20, "bs_ws", "BACSI", true);
        CustomUserDetails disabledUser = buildUser(21, "bs_locked", "BACSI", false);

        WebSocketConfig wsConfig = new WebSocketConfig(
                validService,
                stubUserDetailsService(Map.of(
                        "bs_ws", activeUser,
                        "bs_locked", disabledUser
                ))
        );

        ChannelRegistration registration = new ChannelRegistration();
        wsConfig.configureClientInboundChannel(registration);

        Field interceptorsField = ChannelRegistration.class.getDeclaredField("interceptors");
        interceptorsField.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<ChannelInterceptor> interceptors = (List<ChannelInterceptor>) interceptorsField.get(registration);
        assertEquals(1, interceptors.size());
        ChannelInterceptor interceptor = interceptors.get(0);

        MessageChannel dummyChannel = (message, timeout) -> true;

        // 1. Valid active user -> CONNECT succeeds and sets user principal
        StompHeaderAccessor validAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        validAccessor.setLeaveMutable(true);
        validAccessor.addNativeHeader("Authorization", "Bearer " + validService.generateToken(activeUser));
        Message<byte[]> validMsg = MessageBuilder.createMessage(new byte[0], validAccessor.getMessageHeaders());
        interceptor.preSend(validMsg, dummyChannel);
        assertNotNull(validAccessor.getUser());
        assertEquals("bs_ws", validAccessor.getUser().getName());

        // 2. Expired token -> rejected with clear IllegalArgumentException
        StompHeaderAccessor expiredAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        expiredAccessor.addNativeHeader("Authorization", "Bearer " + expiredService.generateToken(activeUser));
        Message<byte[]> expiredMsg = MessageBuilder.createMessage(new byte[0], expiredAccessor.getMessageHeaders());
        IllegalArgumentException expiredEx = assertThrows(
                IllegalArgumentException.class,
                () -> interceptor.preSend(expiredMsg, dummyChannel)
        );
        assertTrue(expiredEx.getMessage().contains("hết hạn"));

        // 3. Disabled account with unexpired token -> rejected
        StompHeaderAccessor disabledAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        disabledAccessor.addNativeHeader("Authorization", "Bearer " + validService.generateToken(disabledUser));
        Message<byte[]> disabledMsg = MessageBuilder.createMessage(new byte[0], disabledAccessor.getMessageHeaders());
        IllegalArgumentException disabledEx = assertThrows(
                IllegalArgumentException.class,
                () -> interceptor.preSend(disabledMsg, dummyChannel)
        );
        assertTrue(disabledEx.getMessage().contains("khóa"));
    }
}

