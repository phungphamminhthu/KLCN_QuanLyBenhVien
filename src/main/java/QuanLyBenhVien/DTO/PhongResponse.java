package QuanLyBenhVien.DTO;

public class PhongResponse {
    private Integer maPhong;

    private Integer maKhoa;

    private String tenKhoa;

    private String tenPhong;

    private String loaiPhong;

    private String viTri;

    private Boolean trangThai;


    public PhongResponse() {
    }


    public PhongResponse(
            Integer maPhong,
            Integer maKhoa,
            String tenKhoa,
            String tenPhong,
            String loaiPhong,
            String viTri,
            Boolean trangThai
    ) {
        this.maPhong = maPhong;
        this.maKhoa = maKhoa;
        this.tenKhoa = tenKhoa;
        this.tenPhong = tenPhong;
        this.loaiPhong = loaiPhong;
        this.viTri = viTri;
        this.trangThai = trangThai;
    }


    // =========================
    // GETTER / SETTER
    // =========================

    public Integer getMaPhong() {
        return maPhong;
    }

    public void setMaPhong(Integer maPhong) {
        this.maPhong = maPhong;
    }

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public String getTenKhoa() {
        return tenKhoa;
    }

    public void setTenKhoa(String tenKhoa) {
        this.tenKhoa = tenKhoa;
    }

    public String getTenPhong() {
        return tenPhong;
    }

    public void setTenPhong(String tenPhong) {
        this.tenPhong = tenPhong;
    }

    public String getLoaiPhong() {
        return loaiPhong;
    }

    public void setLoaiPhong(String loaiPhong) {
        this.loaiPhong = loaiPhong;
    }

    public String getViTri() {
        return viTri;
    }

    public void setViTri(String viTri) {
        this.viTri = viTri;
    }

    public Boolean getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Boolean trangThai) {
        this.trangThai = trangThai;
    }
}
