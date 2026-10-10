import * as React from "react";
import {
  PlasmicAbout,
  DefaultAboutProps,
} from "./plasmic/sayban/PlasmicAbout";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import styles from "./AboutContent.module.css";

export interface AboutProps extends DefaultAboutProps {}

function About_(props: AboutProps, ref: HTMLElementRefOf<"div">) {
  return (
    <PlasmicAbout
      root={{ ref }}
      {...props}
      img={{
        render: () => (
          <div className={styles.wrapper}>
            {/* Hero */}
            <section className={styles.hero}>
              <img
                src="/plasmic/sayban/images/geminiGeneratedImageGz414Ogz414Ogz41PhotoroomPng.png"
                alt="سایبان"
                className={styles.heroImg}
              />
              <h1 className={styles.heroTitle}>درباره سایبان</h1>
              <p className={styles.heroSubtitle}>
                سایبان، همراهی برای زندگی بهتر در سالمندی
              </p>
            </section>

            <section className={styles.section}>
              <p className={styles.text}>
                سایبان یک پلتفرم جامع خدمات سالمندی است؛ جایی برای اینکه
                سالمندان و خانواده‌ها بتوانند خدمات موردنیازشان را ساده‌تر
                پیدا کنند، گزینه‌های مختلف را بررسی و مقایسه کنند و
                آگاهانه‌تر انتخاب کنند.
              </p>
              <p className={styles.text}>
                در سایبان می‌توانید مراکز سالمندان را بشناسید و مقایسه کنید،
                برای مراقب و پرستار در منزل درخواست ثبت کنید و به رویدادها و
                برنامه‌های مناسب سالمندان دسترسی داشته باشید.
              </p>
              <p className={styles.text}>
                ما باور داریم سالمندی فقط به مراقبت در روزهای سخت خلاصه
                نمی‌شود؛ کیفیت زندگی، استقلال، ارتباط اجتماعی، آرامش و دسترسی
                به خدمات مناسب هم بخشی از یک سالمندی خوب است.
              </p>
              <p className={styles.text}>
                برای همین تلاش می‌کنیم ارتباط میان سالمندان، خانواده‌ها و
                ارائه‌دهندگان خدمات را ساده‌تر، شفاف‌تر و قابل‌اطمینان‌تر
                کنیم.
              </p>
              <p className={styles.motto}>
                سایبان؛ انتخاب آگاهانه‌تر برای زندگی باکیفیت‌تر.
              </p>
            </section>
          </div>
        ),
      }}
    />
  );
}

const About = React.forwardRef(About_);
export default About;
