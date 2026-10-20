
package QuanLyBenhVien.DTO;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public class DatLichKhamRequest {

    @NotNull
    private Integer maLichLamViec;

    @NotBlank
    @Size(max = 255)
    private String lyDoKham;

    @NotNull
    private LocalTime gioKham;

    public Integer getMaLichLamViec() {
        return maLichLamViec;
    }

    public void setMaLichLamViec(Integer maLichLamViec) {
        this.maLichLamViec = maLichLamViec;
    }

    public String getLyDoKham() {
        return lyDoKham;
    }

    public void setLyDoKham(String lyDoKham) {
        this.lyDoKham = lyDoKham;
    }

    public LocalTime getGioKham() {
        return gioKham;
    }

    public void setGioKham(LocalTime gioKham) {
        this.gioKham = gioKham;
    }
}
