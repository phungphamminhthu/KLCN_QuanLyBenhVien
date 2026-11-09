
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.*;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.ChatbotService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    // ============================
    // 1. Tạo phiên trò chuyện
    // ============================
    @PostMapping("/conversations")
    public ResponseEntity<PhienTroChuyenResponse> taoPhien(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Integer maNguoiDung = userDetails
                .getNguoiDung()
                .getMaNguoiDung();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(chatbotService.taoPhien(maNguoiDung));
    }

    // ==================================
    // 2. Lấy danh sách phiên trò chuyện
    // ==================================
    @GetMapping("/conversations")
    public ResponseEntity<List<PhienTroChuyenResponse>> layDanhSachPhien(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Integer maNguoiDung = userDetails
                .getNguoiDung()
                .getMaNguoiDung();

        return ResponseEntity.ok(
                chatbotService.layDanhSachPhien(maNguoiDung)
        );
    }


    // =================================
    // 3. Lấy lịch sử tin nhắn
    // =================================
    @GetMapping("/conversations/{maPhien}/messages")
    public ResponseEntity<List<TinNhanResponse>> layLichSu(
            @PathVariable Integer maPhien,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Integer maNguoiDung = userDetails
                .getNguoiDung()
                .getMaNguoiDung();

        return ResponseEntity.ok(
                chatbotService.layLichSu(maPhien, maNguoiDung)
        );
    }

    // ==================================
    // 4. Gửi và lưu tin nhắn người dùng
    // ==================================
    @PostMapping("/conversations/{maPhien}/messages")
    public ResponseEntity<ChatResponse> guiTinNhan(
            @PathVariable Integer maPhien,
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Integer maNguoiDung = userDetails
                .getNguoiDung()
                .getMaNguoiDung();

        ChatResponse response =
                chatbotService.guiTinNhanVaNhanPhanHoi(
                        maPhien,
                        maNguoiDung,
                        request.getNoiDung().trim()
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // ================================
    // 5. Xóa phiên trò chuyện
    // ===============================
    @DeleteMapping("/conversations/{maPhien}")
    public ResponseEntity<Void> xoaPhien(
            @PathVariable Integer maPhien,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Integer maNguoiDung = userDetails
                .getNguoiDung()
                .getMaNguoiDung();

        chatbotService.xoaPhien(maPhien, maNguoiDung);

        return ResponseEntity.noContent().build();
    }
}
