
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.PythonChatRequest;
import QuanLyBenhVien.DTO.PythonChatResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PythonAiClient {

    private final RestClient restClient;

    public PythonAiClient(
            RestClient.Builder builder,
            @Value("${ai.service.base-url:http://127.0.0.1:8000}")
            String baseUrl) {

        this.restClient = builder
                .baseUrl(baseUrl)
                .build();
    }

    public PythonChatResponse guiCauHoi(String noiDung) {

        PythonChatResponse response = restClient
                .post()
                .uri("/api/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new PythonChatRequest(noiDung))
                .retrieve()
                .body(PythonChatResponse.class);

        if (response == null
                || response.getAnswer() == null
                || response.getAnswer().isBlank()) {

            throw new RuntimeException(
                    "Python AI Service không trả về câu trả lời"
            );
        }

        return response;
    }
}
