import * as React from "react";
import { useRouter } from "next/router";
import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";
import { PlasmicImg as PlasmicImg__ } from "@plasmicapp/react-web";
import { DefaultRulesProps } from "./plasmic/sayban/PlasmicRules";
import { _useStyleTokens } from "./plasmic/sayban/PlasmicStyleTokensProvider";
import sty from "./plasmic/sayban/PlasmicRules.module.css";
import styles from "./Rules.module.css";
import Header from "./Header";
import { goBackOrReplace } from "./navigation/backNavigation";
import { TextCollapse } from "@/components/TextCollapse";
import {
  RULES_CONTACT,
  RULES_INTRO,
  RULES_META,
  RULES_SECTIONS,
  RULES_TITLE
} from "./rules/rulesContent";

export interface RulesProps extends DefaultRulesProps {}

function Rules_(props: RulesProps, ref: HTMLElementRefOf<"div">) {
  const styleTokensClassNames = _useStyleTokens();
  const router = useRouter();

  const handleBack = () => {
    // `history.length > 1` is true after any navigation in the tab, even when
    // every entry belongs to another site, so it never actually guarded.
    const page =
      typeof router.query.page === "string" && router.query.page
        ? router.query.page
        : "user";
    goBackOrReplace(router, `/${page}/user`);
  };

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      dir="rtl"
      className={classNames(
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        sty.root,
        styles.root,
        props.className
      )}
      style={{ direction: "rtl", textAlign: "right" }}
    >
      <Header
        className={classNames("__wab_instance", sty.header)}
        search={false}
        runCode
        back={handleBack}
        slot="قوانین و مقررات"
      />

      <div className={classNames("all", sty.freeBox___3RCiB)}>
        <PlasmicImg__
          alt=""
          className={classNames(sty.img)}
          displayHeight="auto"
          displayMaxHeight="none"
          displayMaxWidth="100%"
          displayMinHeight="0"
          displayMinWidth="0"
          displayWidth="80%"
          loading="lazy"
          src={{
            src: "/plasmic/sayban/images/geminiGeneratedImageYumi5Oyumi5OyumiRemovebgPreviewPng.png",
            fullWidth: 523,
            fullHeight: 477,
            aspectRatio: undefined
          }}
        />

        <div className={classNames("all", sty.freeBox__uloIu)}>
          <TextCollapse
            className={classNames("__wab_instance", sty.textCollapse)}
            buttonClassName={classNames({ [sty["pcls_pDmimLdnvhbU"]]: true })}
            enableToggle
            maxLines={2}
            text={RULES_TITLE}
          />

          <div className={classNames("all", sty.freeBox__tkF4, styles.body)}>
            <p className={styles.meta}>{RULES_META}</p>
            <p className={styles.intro}>{RULES_INTRO}</p>

            {RULES_SECTIONS.map(section => (
              <section key={section.title} className={styles.section}>
                <h2 className={classNames("all", "h2", "h2__qARqp", styles.heading)}>
                  {section.title}
                </h2>
                <p className={styles.paragraph}>{section.body}</p>
              </section>
            ))}

            <section className={styles.section}>
              <h2 className={classNames("all", "h2", "h2__qARqp", styles.heading)}>
                {RULES_CONTACT.title}
              </h2>
              <ul className={styles.contactList}>
                <li>
                  <a href="https://sayban.app" target="_blank" rel="noreferrer">
                    {RULES_CONTACT.lines[0]}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${RULES_CONTACT.lines[1]}`}>
                    {RULES_CONTACT.lines[1]}
                  </a>
                </li>
                <li>
                  <a href={`tel:${RULES_CONTACT.lines[2]}`}>
                    {RULES_CONTACT.lines[2]}
                  </a>
                </li>
                <li>{RULES_CONTACT.lines[3]}</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const Rules = React.forwardRef(Rules_);
export default Rules;
