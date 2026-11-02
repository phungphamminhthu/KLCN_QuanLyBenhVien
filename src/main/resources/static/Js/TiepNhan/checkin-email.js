
(() => {
    "use strict";

    // Email liên hệ có thể được dùng cho nhiều hồ sơ.
    // Chỉ kiểm tra định dạng, không kiểm tra email trùng.
    // Email đăng nhập vẫn cần được quản lý ở backend.

    const form = document.getElementById(
        "create-patient-form"
    );

    const input = document.getElementById(
        "new-email"
    );

    if (!form || !input) return;

    const EMAIL_PATTERN =
        /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

    let feedback = document.getElementById(
        "new-email-feedback"
    );

    if (!feedback) {
        feedback = document.createElement("div");
        feedback.id = "new-email-feedback";
        feedback.className = "form-text";

        feedback.setAttribute(
            "aria-live",
            "polite"
        );

        input.insertAdjacentElement(
            "afterend",
            feedback
        );
    }

    input.setAttribute(
        "aria-describedby",
        feedback.id
    );

    function validateEmail() {
        const email = input.value
            .trim()
            .toLowerCase();

        input.setCustomValidity("");

        input.classList.remove(
            "is-valid",
            "is-invalid"
        );

        feedback.className = "form-text";

        if (!email) {
            feedback.textContent =
                "Email liên hệ không bắt buộc.";

            return true;
        }

        if (
            email.length > 255
            || !EMAIL_PATTERN.test(email)
        ) {
            const message =
                "Email không đúng định dạng.";

            feedback.textContent = message;
            feedback.classList.add("text-danger");

            input.classList.add("is-invalid");
            input.setCustomValidity(message);

            return false;
        }

        feedback.textContent =
            "Email hợp lệ. Có thể dùng cùng email liên hệ cho nhiều hồ sơ.";

        feedback.classList.add("text-success");
        input.classList.add("is-valid");

        return true;
    }

    input.addEventListener(
        "input",
        validateEmail
    );

    input.addEventListener(
        "blur",
        validateEmail
    );

    form.addEventListener(
        "submit",
        event => {
            if (!validateEmail()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                input.focus();
            }
        },
        true
    );

    form.addEventListener(
        "reset",
        () => {
            input.setCustomValidity("");

            input.classList.remove(
                "is-invalid",
                "is-valid"
            );

            feedback.textContent = "";
        }
    );
})();
