package QuanLyBenhVien.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    // @Configuration: khai báo lớp cấu hình Spring.
    //@Bean: đăng ký một đối tượng vào Spring Container.
    //RestClient.Builder: công cụ tạo HTTP Client để Spring Boot gửi request sang Python FastAPI
    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
}
