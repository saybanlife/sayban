import * as React from "react";
import { useRouter } from "next/router";
import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";
import { DefaultFaQsProps } from "./plasmic/sayban/PlasmicFaQs";
import { _useStyleTokens } from "./plasmic/sayban/PlasmicStyleTokensProvider";
import sty from "./plasmic/sayban/PlasmicFaQs.module.css";
import styles from "./FaQs.module.css";
import Header from "./Header";
import { goBackOrReplace } from "./navigation/backNavigation";
import { TextCollapse } from "@/components/TextCollapse";
import Item2 from "./Item2";
import Line from "./Line";
import Icon6Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon6";
import { FAQ_INTRO, FAQ_ITEMS } from "./faq/faqContent";

export interface FaQsProps extends DefaultFaQsProps {}

function FaQs_(props: FaQsProps, ref: HTMLElementRefOf<"div">) {
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
        slot="سوالات متداول"
      />

      <div className={classNames("all", sty.freeBox__nbB1N)}>
        <div className={classNames("all", sty.freeBox___0EgFx)}>
          <TextCollapse
            className={classNames("__wab_instance", sty.textCollapse)}
            buttonClassName={classNames({ [sty["pcls_D1ygS7mZePTB"]]: true })}
            enableToggle
            maxLines={6}
            text={FAQ_INTRO}
          />

          {FAQ_ITEMS.map(item => (
            <div key={item.id} className={classNames("all", sty.freeBox__r3Var)}>
              <Item2
                className={classNames("__wab_instance", sty.item2)}
                q={item.answer}
                slot={
                  <Icon6Icon
                    className={classNames("all", sty.svg)}
                    role="img"
                  />
                }
              >
                {item.question}
              </Item2>
              <Line
                className={classNames("__wab_instance", sty.line)}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FaQs = React.forwardRef(FaQs_);
export default FaQs;
