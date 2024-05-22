import * as React from "react";
import KukemcBeautifyIcon from "assets/icon--kukemcbeautify.svg";
import styles from "./styles.less";

const KukemcBeautify: React.FC<PluginContext> = ({ msg, registerSettings }) => {
  React.useEffect(() => {
    const register = registerSettings(
      msg("plugins.kukemcBeautify.title"),
      "plugin-kukemc-beautify",
      [
        {
          key: "kukemcBeautify",
          label: msg("plugins.kukemcBeautify.frostedGlass"),
          description: msg("plugins.kukemcBeautify.description"),
          items: [
            {
              key: "frosted",
              label: msg("plugins.kukemcBeautify.frostedGlass"),
              type: "switch",
              value: false,
              onChange: (value: boolean) => {
                if (value) {
                  document.body.classList.add(styles.frostedGlass);
                } else {
                  document.body.classList.remove(styles.frostedGlass);
                }
              },
            },
            {
              key: "transparent",
              label: msg("plugins.kukemcBeautify.frostedGlass.transparency"),
              type: "input",
              inputProps: {
                type: "number",
              },
              value: 0.29,
              onChange: (value: string) => {
                document.body.style.setProperty("--frostedGlass-alpha", value);
              },
            },
            {
              key: "ambiguity",
              label: msg("plugins.kukemcBeautify.frostedGlass.ambiguity"),
              type: "input",
              inputProps: {
                type: "number",
              },
              value: 10,
              onChange: (value: string) => {
                document.body.style.setProperty("--frostedGlass-radius", (Number(value) || 0) + "px");
              },
            },
          ],
        },
        {
          key: "backgroundImages",
          label: msg("plugins.kukemcBeautify.backgroundImages"),
          description: msg("plugins.kukemcBeautify.backgroundImages.description"),
          items: [
            {
              key: "background",
              label: msg("plugins.kukemcBeautify.background"),
              type: "input",
              value: "",
              onChange: (value: string) => {
                if (value) {
                  document.body.classList.add(styles.customBackground);
                } else {
                  document.body.classList.remove(styles.customBackground);
                }
                document.body.style.setProperty("--background-image", `url(${value})`);
              },
            },
            {
              key: "repeat",
              label: msg("plugins.kukemcBeautify.backgroundImages.repeat"),
              type: "select",
              value: "repeat",
              options: [
                { label: msg('plugins.kukemcBeautify.backgroundImages.repeat'), value: "repeat" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.no-repeat'), value: "no-repeat" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.repeat-x'), value: "repeat-x" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.repeat-y'), value: "repeat-y" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.repeat-round'), value: "round" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.repeat-space'), value: "space" },
              ],
              onChange: (value: string) => {
                document.body.style.setProperty("--background-repeat", value);
              },
            },
            {
              key: "size",
              label: msg("plugins.kukemcBeautify.backgroundImages.size"),
              type: "select",
              value: "auto",
              options: [
                { label: msg('plugins.kukemcBeautify.backgroundImages.size-auto'), value: "auto" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.size-cover'), value: "cover" },
                { label: msg('plugins.kukemcBeautify.backgroundImages.size-contain'), value: "contain" },
              ],
              onChange: (value: string) => {
                document.body.style.setProperty("--background-size", value);
              },
            },
          ]
        },
      ],
      <KukemcBeautifyIcon />,
    );
    return () => {
      document.body.classList.remove(styles.frostedGlass);
      document.body.classList.remove(styles.customBackground);
      register.dispose();
    };
  }, [registerSettings, msg]);

  return null;
};

KukemcBeautify.displayName = "KukemcBeautify";

export default KukemcBeautify;
