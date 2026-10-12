document.addEventListener(
    "DOMContentLoaded",
    function () {

        "use strict";


        // =====================================================
        // LẤY ID ĐƠN THUỐC
        // =====================================================

        const parts =
            window.location.pathname
                .split("/")
                .filter(Boolean);


        const maDonThuoc =
            parts[parts.length - 1];


        // =====================================================
        // ELEMENTS
        // =====================================================

        const successOrderCode =
            document.getElementById(
                "successOrderCode"
            );

        const successPatientName =
            document.getElementById(
                "successPatientName"
            );

        const backToWaitingButton =
            document.getElementById(
                "backToWaitingButton"
            );

        const historyButton =
            document.getElementById(
                "historyButton"
            );

        const viewPrescriptionButton =
            document.getElementById(
                "viewPrescriptionButton"
            );


        // =====================================================
        // TOKEN
        // =====================================================

        function getToken() {

            return (
                sessionStorage.getItem(
                    "Token"
                )
                ||
                localStorage.getItem(
                    "Token"
                )
                ||
                ""
            );

        }


        // =====================================================
        // LOAD THÔNG TIN ĐƠN THUỐC
        // =====================================================

        async function loadPrescription() {

            const token =
                getToken();


            if (!token) {

                successOrderCode.textContent =
                    maDonThuoc
                    ? "DP"
                        + String(
                            maDonThuoc
                        ).padStart(
                            5,
                            "0"
                        )
                    : "-";

                successPatientName.textContent =
                    "-";

                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/duocsi/cho-cap-thuoc/"
                        +
                        encodeURIComponent(
                            maDonThuoc
                        ),
                        {
                            method: "GET",

                            headers: {
                                "Authorization":
                                    "Bearer "
                                    + token
                            }
                        }
                    );


                if (!response.ok) {

                    successOrderCode.textContent =
                        maDonThuoc
                            ? "DP"
                                + String(
                                    maDonThuoc
                                ).padStart(
                                    5,
                                    "0"
                                )
                            : "-";

                    successPatientName.textContent =
                        "-";

                    return;
                }


                const data =
                    await response.json();


                successOrderCode.textContent =
                    data.maHienThi
                    ||
                    (
                        "DP"
                        +
                        String(
                            maDonThuoc
                        ).padStart(
                            5,
                            "0"
                        )
                    );


                successPatientName.textContent =
                    data.benhNhan
                    ||
                    "-";

            }
            catch (error) {

                console.error(
                    "Không thể tải thông tin đơn thuốc:",
                    error
                );


                successOrderCode.textContent =
                    maDonThuoc
                        ? "DP"
                            + String(
                                maDonThuoc
                            ).padStart(
                                5,
                                "0"
                            )
                        : "-";

                successPatientName.textContent =
                    "-";

            }

        }


        // =====================================================
        // VỀ DANH SÁCH CHỜ
        // =====================================================

        backToWaitingButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/DuocSi/cho-cap-thuoc";

            }
        );


        // =====================================================
        // LỊCH SỬ
        // =====================================================

        historyButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "/DuocSi/lich-su-cap-thuoc";

            }
        );


        // =====================================================
        // XEM ĐƠN THUỐC
        // =====================================================

        viewPrescriptionButton.addEventListener(
            "click",
            function () {

                if (
                    !maDonThuoc ||
                    !/^\d+$/.test(
                        maDonThuoc
                    )
                ) {
                    return;
                }


                window.location.href =
                    "/DuocSi/chi-tiet-don-thuoc/"
                    +
                    encodeURIComponent(
                        maDonThuoc
                    );

            }
        );


        // =====================================================
        // INIT
        // =====================================================

        if (
            maDonThuoc &&
            /^\d+$/.test(
                maDonThuoc
            )
        ) {

            loadPrescription();

        }
        else {

            successOrderCode.textContent =
                "-";

            successPatientName.textContent =
                "-";

        }

    }

);