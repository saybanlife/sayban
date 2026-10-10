import * as React from "react";
import {
  PlasmicMainPageUser,
  DefaultMainPageUserProps
} from "./plasmic/sayban/PlasmicMainPageUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import styles from "./AdminTablesTheme.module.css";
import TextInput from "./TextInput";

export interface MainPageUserProps extends DefaultMainPageUserProps {}

function MainPageUser_(props: MainPageUserProps, ref: HTMLElementRefOf<"div">) {
  const [search, setSearch] = React.useState("");
  const [draftSearch, setDraftSearch] = React.useState("");

  const applySearch = React.useCallback(() => {
    const next = draftSearch.trim();
    setSearch(prev => (prev === next ? prev : next));
  }, [draftSearch]);

  return (
    <div className={`${styles.panelTablePage} ${styles.serverPaged}`}>
      <div className={styles.serverSearchBar}>
        <TextInput
          type="soft"
          value={draftSearch}
          placeholder="جستجوی نام، موبایل یا کد ملی"
          onChange={value => setDraftSearch(String(value ?? ""))}
          ariaInputOnBlur={applySearch}
        />
      </div>
      <PlasmicMainPageUser
        {...props}
        overrides={{
          users: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                params={{
                  ...(renderProps.params || {}),
                  search: search || undefined
                }}
              />
            )
          },
          root: {
            render: (renderProps: any, DefaultRoot: any) => (
              <DefaultRoot {...renderProps} ref={ref} />
            )
          }
        }}
      />
    </div>
  );
}

const MainPageUser = React.forwardRef(MainPageUser_);
export default MainPageUser;