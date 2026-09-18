package QuanLyBenhVien.Controller;


import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/test/users")
public class TestNguoiDungController {
    private final NguoiDungRepository nguoiDungRepository;

    public TestNguoiDungController(
            NguoiDungRepository nguoiDungRepository) {

        this.nguoiDungRepository = nguoiDungRepository;
    }

    @GetMapping
    public List<NguoiDung> getAll() {
        return nguoiDungRepository.findAll();
    }
}
