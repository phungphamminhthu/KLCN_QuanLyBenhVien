package QuanLyBenhVien.Entity;

import java.io.Serializable;
import java.util.Objects;

public class CTThanhToanId implements Serializable {

    private Integer maThanhToan;
    private Integer maCTHoaDon;

    public CTThanhToanId() {}

    public CTThanhToanId(Integer maThanhToan, Integer maCTHoaDon) {
        this.maThanhToan = maThanhToan;
        this.maCTHoaDon = maCTHoaDon;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (!(obj instanceof CTThanhToanId that)) return false;
        return Objects.equals(maThanhToan, that.maThanhToan)
                && Objects.equals(maCTHoaDon, that.maCTHoaDon);
    }

    @Override
    public int hashCode() {
        return Objects.hash(maThanhToan, maCTHoaDon);
    }
}