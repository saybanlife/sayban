import * as React from "react";
import { useRouter } from "next/router";
import ResetPassword from "./ResetPassword";
import pageStyles from "./resetPasswordPage.module.css";

function ResetPasswordPage() {
  const router = useRouter();

  const handleBackToLogin = React.useCallback(() => {
    router.push("/panel/login/");
  }, [router]);

  return (
    <section dir="rtl" className={pageStyles.page}>
      <div className={pageStyles.layout}>
        <img
          alt=""
          className={pageStyles.backgroundImage}
          src="/plasmic/sayban/images/image22.svg"
        />

        <div className={pageStyles.content}>
          <div className={pageStyles.brandRow}>
            <img
              alt="سایبان"
              className={pageStyles.logo}
              src="/plasmic/sayban/images/untitledPicturePng.png"
            />
            <p className={pageStyles.brandName}>سایبان</p>
          </div>

          <div className={pageStyles.formSection}>
            <ResetPassword onBackToLogin={handleBackToLogin} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResetPasswordPage;
