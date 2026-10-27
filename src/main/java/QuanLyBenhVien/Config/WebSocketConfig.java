
package QuanLyBenhVien.Config;

import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Value("${app.websocket.allowed-origins:*}")
    private String allowedOrigins;

    public WebSocketConfig(
            JwtService jwtService,
            CustomUserDetailsService userDetailsService) {

        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    // Cấu hình STOMP broker
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    // Endpoint WebSocket, không phụ thuộc địa chỉ máy cụ thể
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        origins.toArray(new String[0])
//                        "http://localhost:8080",
//                        "http://127.0.0.1:8080"
                );
    }

    // Xác thực JWT khi client gửi STOMP CONNECT
    @Override
    public void configureClientInboundChannel(
            ChannelRegistration registration) {

        registration.interceptors(new ChannelInterceptor() {

            @Override
            public Message<?> preSend(
                    Message<?> message,
                    MessageChannel channel) {

                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(
                                message,
                                StompHeaderAccessor.class
                        );

                if (accessor == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                    String authorization =
                            accessor.getFirstNativeHeader("Authorization");

                    if (authorization == null
                            || !authorization.startsWith("Bearer ")
                            || authorization.substring(7).trim().isEmpty()) {

                        throw new IllegalArgumentException(
                                "Thiếu JWT khi kết nối WebSocket"
                        );
                    }

                    String token = authorization.substring(7).trim();

                    String username =
                            jwtService.extractTenDangNhap(token);

                    if (username == null || username.isBlank()) {
                        throw new IllegalArgumentException(
                                "Không lấy được tài khoản từ JWT"
                        );
                    }

                    CustomUserDetails userDetails =
                            (CustomUserDetails) userDetailsService
                                    .loadUserByUsername(username);

                    if (!jwtService.isTokenValid(token, userDetails)) {
                        throw new IllegalArgumentException(
                                "JWT không hợp lệ hoặc đã hết hạn"
                        );
                    }

                    Authentication authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    accessor.setUser(authentication);
                }

                if (accessor != null
                        && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {

                    String destination = accessor.getDestination();

                    // Chỉ cho đăng ký đúng kênh thông báo cá nhân.
                    if (!"/user/queue/thong-bao".equals(destination)) {
                        throw new IllegalArgumentException(
                                "Không được đăng ký kênh WebSocket này."
                        );
                    }

//                    if (!(accessor.getUser() instanceof Authentication auth)
//                            || !auth.isAuthenticated()
//                            || auth.getAuthorities().stream().noneMatch(
//                            role -> "ROLE_BACSI".equals(role.getAuthority())
//                    )) {
//
//                        throw new IllegalArgumentException(
//                                "Chỉ bác sĩ đã đăng nhập mới được nhận thông báo."
//                        );
//                    }
                    if (!(accessor.getUser() instanceof Authentication auth)
                            || !auth.isAuthenticated()) {

                        throw new IllegalArgumentException(
                                "Chỉ người dùng đã đăng nhập mới được nhận thông báo."
                        );
                    }
                }

// Không cho client tự gửi tin vào broker.
                if (accessor != null
                        && StompCommand.SEND.equals(accessor.getCommand())) {

                    throw new IllegalArgumentException(
                            "Client không được tự gửi thông báo."
                    );
                }


                return message;
            }
        });
    }
}
