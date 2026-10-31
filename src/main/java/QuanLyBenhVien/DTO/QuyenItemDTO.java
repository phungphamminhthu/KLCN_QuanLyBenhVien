package QuanLyBenhVien.DTO;

public class QuyenItemDTO {

    private Integer MaQuyen;
    private String TenQuyen;
    private String NhomQuyen;
    private String MoTa;

    private boolean QuyenXem;
    private boolean QuyenThem;
    private boolean QuyenSua;
    private boolean QuyenXoa;

    public Integer getMaQuyen() { return MaQuyen; }
    public void setMaQuyen(Integer MaQuyen) { this.MaQuyen = MaQuyen; }

    public String getTenQuyen() { return TenQuyen; }
    public void setTenQuyen(String TenQuyen) { this.TenQuyen = TenQuyen; }

    public String getNhomQuyen() { return NhomQuyen; }
    public void setNhomQuyen(String NhomQuyen) { this.NhomQuyen = NhomQuyen; }

    public String getMoTa() { return MoTa; }
    public void setMoTa(String MoTa) { this.MoTa = MoTa; }

    public boolean isQuyenXem() { return QuyenXem; }
    public void setQuyenXem(boolean QuyenXem) { this.QuyenXem = QuyenXem; }

    public boolean isQuyenThem() { return QuyenThem; }
    public void setQuyenThem(boolean QuyenThem) { this.QuyenThem = QuyenThem; }

    public boolean isQuyenSua() { return QuyenSua; }
    public void setQuyenSua(boolean QuyenSua) { this.QuyenSua = QuyenSua; }

    public boolean isQuyenXoa() { return QuyenXoa; }
    public void setQuyenXoa(boolean QuyenXoa) { this.QuyenXoa = QuyenXoa; }
}