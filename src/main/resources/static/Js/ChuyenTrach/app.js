(() => {
  "use strict";
  const ICONS = {
      grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      users:
        '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6M21 21v-4a6 6 0 0 0-3-5"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      clipboard:
        '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 15h6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      file: '<path d="M14 2H5v20h14V7zM14 2v5h5M8 12h8M8 16h8"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
      arrow: '<path d="M20 12H4m7-7-7 7 7 7"/>',
      refresh: '<path d="M20 7V2l-4 4a8 8 0 1 0 3 12M20 2h-5"/>',
      eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
      print: '<path d="M6 9V2h12v7M6 17H3V9h18v8h-3M6 14h12v8H6z"/>',
      upload: '<path d="M12 17V3m-5 5 5-5 5 5M4 17v4h16v-4"/>',
      edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
      lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
      logout: '<path d="M9 3H3v18h6M10 12h11m-5-5 5 5-5 5"/>',
      calendar:
        '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M3 10h18M7 2v6M17 2v6"/>',
      hospital:
        '<path d="M3 21V7h18v14M9 7V2h6v5M10 12h4m-2-2v4M9 21v-4h6v4"/>',
    },
    api = window.ClsApi,
    config = window.KTV_CONFIG,
    page = document.body.dataset.page,
    $ = (id) => document.getElementById(id);
  const TITLES = {
      dashboard: "Tổng quan phòng chuyên trách",
      patients: "Danh sách bệnh nhân",
      queue: "Bệnh nhân đang chờ",
      orders: "Danh sách chỉ định",
      orderdetail: "Chi tiết chỉ định",
      resultentry: "Nhập kết quả chỉ định",
      results: "Kết quả đã thực hiện",
      resultdetail: "Chi tiết kết quả",
      history: "Lịch sử tiếp nhận",
      profile: "Hồ sơ cá nhân",
    },
    states = {
      ChoThucHien: "Chờ thực hiện",
      DangThucHien: "Đang thực hiện",
      HoanTat: "Hoàn thành",
      DaHuy: "Đã hủy",
      DaTiepNhan: "Đã tiếp nhận",
      DangCho: "Đang chờ",
    };
  let rows = [],
    filtered = [],
    me = null,
    index = 1,
    loading = false;
  const size = 7;
  function E(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (cls) n.className = cls;
    return n;
  }
  function I(name) {
    const n = E("span");
    n.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.file) +
      "</svg>";
    return n.firstElementChild;
  }
  function add(parent, ...children) {
    for (const child of children.flat())
      if (child != null)
        parent.append(
          child instanceof Node
            ? child
            : document.createTextNode(String(child)),
        );
    return parent;
  }
  function B(text, cls, fn, icon) {
    const n = E("button", null, cls);
    n.type = "button";
    if (icon) n.append(I(icon));
    n.append(document.createTextNode(text));
    if (fn) n.addEventListener("click", fn);
    return n;
  }
  function url(p, id) {
    const u = config.base + p + ".html";
    return u + (id ? "?id=" + encodeURIComponent(id) : "");
  }
  function A(text, p, id, cls = "secondary", icon) {
    const a = E("a", null, cls);
    a.href = url(p, id);
    if (icon) a.append(I(icon));
    a.append(document.createTextNode(text));
    return a;
  }
  function toast(text, error = false) {
    const n = E("div", text, "toast" + (error ? " error" : ""));
    $("toastArea").append(n);
    setTimeout(() => n.remove(), 7000);
  }
  function code(id, p = "CDT") {
    return p + String(id).padStart(6, "0");
  }
  function date(value) {
    if (!value) return "Chưa ghi nhận";
    const m = String(value)
      .slice(0, 10)
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
  }
  function datetime(value) {
    return value
      ? date(value) + " · " + String(value).slice(11, 16)
      : "Chưa ghi nhận";
  }
  function text(value) {
    return value === null || value === undefined || value === ""
      ? "Chưa ghi nhận"
      : String(value);
  }
  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  }
  function badge(s) {
    return E(
      "span",
      states[s] || text(s),
      "badge " + (Object.hasOwn(states, s) ? s : ""),
    );
  }
  function field(label, value) {
    return add(
      E("div", null, "infofield"),
      E("label", label),
      E("strong", text(value)),
    );
  }
  function panel(title, icon = "file") {
    const p = E("section", null, "panel"),
      h = E("div", null, "panelhead"),
      body = E("div", null, "panelbody");
    h.append(add(E("h2"), I(icon), title));
    p.append(h, body);
    return { p, h, body };
  }
  function heading(title, subtitle, icon = "clipboard") {
    const actions = E("div", null, "page-actions");
    const tools = E("div", null, "toolbar");

    actions.append(tools);
    $("pageContent").append(actions);

    return tools;
  }
  function datePick(input) {
    const wrap = E("span", null, "datepick"),
      value = E("span", date(input.value));
    wrap.append(value, I("calendar"), input);
    input.addEventListener(
      "change",
      () => (value.textContent = date(input.value)),
    );
    return wrap;
  }
  function dateControl(parent) {
    const d = E("div", null, "datebar"),
      input = E("input");
    input.id = "workDate";
    input.type = "date";
    input.value = api.today();
    input.setAttribute("aria-label", "Ngày làm việc");
    for (const delta of [-1, 1]) {
      const b = B(delta < 0 ? "‹" : "›", "", () => {
        const v = new Date(input.value + "T12:00:00");
        v.setDate(v.getDate() + delta);
        input.value = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
        if ($("fromDate")) $("fromDate").value = input.value;
        if ($("toDate")) $("toDate").value = input.value;
        input.dispatchEvent(new Event("change"));
      });
      if (delta === -1) d.append(b, datePick(input));
      else d.append(b);
    }
    input.addEventListener("change", () => {
      if ($("fromDate")) $("fromDate").value = input.value;
      if ($("toDate")) $("toDate").value = input.value;
      reload();
    });
    parent.append(d);
  }
  function card(label, value, note, icon, color, bg) {
    const c = E("div", null, "statcard");
    c.style.setProperty("--ic", color);
    c.style.setProperty("--icbg", bg);
    c.append(
      E("label", label),
      E("strong", value),
      E("small", note),
      add(E("span", null, "sticon"), I(icon)),
    );
    return c;
  }
  function statCards() {
    const holder = $("statCards");
    if (!holder) return;
    holder.replaceChildren();
    const count = (s) => rows.filter((r) => r.trangThai === s).length;
    if (page === "history") {
      holder.append(
        card(
          "TỔNG LƯỢT TIẾP NHẬN",
          rows.length,
          "Theo khoảng ngày đã chọn",
          "users",
          "#7353ff",
          "#eeebff",
        ),
        card(
          "ĐÃ TIẾP NHẬN",
          rows.filter((r) => r.trangThaiTiepNhan === "DaTiepNhan").length,
          "Đã ghi nhận tiếp nhận",
          "check",
          "#00b684",
          "#dcfff2",
        ),
        card(
          "ĐANG CHỜ XỬ LÝ",
          rows.filter((r) => r.trangThaiTiepNhan === "DangCho").length,
          "Theo dữ liệu tiếp nhận",
          "clock",
          "#b58500",
          "#fff2d2",
        ),
        card(
          "PHÒNG ĐƯỢC PHÂN CÔNG",
          me.phong,
          "Phạm vi ca trực hiện tại",
          "hospital",
          "#5e53f3",
          "#eeebff",
        ),
      );
      holder.lastElementChild.querySelector("strong").style.fontSize = "16px";
      return;
    }
    const cards =
      page === "queue"
        ? [
            [
              "BỆNH NHÂN ĐANG CHỜ",
              count("ChoThucHien"),
              "Chỉ định chờ tại phòng",
              "clock",
              "#d29d00",
              "#fff8d7",
            ],
            [
              "ĐANG THỰC HIỆN",
              count("DangThucHien"),
              "Chỉ định đang tiến hành",
              "clipboard",
              "#7353ff",
              "#eeebff",
            ],
          ]
        : page === "dashboard"
          ? [
              [
                "CHỈ ĐỊNH HÔM NAY",
                rows.length,
                "Trong phòng được phân công",
                "clipboard",
                "#7353ff",
                "#eeebff",
              ],
              [
                "ĐANG CHỜ THỰC HIỆN",
                count("ChoThucHien"),
                "Sẵn sàng khi đã thanh toán",
                "clock",
                "#d29d00",
                "#fff8d7",
              ],
              [
                "ĐANG THỰC HIỆN",
                count("DangThucHien"),
                "Đang nhập và xử lý kết quả",
                "refresh",
                "#c45add",
                "#f7e8ff",
              ],
              [
                "ĐÃ HOÀN THÀNH",
                count("HoanTat"),
                "Chỉ định đã hoàn tất",
                "check",
                "#00b684",
                "#dcfff2",
              ],
              [
                "KẾT QUẢ CHỜ TRẢ",
                rows.filter((r) => r.trangThai === "HoanTat" && !r.daTra)
                  .length,
                "Chưa xác nhận trả kết quả",
                "file",
                "#e76563",
                "#fff0ed",
              ],
            ]
          : [
              [
                "TỔNG TIẾP NHẬN HÔM NAY",
                new Set(rows.map((r) => r.maBenhNhan)).size,
                "Theo ngày và phòng làm việc",
                "users",
                "#7353ff",
                "#eeebff",
              ],
              [
                "CHỜ THỰC HIỆN",
                count("ChoThucHien"),
                "Chỉ định đang chờ",
                "clipboard",
                "#d29d00",
                "#fff2d2",
              ],
              [
                "ĐANG TIẾN HÀNH",
                count("DangThucHien"),
                "Trong phòng được phân công",
                "refresh",
                "#7353ff",
                "#e5e8ff",
              ],
              [
                "ĐÃ HOÀN THÀNH",
                count("HoanTat"),
                "Đã lưu kết quả",
                "check",
                "#00b684",
                "#dcfff2",
              ],
            ];
    cards.forEach((c) => holder.append(card(...c)));
  }
  function optionField(container, id, label, placeholder) {
    const f = E("div", null, "field"),
      l = E("label", label),
      s = E("select");
    l.htmlFor = id;
    s.id = id;
    s.append(new Option(placeholder, ""));
    s.addEventListener("change", filter);
    f.append(l, s);
    container.append(f);
    return s;
  }
  function filterPanel() {
    const p = E("section", null, "panel filterpanel"),
      r1 = E("div", null, "filterrow"),
      r2 = E("form", null, "filterrow");
    if (["patients", "orders", "history"].includes(page)) {
      const f = E("div", null, "field"),
        label = E("label", "Khoảng ngày"),
        range = E("div", null, "range");
      for (const id of ["fromDate", "toDate"]) {
        const input = E("input");
        input.id = id;
        input.type = "date";
        input.value = api.today();
        input.setAttribute(
          "aria-label",
          id === "fromDate" ? "Từ ngày" : "Đến ngày",
        );
        input.addEventListener("change", reload);
        if (id === "toDate") range.append(E("span", "–"));
        range.append(datePick(input));
      }
      f.append(label, range);
      r1.append(f);
    }
    if (["patients", "orders", "history"].includes(page))
      optionField(
        r1,
        "departmentFilter",
        page === "orders" ? "Khoa chỉ định" : "Khoa",
        "Tất cả khoa",
      );
    if (page === "history")
      optionField(r1, "staffFilter", "Nhân viên tiếp nhận", "Tất cả nhân viên");
    else
      optionField(
        r1,
        "roomFilter",
        "Phòng chuyên trách",
        "Tất cả phòng được phân công",
      );
    if (page !== "history")
      optionField(r1, "serviceFilter", "Dịch vụ kỹ thuật", "Tất cả dịch vụ");
    if (!["queue", "results"].includes(page)) {
      const s = optionField(r1, "stateFilter", "Trạng thái", "Tất cả");
      const list =
        page === "history"
          ? ["DaTiepNhan", "DangCho"]
          : ["ChoThucHien", "DangThucHien", "HoanTat", "DaHuy"];
      list.forEach((state) => s.append(new Option(states[state], state)));
    }
    const box = E("div", null, "searchfield"),
      input = E("input");
    input.id = "search";
    input.placeholder =
      page === "history"
        ? "Tìm kiếm mã tiếp nhận, mã bệnh nhân, họ tên…"
        : "Tìm kiếm mã chỉ định, mã bệnh nhân, tên bệnh nhân…";
    input.setAttribute("aria-label", "Tìm kiếm danh sách");
    input.addEventListener("input", filter);
    box.append(I("search"), input);
    const search = B("Tìm kiếm", "primary", filter, "search");
    r2.append(box, search);
    if (page === "history")
      r2.append(
        B(
          "Đặt lại",
          "secondary",
          () => {
            p.querySelectorAll("select,input").forEach((n) => {
              n.value = n.type === "date" ? api.today() : "";
            });
            reload();
          },
          "refresh",
        ),
      );
    r2.addEventListener("submit", (e) => {
      e.preventDefault();
      filter();
    });
    p.append(r1, r2);
    return p;
  }
  function fillOptions() {
    for (const [id, key] of [
      ["departmentFilter", "khoa"],
      ["roomFilter", "phong"],
      ["serviceFilter", "dichVu"],
      ["staffFilter", "nhanVien"],
    ]) {
      const s = $(id);
      if (!s) continue;
      const v = s.value,
        first = s.options[0].text;
      s.replaceChildren(new Option(first, ""));
      [...new Set(rows.map((r) => r[key]).filter(Boolean))]
        .sort()
        .forEach((x) => s.append(new Option(x, x)));
      s.value = v;
    }
  }
  function filter() {
    const q = norm($("search")?.value),
      state = $("stateFilter")?.value;
    filtered = rows.filter(
      (r) =>
        (!q ||
          norm(
            [
              r.tenBenhNhan,
              r.dienThoai,
              r.dichVu,
              r.bacSi,
              code(r.id),
              code(r.maKetQua || r.id, "KQ"),
              code(r.maBenhNhan, "BN"),
              code(r.maTiepNhan || r.id, "TN"),
            ].join(" "),
          ).includes(q)) &&
        (!$("departmentFilter")?.value ||
          r.khoa === $("departmentFilter").value) &&
        (!$("roomFilter")?.value || r.phong === $("roomFilter").value) &&
        (!$("serviceFilter")?.value || r.dichVu === $("serviceFilter").value) &&
        (!$("staffFilter")?.value || r.nhanVien === $("staffFilter").value) &&
        (!state ||
          (page === "history" ? r.trangThaiTiepNhan : r.trangThai) === state),
    );
    if (page === "queue")
      filtered = filtered.filter((r) => r.trangThai === "ChoThucHien");
    if (page === "results")
      filtered = filtered.filter((r) => r.trangThai === "HoanTat");
    if (page === "patients") {
      const seen = new Set();
      filtered = filtered.filter(
        (r) => !seen.has(r.maBenhNhan) && seen.add(r.maBenhNhan),
      );
    }
    index = 1;
    renderTable();
  }
  function nameCell(r) {
    return add(
      E("div"),
      E("strong", r.tenBenhNhan),
      E("small", code(r.maBenhNhan, "BN")),
    );
  }
  function actions(r) {
    const c = E("div", null, "rowactions");
    if (page === "patients")
      return add(
        c,
        B("Xem hồ sơ", "soft", () => patientDialog(r), "eye"),
      );
    if (page === "results")
      return add(
        c,
        A("Xem chi tiết", "resultdetail", r.id, "secondary", "eye"),
      );
    if (page === "history")
      return add(
        c,
        B("Chi tiết", "soft", () => patientDialog(r), "eye"),
      );
    c.append(
      A(page === "queue" ? "Xem" : "Xem chi tiết", "orderdetail", r.id, "soft"),
    );
    if (page === "dashboard" || page === "queue") {
      if (r.trangThai === "ChoThucHien") {
        const b = B("Thực hiện", "primary", () => start(r.id, b));
        b.disabled = !r.daThanhToan;
        b.title = r.daThanhToan
          ? "Bắt đầu thực hiện"
          : "Chưa thanh toán dịch vụ";
        c.append(b);
      }
      if (r.trangThai === "DangThucHien")
        c.append(A("Nhập kết quả", "resultentry", r.id, "primary"));
    }
    return c;
  }
  function columns() {
    if (page === "patients")
      return [
        ["STT", (_, i) => i],
        ["MÃ BỆNH NHÂN", (r) => E("span", code(r.maBenhNhan, "BN"), "code")],
        ["HỌ TÊN", (r) => E("strong", r.tenBenhNhan)],
        ["NGÀY SINH", (r) => date(r.ngaySinh)],
        ["GIỚI TÍNH", (r) => r.gioiTinh],
        ["KHOA", (r) => r.khoa],
        ["BÁC SĨ CHỈ ĐỊNH", (r) => r.bacSi],
        ["DỊCH VỤ", (r) => E("span", r.dichVu, "pillservice")],
        ["TRẠNG THÁI", (r) => badge(r.trangThai)],
        ["THAO TÁC", actions],
      ];
    if (page === "queue")
      return [
        ["STT", (_, i) => i],
        ["BỆNH NHÂN", nameCell],
        ["DỊCH VỤ", (r) => r.dichVu],
        ["PHÒNG THỰC HIỆN", (r) => E("span", r.phong, "roompill")],
        [
          "THỜI GIAN CHỈ ĐỊNH",
          (r) => datetime(r.ngayChiDinh || r.ngay + " " + r.gio),
        ],
        ["TRẠNG THÁI", (r) => badge(r.trangThai)],
        ["THAO TÁC", actions],
      ];
    if (page === "results")
      return [
        [
          "MÃ KẾT QUẢ",
          (r) => E("span", code(r.maKetQua || r.id, "KQ"), "code"),
        ],
        ["MÃ CHỈ ĐỊNH", (r) => code(r.id)],
        ["BỆNH NHÂN", nameCell],
        ["DỊCH VỤ", (r) => E("span", r.dichVu, "pillservice")],
        ["NGÀY GIỜ CÓ KẾT QUẢ", (r) => datetime(r.ngayCoKetQua)],
        ["KẾT LUẬN", (r) => r.ketLuan || "Chưa có kết luận"],
        ["TRẠNG THÁI", (r) => badge(r.trangThai)],
        ["THAO TÁC", actions],
      ];
    if (page === "history")
      return [
        ["MÃ TIẾP NHẬN", (r) => E("span", code(r.maTiepNhan, "TN"), "code")],
        ["MÃ BN", (r) => code(r.maBenhNhan, "BN")],
        ["BỆNH NHÂN", nameCell],
        ["KHOA", (r) => r.khoa],
        ["BÁC SĨ", (r) => r.bacSi],
        ["NGÀY", (r) => date(r.thoiGianTiepNhan)],
        [
          "GIỜ TIẾP NHẬN",
          (r) =>
            String(r.thoiGianTiepNhan || "").slice(11, 16) || "Chưa ghi nhận",
        ],
        ["STT", (r) => r.stt],
        ["TRẠNG THÁI", (r) => badge(r.trangThaiTiepNhan)],
        ["THAO TÁC", actions],
      ];
    return [
      ["STT", (_, i) => i],
      ["MÃ CHỈ ĐỊNH", (r) => E("span", code(r.id), "code")],
      ["MÃ BỆNH NHÂN", (r) => code(r.maBenhNhan, "BN")],
      ["BỆNH NHÂN", (r) => E("strong", r.tenBenhNhan)],
      ["DỊCH VỤ", (r) => E("span", r.dichVu, "pillservice")],
      ["BÁC SĨ CHỈ ĐỊNH", (r) => r.bacSi],
      ["NGÀY CHỈ ĐỊNH", (r) => date(r.ngayChiDinh || r.ngay)],
      ["TRẠNG THÁI", (r) => badge(r.trangThai)],
      ["THAO TÁC", actions],
    ];
  }
  function renderTable() {
    const c = columns(),
      table = E("table"),
      thead = E("thead"),
      tr = E("tr");
    c.forEach(([title]) => tr.append(E("th", title)));
    thead.append(tr);
    table.append(thead);
    const tbody = E("tbody");
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    index = Math.min(index, pages);
    filtered.slice((index - 1) * size, index * size).forEach((r, i) => {
      const row = E("tr");
      c.forEach(([, render]) => {
        const td = E("td"),
          value = render(r, (index - 1) * size + i + 1);
        add(td, value ?? "Chưa ghi nhận");
        row.append(td);
      });
      tbody.append(row);
    });
    table.append(tbody);
    $("tableArea").replaceChildren(table);
    if (!filtered.length) {
      const empty = add(
        E("div", null, "empty"),
        I("clipboard"),
        E("p", "Không có dữ liệu phù hợp với bộ lọc đã chọn."),
      );
      $("tableArea").append(empty);
    }
    const pager = $("pagination");
    pager.replaceChildren(
      E(
        "span",
        `Hiển thị ${filtered.length ? (index - 1) * size + 1 : 0}–${Math.min(index * size, filtered.length)} trong tổng số ${filtered.length} ${page === "patients" ? "bệnh nhân" : "bản ghi"}`,
      ),
    );
    const controls = E("div", null, "pagercontrols"),
      prev = B("‹", "", () => {
        index--;
        renderTable();
      }),
      next = B("›", "", () => {
        index++;
        renderTable();
      });
    prev.disabled = index === 1;
    next.disabled = index === pages;
    controls.append(prev);
    for (let n = Math.max(1, index - 2); n <= Math.min(pages, index + 2); n++)
      controls.append(
        B(String(n), n === index ? "current" : "", () => {
          index = n;
          renderTable();
        }),
      );
    controls.append(next, E("span", `Trang ${index}/${pages}`));
    pager.append(controls);
  }

function buildList() {
    const content = $("pageContent");

    // 1. Khu vực thao tác nghiệp vụ
    // Không tạo tiêu đề lớn và các nút công cụ cũ.
    if (page === "orders") {
        const counters = E("div", null, "minirow");
        counters.id = "orderCounters";
        content.append(counters);
    }

    // 2. Các thẻ thống kê
    if (["dashboard", "patients", "queue", "history"].includes(page)) {
        let cardClass = "cards";

        if (page === "dashboard") {
            cardClass += " five";
        } else if (page === "queue") {
            cardClass += " queuecards";
        }

        const cards = E("div", null, cardClass);
        cards.id = "statCards";

        content.append(cards);
    }

    // 3. Bộ lọc danh sách
    // Giữ nguyên để tra cứu bệnh nhân và chỉ định.
    content.append(filterPanel());

    // 4. Khu vực bảng danh sách
    const panelList = E("section", null, "panel tablepanel");

    if (page === "queue" || page === "dashboard") {
        const panelTitle = E("div", null, "paneltitle");

        const titleText =
            page === "queue"
                ? "Hàng đợi bệnh nhân chuyên trách hôm nay"
                : "Chỉ định cần thực hiện";

        panelTitle.append(
            add(
                E("h2"),
                I("users"),
                titleText
            )
        );

        panelList.append(panelTitle);
    }

    // 5. Bảng dữ liệu
    const tableArea = E("div", null, "tablewrap");
    tableArea.id = "tableArea";

    tableArea.append(
        E("div", "Đang tải danh sách…", "loading")
    );

    // 6. Phân trang
    const pagination = E("footer", null, "pager");
    pagination.id = "pagination";

    panelList.append(tableArea, pagination);
    content.append(panelList);

    // 7. Chức năng xuất Excel cho trang lịch sử
    if (page === "history") {
        const exportBar = E("div", null, "toolbar");

        exportBar.append(
            B(
                "Xuất Excel",
                "secondary",
                exportCSV,
                "download"
            )
        );

        content.append(exportBar);
    }
}

  async function reload() {
    if (loading) return;
    const from = $("fromDate")?.value || $("workDate")?.value || api.today(),
      to = $("toDate")?.value || from;
    if (!from || !to || to < from)
      return toast("Khoảng ngày không hợp lệ.", true);
    if ((Date.parse(to) - Date.parse(from)) / 86400000 > 365)
      return toast("Chọn khoảng ngày tối đa 366 ngày.", true);
    loading = true;
    try {
      rows =
        page === "history"
          ? await api.history(from, to)
          : await api.list(from, to);
      rows.sort(
        (a, b) =>
          String(a.ngay).localeCompare(String(b.ngay)) ||
          String(a.gio).localeCompare(String(b.gio)) ||
          a.id - b.id,
      );
      statCards();
      fillOptions();
      filter();
      if ($("orderCounters")) {
        $("orderCounters").replaceChildren();
        for (const [state, label] of [
          ["ChoThucHien", "Chờ làm"],
          ["DangThucHien", "Đang làm"],
          ["HoanTat", "Đã xong"],
        ])
          $("orderCounters").append(
            add(
              E("span", null, "ministat"),
              label + ": ",
              E(
                "b",
                String(
                  rows.filter((r) => r.trangThai === state).length,
                ).padStart(2, "0"),
              ),
            ),
          );
      }
    } catch (e) {
      $("tableArea").replaceChildren(
        add(E("div", null, "empty"), I("file"), E("p", e.message)),
      );
      $("pagination").replaceChildren(E("span", "Chưa tải được dữ liệu."));
      toast(e.message, true);
    } finally {
      loading = false;
    }
  }
  function exportCSV() {
    if (!filtered.length) return toast("Không có dữ liệu để xuất.", true);
    const c = columns().filter(([x]) => x !== "THAO TÁC");
    const safe = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const lines = [
      c.map(([h]) => safe(h)).join(","),
      ...filtered.map((r, i) =>
        c
          .map(([, fn]) => {
            const v = fn(r, i + 1);
            return safe(v instanceof Node ? v.textContent : v);
          })
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const u = URL.createObjectURL(blob),
      a = E("a");
    a.href = u;
    a.download = "LichSuTiepNhan.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
    toast("Đã xuất file CSV mở bằng Excel.");
  }
  function patientDialog(r) {
    $("dialogTitle").textContent = "Hồ sơ bệnh nhân · " + r.tenBenhNhan;
    const b = $("dialogBody");
    b.replaceChildren();
    const grid = E("div", null, "detailfields");
    [
      ["Họ và tên", r.tenBenhNhan],
      ["Mã bệnh nhân", code(r.maBenhNhan, "BN")],
      ["Ngày sinh", date(r.ngaySinh)],
      ["Giới tính", r.gioiTinh],
      ["Số điện thoại", r.dienThoai],
      ["Địa chỉ", r.diaChi],
      ["Khoa chỉ định", r.khoa],
      ["Bác sĩ", r.bacSi],
    ].forEach((x) => grid.append(field(...x)));
    b.append(
      grid,
      E("div", null, "divider"),
      E("span", "TIỀN SỬ BỆNH", "caption"),
      E("div", text(r.tienSuBenh), "infobox"),
      add(
        E("div", null, "formfooter"),
        A("Xem chỉ định", "orderdetail", r.id, "primary"),
      ),
    );
    $("commonDialog").showModal();
  }
  function patientBanner(r) {
    const b = E("div", null, "patientbanner"),
      identity = E("div", null, "identity");
    identity.append(
      E("span", initials(r.tenBenhNhan), "avatar"),
      add(
        E("div"),
        add(
          E("strong"),
          r.tenBenhNhan,
          " ",
          E("span", code(r.maBenhNhan, "BN"), "code"),
        ),
        E(
          "small",
          `Giới tính: ${text(r.gioiTinh)} · Ngày sinh: ${date(r.ngaySinh)} · SĐT: ${text(r.dienThoai)}`,
        ),
      ),
    );
    const related = add(
      E("div", null, "related"),
      E("label", "HỒ SƠ BỆNH ÁN LIÊN QUAN"),
      E(
        "span",
        code(r.maHoSoBenhAn || r.maLichKham, "HSBA") +
          " · Khoa: " +
          text(r.khoa),
      ),
    );
    b.append(identity, related);
    return b;
  }
  async function start(id, button) {
    if (button) button.disabled = true;
    try {
      await api.start(id);
      location.href = url("resultentry", id);
    } catch (e) {
      toast(e.message, true);
      if (button) button.disabled = false;
    }
  }
  function orderDetail(r) {
    const tools = heading(
      "Chi tiết chỉ định",
      "Thông tin chi tiết yêu cầu dịch vụ cận lâm sàng và tiến trình thực hiện của bệnh nhân",
      "clipboard",
    );
    tools.append(A("Quay lại", "orders", null, "secondary", "arrow"));
    if (r.trangThai === "ChoThucHien") {
      const b = B(
        "Bắt đầu thực hiện",
        "primary",
        () => start(r.id, b),
        "clock",
      );
      b.disabled = !r.daThanhToan;
      tools.append(b);
    } else if (r.trangThai === "DangThucHien")
      tools.append(A("Nhập kết quả", "resultentry", r.id, "primary", "edit"));
    else if (r.trangThai === "HoanTat")
      tools.append(A("Xem kết quả", "resultdetail", r.id, "primary", "eye"));
    $("pageContent").append(patientBanner(r));
    const grid = E("div", null, "detailgrid"),
      main = panel("THÔNG TIN CHỈ ĐỊNH Y TẾ", "clipboard");
    main.h.append(badge(r.trangThai));
    const fields = E("div", null, "detailfields");
    fields.append(
      field("Mã phiếu chỉ định", code(r.id)),
      field("Bác sĩ chỉ định", r.bacSi),
    );
    main.body.append(
      fields,
      add(
        E("div", null, "servicebox"),
        E("span", "DỊCH VỤ THỰC HIỆN", "caption"),
        E("strong", r.dichVu),
        E(
          "small",
          "Mã dịch vụ: DV" +
            String(r.maDichVu).padStart(3, "0") +
            " · Khoa chỉ định: " +
            text(r.khoa),
        ),
      ),
    );
    const second = E("div", null, "detailfields");
    second.append(
      field("Phòng thực hiện", r.phong),
      field("Thời gian chỉ định", datetime(r.ngayChiDinh)),
    );
    main.body.append(
      second,
      E("div", null, "divider"),
      E("span", "Ghi chú của bác sĩ", "caption"),
      E(
        "div",
        r.ghiChuBacSi || "Chưa có ghi chú riêng trong phiếu chỉ định.",
        "notebox",
      ),
      E("div", null, "divider"),
      E("span", "Tiền sử bệnh", "caption"),
      E("div", text(r.tienSuBenh), "infobox"),
    );
    const side = panel("THÔNG TIN THỰC HIỆN", "hospital");
    side.body.append(
      add(
        E("div", null, "infobox"),
        E(
          "strong",
          r.daThanhToan ? "✓ Dịch vụ đã thanh toán" : "Dịch vụ chưa thanh toán",
        ),
        E(
          "p",
          r.daThanhToan
            ? "Có thể bắt đầu khi chỉ định ở trạng thái chờ thực hiện."
            : "Bệnh nhân cần hoàn tất thanh toán trước khi thực hiện.",
        ),
      ),
      field("Nhân viên đang đăng nhập", me.hoTen),
      E("div", null, "divider"),
      field("Phòng được phân công", me.phong),
      E("div", null, "divider"),
      field("Ca trực", me.caTruc),
      E("div", null, "divider"),
      field("Thông tin liên hệ bệnh nhân", r.dienThoai),
      E(
        "p",
        "Kết quả chỉ được nhập trong lúc đang thực hiện. Kết quả hoàn tất được giữ ở chế độ chỉ đọc.",
        "hint",
      ),
    );
    grid.append(main.p, side.p);
    $("pageContent").append(grid);
  }
  function summary(r) {
    const p = panel("Thông tin chỉ định", "clipboard");
    const mini = add(
      E("div", null, "patientmini"),
      E("span", initials(r.tenBenhNhan), "avatar"),
      add(
        E("div"),
        E("strong", r.tenBenhNhan),
        E("small", "Mã BN: " + code(r.maBenhNhan, "BN")),
        E("small", text(r.gioiTinh) + " · " + date(r.ngaySinh)),
      ),
    );
    p.body.append(mini);
    const list = E("div", null, "summarylist");
    [
      ["DỊCH VỤ", r.dichVu],
      ["BÁC SĨ CHỈ ĐỊNH", r.bacSi],
      ["PHÒNG THỰC HIỆN", r.phong],
      ["NGÀY CHỈ ĐỊNH", datetime(r.ngayChiDinh)],
    ].forEach(([l, v]) =>
      list.append(add(E("div"), E("label", l), E("strong", text(v)))),
    );
    p.body.append(
      list,
      E("div", null, "divider"),
      E("span", "GHI CHÚ BÁC SĨ", "caption"),
      E("div", r.ghiChuBacSi || "Chưa có ghi chú riêng.", "notebox"),
      E("div", null, "divider"),
      E("span", "HỒ SƠ BỆNH ÁN LIÊN QUAN", "caption"),
      E("span", code(r.maHoSoBenhAn || r.maLichKham, "HSBA"), "code"),
      E("p", "Khoa: " + text(r.khoa), "hint"),
    );
    return p.p;
  }
  function attachment(r, parent, editable = false) {
    const title = E(
      "label",
      "File kết quả đính kèm (Phiếu xét nghiệm có chữ ký / Ảnh máy phân tích)",
    );
    parent.append(title);
    const grid = E("div", null, "uploadgrid"),
      filebox = E("div", null, "attachment");
    function display(tep) {
      filebox.replaceChildren();
      if (!tep && !r.fileURL) {
        filebox.append(
          E("span", "PDF", "pdficon"),
          add(
            E("div"),
            E("strong", "Chưa có tệp đính kèm"),
            E(
              "small",
              editable
                ? "PDF, JPG, PNG · Tối đa 5 MB"
                : "Không có tệp kết quả trong hồ sơ.",
            ),
          ),
        );
        return;
      }
      const name = tep?.name || String(r.fileURL).split("/").pop(),
        u = tep?.data || r.fileURL;
      filebox.append(E("span", /pdf/i.test(name) ? "PDF" : "ẢNH", "pdficon"));
      const content = add(
        E("div"),
        E("strong", name),
        E(
          "small",
          tep?.size
            ? `${(tep.size / 1024 / 1024).toFixed(2)} MB`
            : "Tệp kết quả",
        ),
      );
      if (
        u &&
        /^(https?:\/\/|data:application\/pdf;base64,|data:image\/(png|jpeg);base64,)/i.test(
          u,
        )
      ) {
        const a = E("a", "Tải về / Xem tệp");
        a.href = u;
        a.download = name;
        a.target = "_blank";
        a.rel = "noopener";
        content.append(a);
      }
      filebox.append(content);
    }
    display(r.tep);
    if (editable) {
      const upload = add(
        E("label", null, "uploadbox"),
        I("upload"),
        E("strong", "Nhấn để chọn tệp hoặc kéo thả vào đây"),
        E("small", "Hỗ trợ PDF, JPG, PNG (Tối đa 5 MB)"),
      );
      const input = E("input");
      input.type = "file";
      input.accept = "application/pdf,image/png,image/jpeg";
      input.hidden = true;
      input.setAttribute("aria-label", "Chọn tệp kết quả");
      upload.append(input);
      async function choose(file) {
        if (!file) return;
        if (!config.demo)
          return toast(
            "Chưa nối dịch vụ lưu tệp R2 của nhóm. Tệp chưa được tải lên.",
            true,
          );
        if (
          !["application/pdf", "image/png", "image/jpeg"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          return toast("Chỉ nhận PDF, JPG, PNG tối đa 5 MB.", true);
        const reader = new FileReader();
        reader.onload = () => {
          r.tep = { name: file.name, size: file.size, data: reader.result };
          display(r.tep);
        };
        reader.onerror = () => toast("Không đọc được tệp.", true);
        reader.readAsDataURL(file);
      }
      input.addEventListener("change", () => choose(input.files[0]));
      upload.addEventListener("dragover", (e) => e.preventDefault());
      upload.addEventListener("drop", (e) => {
        e.preventDefault();
        choose(e.dataTransfer.files[0]);
      });
      grid.append(upload);
      if (!config.demo)
        parent.append(
          E(
            "p",
            "Upload tệp cần nối dịch vụ R2 của nhóm sau merge; kết quả văn bản vẫn lưu bình thường.",
            "hint",
          ),
        );
    }
    grid.append(filebox);
    parent.append(grid);
    return () => r.tep;
  }
  async function resultEntry(r) {
    const tools = heading(
      "Nhập kết quả chỉ định #" + code(r.id),
      "Biểu mẫu nhập kết quả xét nghiệm và dịch vụ chuyên môn",
      "edit",
    );
    tools.append(
      badge(r.trangThai),
      A("Quay lại danh sách", "orders", null, "secondary", "arrow"),
    );
    const grid = E("div", null, "entrygrid");
    grid.append(summary(r));
    const main = panel("Biểu mẫu nhập kết quả xét nghiệm chuyên môn", "file");
    main.body.append(
      E(
        "p",
        "Vui lòng ghi đầy đủ nội dung và kết luận trước khi hoàn tất kết quả.",
        "hint",
      ),
    );
    if (r.trangThai !== "DangThucHien") {
      main.body.append(
        E(
          "div",
          "Chỉ định này không ở trạng thái đang thực hiện, biểu mẫu nhập đã được khóa.",
          "infobox",
        ),
        A("Xem chi tiết", "orderdetail", r.id, "secondary", "eye"),
      );
      grid.append(main.p);
      $("pageContent").append(grid);
      return;
    }
    const form = E("form", null, "resultform");
    const fields = {};
    for (const [key, title] of [
      ["noiDung", "Nội dung kết quả"],
      ["ketLuan", "Kết luận"],
    ]) {
      const label = add(E("label"), title, " ", E("span", "*", "required")),
        input = E("textarea", null, key === "ketLuan" ? "smallarea" : "");
      input.id = key;
      input.value = r[key] || "";
      input.maxLength = 20000;
      label.htmlFor = key;
      fields[key] = input;
      form.append(label, input);
    }
    let defs = [];
    try {
      defs = await api.indicators(r.id);
    } catch (e) {
      toast(e.message, true);
      main.body.append(
        E(
          "p",
          "Chưa tải được định nghĩa chỉ số. Làm mới trước khi lưu kết quả.",
          "notebox",
        ),
      );
      grid.append(main.p);
      $("pageContent").append(grid);
      return;
    }
    const numbers = [];
    if (defs.length) {
      form.append(E("label", "Bảng chỉ số chuyên môn"));
      const t = E("table", null, "measure"),
        h = E("tr");
      ["Tên chỉ số", "Giá trị", "Đơn vị", "Khoảng tham chiếu"].forEach((x) =>
        h.append(E("th", x)),
      );
      t.append(h);
      defs.forEach((c) => {
        const tr = E("tr"),
          input = E("input");
        input.type = "number";
        input.step = "0.0001";
        input.value =
          r.chiSo?.find((x) => x.tenChiSo === c.tenChiSo)?.giaTri ?? "";
        input.setAttribute("aria-label", c.tenChiSo);
        for (const value of [c.tenChiSo, input, c.donVi, c.giaTriThamChieu])
          tr.append(add(E("td"), value ?? "—"));
        t.append(tr);
        numbers.push({ input, ...c });
      });
      form.append(t);
    }
    const getFile = attachment(r, form, true);
    const footer = E("div", null, "formfooter"),
      draft = B("Lưu nháp", "secondary", () => submit(false), "file"),
      finish = B(
        "Hoàn tất & gửi kết quả",
        "primary",
        () => confirmFinish(),
        "check",
      );
    footer.append(draft, finish);
    form.append(footer);
    form.addEventListener("submit", (e) => e.preventDefault());
    main.body.append(form);
    grid.append(main.p);
    $("pageContent").append(grid);
    let busy = false;
    function body(final) {
      return {
        noiDung: fields.noiDung.value.trim(),
        ketLuan: fields.ketLuan.value.trim(),
        hoanTat: final,
        chiSo: numbers.map(({ input, ...c }) => ({
          ...c,
          giaTri: input.value === "" ? null : Number(input.value),
        })),
        ...(config.demo ? { tep: getFile() } : {}),
      };
    }
    function valid(payload) {
      return (
        payload.noiDung &&
        payload.ketLuan &&
        !payload.chiSo.some(
          (x) => x.giaTri === null || !Number.isFinite(x.giaTri),
        )
      );
    }
    function confirmFinish() {
      if (!valid(body(true)))
        return toast(
          "Cần nhập đủ nội dung, kết luận và các chỉ số bắt buộc.",
          true,
        );
      $("dialogTitle").textContent = "Xác nhận hoàn tất kết quả";
      const b = $("dialogBody");
      b.replaceChildren(
        E(
          "p",
          "Kết quả của " +
            r.tenBenhNhan +
            " sẽ được hoàn tất và chuyển cho bác sĩ. Sau khi hoàn tất, nội dung chuyển sang chế độ chỉ đọc.",
        ),
        add(
          E("div", null, "formfooter"),
          B("Kiểm tra lại", "secondary", () => $("commonDialog").close()),
          B(
            "Hoàn tất kết quả",
            "primary",
            () => {
              $("commonDialog").close();
              submit(true);
            },
            "check",
          ),
        ),
      );
      $("commonDialog").showModal();
    }
    async function submit(final) {
      if (busy) return;
      const payload = body(final);
      if (final && !valid(payload))
        return toast("Vui lòng nhập đủ kết quả.", true);
      busy = true;
      draft.disabled = finish.disabled = true;
      try {
        const result = await api.result(r.id, payload);
        toast(result.message);
        if (final) location.href = url("resultdetail", r.id);
      } catch (e) {
        toast(e.message, true);
      } finally {
        busy = false;
        draft.disabled = finish.disabled = false;
      }
    }
  }
  function resultDetail(r) {
    const tools = heading(
      "Chi tiết kết quả thực hiện",
      "Thông tin chỉ định, chỉ số và kết luận chuyên môn",
      "file",
    );
    tools.append(
      A("Quay lại danh sách", "results", null, "secondary", "arrow"),
      B("In kết quả", "secondary", () => window.print(), "print"),
    );
    if (r.trangThai !== "HoanTat") {
      $("pageContent").append(
        add(
          E("div", null, "empty"),
          I("file"),
          E("p", "Chỉ định chưa hoàn tất kết quả."),
          A("Xem chỉ định", "orderdetail", r.id, "primary"),
        ),
      );
      return;
    }
    const banner = E("div", null, "successbanner");
    banner.append(
      add(E("span", null, "successicon"), I("check")),
      add(
        E("div"),
        E("strong", "Đã hoàn thành và đã gửi kết quả cho bác sĩ"),
        E("small", "Kết quả đã được lưu, thông tin dưới đây ở chế độ chỉ đọc."),
      ),
      E("span", "Đã khóa chỉnh sửa", "badge HoanTat"),
    );
    $("pageContent").append(banner);
    const cards = E("div", null, "resultcards"),
      patient = panel("THÔNG TIN BỆNH NHÂN", "user"),
      order = panel("THÔNG TIN CHỈ ĐỊNH", "clipboard"),
      lookup = panel("MÃ TRA CỨU & THỜI GIAN", "calendar");
    patient.body.append(
      add(
        E("div", null, "patientmini"),
        E("span", initials(r.tenBenhNhan), "avatar"),
        add(
          E("div"),
          E("strong", r.tenBenhNhan),
          E("small", code(r.maBenhNhan, "BN")),
        ),
      ),
      E("p", "Ngày sinh: " + date(r.ngaySinh)),
      E("p", "Số điện thoại: " + text(r.dienThoai)),
    );
    order.body.append(
      E("span", "Dịch vụ thực hiện", "caption"),
      E("strong", r.dichVu),
      E("div", null, "divider"),
      E("span", "Bác sĩ chỉ định", "caption"),
      E("strong", r.bacSi),
      E("p", "Phòng: " + text(r.phong), "hint"),
    );
    lookup.body.append(
      add(
        E("div", null, "summarylist"),
        add(
          E("div"),
          E("label", "Mã kết quả"),
          E("strong", code(r.maKetQua || r.id, "KQ")),
        ),
        add(E("div"), E("label", "Mã phiếu chỉ định"), E("strong", code(r.id))),
        add(
          E("div"),
          E("label", "Mã hồ sơ bệnh án"),
          E("strong", code(r.maHoSoBenhAn || r.maLichKham, "HSBA")),
        ),
        add(
          E("div"),
          E("label", "Thời gian có kết quả"),
          E("strong", datetime(r.ngayCoKetQua)),
        ),
      ),
    );
    cards.append(patient.p, order.p, lookup.p);
    $("pageContent").append(cards);
    const measure = panel(
      "Bảng chi tiết chỉ số sinh hóa & huyết học",
      "clipboard",
    );
    if (r.chiSo?.length) {
      measure.h.append(E("small", r.chiSo.length + " chỉ số trong hạng mục"));
      const table = E("table"),
        head = E("tr");
      [
        "TÊN CHỈ SỐ",
        "GIÁ TRỊ ĐO ĐƯỢC",
        "ĐƠN VỊ",
        "KHOẢNG THAM CHIẾU",
        "ĐÁNH GIÁ / TRẠNG THÁI",
      ].forEach((t) => head.append(E("th", t)));
      table.append(head);
      r.chiSo.forEach((c) => {
        const row = E("tr");
        for (const value of [
          c.tenChiSo,
          c.giaTri,
          c.donVi,
          c.giaTriThamChieu,
          E("span", "Đã ghi nhận", "badge HoanTat"),
        ])
          row.append(add(E("td"), value ?? "Chưa ghi nhận"));
        table.append(row);
      });
      measure.body.style.padding = "0";
      measure.body.append(table);
    } else
      measure.body.append(
        E(
          "div",
          "Dịch vụ này không có bảng chỉ số riêng. Kết quả chuyên môn được trình bày ở phần nội dung và kết luận bên dưới.",
          "infobox",
        ),
      );
    $("pageContent").append(measure.p);
    const lower = E("div", null, "resultlower"),
      assessment = panel("NỘI DUNG ĐÁNH GIÁ & KẾT LUẬN Y KHOA", "file"),
      file = panel("TỆP ĐÍNH KÈM KẾT QUẢ", "file");
    for (const [label, value] of [
      ["Nội dung kết quả", r.noiDung],
      ["Kết luận chuyên môn", r.ketLuan],
    ])
      assessment.body.append(
        add(E("div", null, "valuebox"), E("label", label), text(value)),
      );
    const f = E("div", null, "resultform");
    attachment(r, f);
    file.body.append(f);
    lower.append(assessment.p, file.p);
    $("pageContent").append(lower);
    const bottom = E("div", null, "formfooter");
    bottom.append(
      A("Quay lại danh sách", "results", null, "secondary", "arrow"),
    );
    if (!r.daTra) {
      const b = B(
        "Xác nhận trả kết quả",
        "primary",
        async () => {
          b.disabled = true;
          try {
            await api.release(r.id);
            toast("Đã xác nhận trả kết quả cho " + r.tenBenhNhan + ".");
            b.replaceWith(E("span", "✓ Đã trả kết quả", "badge HoanTat"));
          } catch (e) {
            toast(e.message, true);
            b.disabled = false;
          }
        },
        "check",
      );
      bottom.append(b);
    } else bottom.append(E("span", "✓ Đã trả kết quả", "badge HoanTat"));
    $("pageContent").append(bottom);
  }
  function initials(s) {
    return String(s || "Nhân viên")
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((x) => x[0])
      .join("");
  }
  function profile() {
    heading(
      "Hồ sơ cá nhân",
      "Thông tin tài khoản và thông tin cá nhân nhân viên",
      "user",
    );
    const grid = E("div", null, "profilegrid"),
      identity = E("section", null, "profileidentity"),
      cover = E("div", null, "profilecover"),
      person = E("div", null, "profileperson");
    person.append(
      E("span", initials(me.hoTen), "avatar big"),
      E("h2", me.hoTen),
      E("span", code(me.maNhanVien || me.id || 0, "NV"), "staffcode"),
      E("span", "● Nhân viên phòng chuyên trách", "rolepill"),
    );
    const contacts = E("div", null, "contactlist");
    [
      ["Email làm việc", me.email, "file"],
      ["Số điện thoại", me.soDienThoai, "user"],
      ["Bộ phận trực thuộc", me.phong, "hospital"],
      ["Vai trò hệ thống", "Nhân viên phòng chuyên trách", "clipboard"],
    ].forEach(([l, v, i]) =>
      contacts.append(
        add(
          E("div", null, "contactitem"),
          add(E("span"), I(i)),
          add(E("div"), E("small", l), E("strong", text(v))),
        ),
      ),
    );
    identity.append(cover, person, contacts);
    const details = E("section", null, "panel profiledetails");
    details.append(
      add(
        E("div", null, "panelhead"),
        add(E("h2"), I("user"), "Thông tin chi tiết"),
        E("small", "DỮ LIỆU NỘI BỘ EMR", "caption"),
      ),
    );
    const fields = E("div", null, "profilefields");
    [
      ["HỌ TÊN", me.hoTen],
      ["MÃ NHÂN VIÊN", code(me.maNhanVien || me.id || 0, "NV")],
      ["EMAIL BỆNH VIỆN", me.email],
      ["SỐ ĐIỆN THOẠI LIÊN HỆ", me.soDienThoai],
      ["VAI TRÒ CẤP QUYỀN", "Nhân viên phòng chuyên trách"],
      ["TÌNH TRẠNG TÀI KHOẢN", "● Đang hoạt động bình thường"],
      ["PHÒNG ĐƯỢC PHÂN CÔNG", me.phong],
      ["CA TRỰC", me.caTruc],
    ].forEach(([l, v]) =>
      fields.append(
        add(
          E("div", null, "profilefield"),
          E("label", l),
          E("strong", text(v)),
        ),
      ),
    );
    details.append(
      fields,
      add(
        E("div", null, "profilebuttons"),
        B("Chỉnh sửa hồ sơ", "secondary", editProfile, "edit"),
        B("Đổi mật khẩu", "secondary", passwordDialog, "lock"),
      ),
    );
    grid.append(identity, details);
    $("pageContent").append(grid);
  }
  function editProfile() {
    $("dialogTitle").textContent = "Chỉnh sửa hồ sơ cá nhân";
    const b = $("dialogBody"),
      form = E("form", null, "dialogform"),
      fields = {};
    for (const [k, l, type] of [
      ["hoTen", "Họ và tên", "text"],
      ["email", "Email bệnh viện", "email"],
      ["soDienThoai", "Số điện thoại", "tel"],
    ]) {
      const input = E("input"),
        label = E("label", l);
      input.type = type;
      input.value = me[k] || "";
      input.id = "profile_" + k;
      label.htmlFor = input.id;
      input.required = true;
      input.maxLength = 255;
      fields[k] = input;
      form.append(label, input);
    }
    if (!config.demo)
      form.append(
        E(
          "p",
          "Cần nối API hồ sơ tài khoản chung của nhóm để cập nhật. Chức năng này chưa gửi dữ liệu thật.",
          "hint",
        ),
      );
    const submit = B("Lưu hồ sơ", "primary");
    submit.type = "submit";
    form.append(
      add(
        E("div", null, "formfooter"),
        B("Hủy", "secondary", () => $("commonDialog").close()),
        submit,
      ),
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      try {
        const payload = Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [k, v.value.trim()]),
        );
        const result = await api.updateProfile(payload);
        me = await api.me();
        $("staffName").textContent = me.hoTen;
        $("avatar").textContent = initials(me.hoTen);
        $("pageContent").replaceChildren();
        profile();
        $("commonDialog").close();
        toast(result.message);
      } catch (err) {
        toast(err.message, true);
      } finally {
        submit.disabled = false;
      }
    });
    b.replaceChildren(form);
    $("commonDialog").showModal();
  }
  function passwordDialog() {
    $("dialogTitle").textContent = "Đổi mật khẩu";
    $("dialogBody").replaceChildren(
      E(
        "p",
        "Chức năng đổi mật khẩu cần dùng cùng API xác thực và quy tắc mật khẩu của hệ thống bệnh viện sau khi merge.",
      ),
      E(
        "p",
        "Bản giao diện này chưa thay đổi mật khẩu tài khoản. Không nhập mật khẩu thật vào bản xem thử.",
        "infobox",
      ),
      add(
        E("div", null, "formfooter"),
        B("Đã hiểu", "primary", () => $("commonDialog").close()),
      ),
    );
    $("commonDialog").showModal();
  }
  async function detailPage() {
    const id = new URLSearchParams(location.search).get("id");
    if (!/^\d+$/.test(id || "")) {
      heading(TITLES[page], "Chọn một chỉ định từ danh sách để xem chi tiết.");
      $("pageContent").append(
        add(
          E("div", null, "empty"),
          I("clipboard"),
          E("p", "Chưa chọn chỉ định."),
          A("Mở danh sách chỉ định", "orders", null, "primary"),
        ),
      );
      return;
    }
    const r = await api.detail(id);
    if (page === "orderdetail") orderDetail(r);
    else if (page === "resultentry") await resultEntry(r);
    else resultDetail(r);
  }
  async function init() {
    document.querySelectorAll("nav a[data-page]").forEach((a) => {
      const target = a.dataset.page;
      a.href = url(target);
      a.classList.toggle(
        "active",
        target === page ||
          (["orderdetail", "resultentry"].includes(page) &&
            target === "orders") ||
          (page === "resultdetail" && target === "results"),
      );
    });

    // Cập nhật đường dẫn logo nếu sử dụng giao diện cũ
    const brand = document.querySelector(".brand");

    if (brand) {
        brand.href = url("dashboard");
    }

    // Loại bỏ breadcrumb của giao diện cũ
    const breadcrumb = document.getElementById("breadcrumb");

    if (breadcrumb) {
        breadcrumb.remove();
    }

    // Loại bỏ banner thông báo bản xem thử
    const demoBanner = document.getElementById("demoBanner");

    if (demoBanner) {
        demoBanner.remove();
    }

    $("closeDialog").addEventListener("click", () => $("commonDialog").close());
    $("logout").addEventListener("click", () =>
      toast(
        config.demo
          ? "Bản xem thử không có phiên đăng nhập thật."
          : "Cần nối popup đăng xuất chung của hệ thống sau merge.",
      ),
    );
    $("notifications").addEventListener("click", () =>
      toast(
        `Có ${rows.filter((r) => r.trangThai === "ChoThucHien").length} chỉ định chờ và ${rows.filter((r) => r.trangThai === "HoanTat" && !r.daTra).length} kết quả chờ trả trong danh sách đang xem.`,
      ),
    );
    $("globalSearchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("search")) {
        $("search").value = $("globalSearch").value;
        filter();
      } else
        location.href =
          url("orders") + "?q=" + encodeURIComponent($("globalSearch").value);
    });
    try {
      me = await api.me();
      $("staffName").textContent = me.hoTen;
      $("avatar").textContent = initials(me.hoTen);
      $("pageContent").replaceChildren();
      if (page === "profile") profile();
      else if (["orderdetail", "resultentry", "resultdetail"].includes(page))
        await detailPage();
      else {
        buildList();
        const q = new URLSearchParams(location.search).get("q");
        if (q) $("search").value = q;
        await reload();
      }
    } catch (e) {
      $("pageContent").replaceChildren(
        add(
          E("div", null, "empty"),
          I("file"),
          E("p", e.message),
          B("Thử lại", "secondary", () => location.reload(), "refresh"),
        ),
      );
      toast(e.message, true);
    }
  }
  init();
})();
