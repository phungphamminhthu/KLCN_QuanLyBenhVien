package QuanLyBenhVien.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class YeuCauBaoBanRequest {

    @NotNull(message = "Mã lịch làm việc không được để trống")
    private Integer maLichLamViec;

    @NotBlank(message = "Vui lòng nhập lý do báo bận")
    @Size(max = 500, message = "Lý do không được vượt quá 500 ký tự")
    private String lyDo;

    public Integer getMaLichLamViec() {
        return maLichLamViec;
    }

    public void setMaLichLamViec(Integer maLichLamViec) {
        this.maLichLamViec = maLichLamViec;
    }

    public String getLyDo() {
        return lyDo;
    }

    public void setLyDo(String lyDo) {
        this.lyDo = lyDo;
    }
}