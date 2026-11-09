package QuanLyBenhVien.DTO;

import jakarta.validation.constraints.NotBlank;

public class ChatRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String noiDung;

    public String getNoiDung() {
        return noiDung;
    }

    public void setNoiDung(String noiDung) {
        this.noiDung = noiDung;
    }
}