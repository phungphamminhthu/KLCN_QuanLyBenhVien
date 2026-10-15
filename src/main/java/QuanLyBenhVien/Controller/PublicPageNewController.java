
package QuanLyBenhVien.Controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Controller
public class PublicPageNewController {

    private final JdbcTemplate jdbcTemplate;

    private static final int PAGE_SIZE = 12;

    public PublicPageNewController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ========================================
    // 1. TRANG CHỦ - 3 TIN TỨC MỚI NHẤT
    // ========================================

    @GetMapping("/home")
    public String homePage(Model model) {

        List<Map<String, Object>> latestNews =
                jdbcTemplate.queryForList("""
                    SELECT
                        t.MaTinTuc AS maTinTuc,
                        t.TieuDe AS tieuDe,
                        t.NoiDung AS noiDung,
                        t.ImageURL AS imageURL,
                        DATE_FORMAT(
                            t.NgayDang,
                            '%d/%m/%Y'
                        ) AS ngayDang,
                        d.MaDanhMuc AS maDanhMuc,
                        d.TenDanhMuc AS tenDanhMuc
                    FROM TinTuc t
                    JOIN DanhMucTinTuc d
                        ON t.MaDanhMuc = d.MaDanhMuc
                    WHERE t.TrangThai = 'Đang hiển thị'
                    ORDER BY t.NgayDang DESC,
                             t.MaTinTuc DESC
                    LIMIT 3
                """);

        prepareArticles(latestNews);

        model.addAttribute("latestNews", latestNews);

        return "Public/home";
    }

    // ========================================
    // 2. TRANG DANH SÁCH TIN TỨC
    // ========================================

    @GetMapping("/news")
    public String newsPage(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) Integer category,
            @RequestParam(defaultValue = "1") int page,
            Model model
    ) {

        keyword = keyword == null ? "" : keyword.trim();

        page = Math.max(page, 1);

        StringBuilder where = new StringBuilder("""
                WHERE t.TrangThai = 'Đang hiển thị'
                """);

        List<Object> params = new ArrayList<>();

        // Tìm kiếm theo tiêu đề và nội dung
        if (!keyword.isBlank()) {

            where.append("""
                    AND (
                        t.TieuDe LIKE ?
                        OR t.NoiDung LIKE ?
                    )
                    """);

            String search = "%" + keyword + "%";

            params.add(search);
            params.add(search);
        }

        // Lọc theo danh mục
        if (category != null && category > 0) {

            where.append(" AND t.MaDanhMuc = ? ");

            params.add(category);
        }

        // Đếm số bài viết
        String countSql = """
                SELECT COUNT(*)
                FROM TinTuc t
                """ + where;

        Long count = jdbcTemplate.queryForObject(
                countSql,
                Long.class,
                params.toArray()
        );

        long total = count == null ? 0 : count;

        int totalPages = Math.max(
                1,
                (int) Math.ceil((double) total / PAGE_SIZE)
        );

        page = Math.min(page, totalPages);

        // Lấy danh sách bài viết
        String sql = """
                SELECT
                    t.MaTinTuc AS maTinTuc,
                    t.TieuDe AS tieuDe,
                    t.NoiDung AS noiDung,
                    t.ImageURL AS imageURL,
                    DATE_FORMAT(
                        t.NgayDang,
                        '%d/%m/%Y'
                    ) AS ngayDang,
                    d.MaDanhMuc AS maDanhMuc,
                    d.TenDanhMuc AS tenDanhMuc
                FROM TinTuc t
                JOIN DanhMucTinTuc d
                    ON t.MaDanhMuc = d.MaDanhMuc
                """ + where + """
                
                ORDER BY t.NgayDang DESC,
                         t.MaTinTuc DESC
                LIMIT ? OFFSET ?
                """;

        List<Object> queryParams = new ArrayList<>(params);

        queryParams.add(PAGE_SIZE);
        queryParams.add((page - 1) * PAGE_SIZE);

        List<Map<String, Object>> articles =
                jdbcTemplate.queryForList(
                        sql,
                        queryParams.toArray()
                );

        prepareArticles(articles);

        // Danh sách danh mục
        List<Map<String, Object>> categories =
                jdbcTemplate.queryForList("""
                    SELECT
                        MaDanhMuc AS maDanhMuc,
                        TenDanhMuc AS tenDanhMuc
                    FROM DanhMucTinTuc
                    ORDER BY MaDanhMuc
                """);

        model.addAttribute("articles", articles);
        model.addAttribute("categories", categories);
        model.addAttribute("keyword", keyword);
        model.addAttribute("category", category);
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", totalPages);
        model.addAttribute("totalArticles", total);

        model.addAttribute(
                "showFeatured",
                page == 1
                        && keyword.isBlank()
                        && category == null
        );

        return "Public/news";
    }

    // ========================================
    // 3. TRANG CHI TIẾT TIN TỨC
    // ========================================

    @GetMapping("/news/{maTinTuc}")
    public String newsDetail(
            @PathVariable Integer maTinTuc,
            Model model
    ) {

        List<Map<String, Object>> articles =
                jdbcTemplate.queryForList("""
                    SELECT
                        t.MaTinTuc AS maTinTuc,
                        t.TieuDe AS tieuDe,
                        t.NoiDung AS noiDung,
                        t.ImageURL AS imageURL,
                        DATE_FORMAT(
                            t.NgayDang,
                            '%d/%m/%Y'
                        ) AS ngayDang,
                        d.MaDanhMuc AS maDanhMuc,
                        d.TenDanhMuc AS tenDanhMuc
                    FROM TinTuc t
                    JOIN DanhMucTinTuc d
                        ON t.MaDanhMuc = d.MaDanhMuc
                    WHERE t.MaTinTuc = ?
                      AND t.TrangThai = 'Đang hiển thị'
                """, maTinTuc);

        if (articles.isEmpty()) {
            throw new ResponseStatusException(
                    NOT_FOUND,
                    "Bài viết không tồn tại hoặc đã bị ẩn"
            );
        }

        prepareArticles(articles);

        Map<String, Object> article = articles.get(0);

        // Lấy tối đa 3 bài liên quan
        List<Map<String, Object>> related =
                jdbcTemplate.queryForList("""
                    SELECT
                        t.MaTinTuc AS maTinTuc,
                        t.TieuDe AS tieuDe,
                        t.NoiDung AS noiDung,
                        t.ImageURL AS imageURL,
                        DATE_FORMAT(
                            t.NgayDang,
                            '%d/%m/%Y'
                        ) AS ngayDang,
                        d.MaDanhMuc AS maDanhMuc,
                        d.TenDanhMuc AS tenDanhMuc
                    FROM TinTuc t
                    JOIN DanhMucTinTuc d
                        ON t.MaDanhMuc = d.MaDanhMuc
                    WHERE t.MaDanhMuc = ?
                      AND t.MaTinTuc <> ?
                      AND t.TrangThai = 'Đang hiển thị'
                    ORDER BY t.NgayDang DESC,
                             t.MaTinTuc DESC
                    LIMIT 3
                """,
                        article.get("maDanhMuc"),
                        maTinTuc
                );

        prepareArticles(related);

        model.addAttribute("article", article);
        model.addAttribute("relatedArticles", related);

        return "Public/news-detail";
    }

    // ========================================
    // 4. XỬ LÝ NỘI DUNG BÀI VIẾT
    // ========================================

    private void prepareArticles(
            List<Map<String, Object>> articles
    ) {

        for (Map<String, Object> article : articles) {

            Object rawContent = article.get("noiDung");

            String content = rawContent == null
                    ? ""
                    : rawContent.toString();

            // Loại thẻ HTML khỏi mô tả ngắn
            String plainText = content
                    .replaceAll("<[^>]*>", " ")
                    .replaceAll("\\s+", " ")
                    .trim();

            String excerpt = plainText.length() > 170
                    ? plainText.substring(0, 170) + "..."
                    : plainText;

            article.put("moTa", excerpt);

            article.put(
                    "anh",
                    resolveImage(article.get("imageURL"))
            );
        }
    }

    // ========================================
    // 5. XỬ LÝ ĐƯỜNG DẪN HÌNH ẢNH
    // ========================================

    private String resolveImage(Object raw) {

        if (raw == null) {
            return "";
        }

        String value = raw.toString().trim();

        if (value.isBlank()) {
            return "";
        }

        // URL ảnh đầy đủ
        if (value.startsWith("https://")
                || value.startsWith("http://")) {
            return value;
        }

        // Đường dẫn bắt đầu bằng /
        if (value.startsWith("/")) {
            return value;
        }

        // File key ảnh lưu trên Cloudflare R2
        return "/api/images/view?fileKey="
                + URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }
}
