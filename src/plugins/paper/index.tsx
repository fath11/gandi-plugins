import * as React from "react";
import styles from "./styles.less";

function waitForElementToExist(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

const Paper: React.FC<PluginContext> = ({ redux }) => {
  const scratchGui: any = redux.state.scratchGui
  console.log(scratchGui)

  waitForElementToExist("[class*='paint-editor_mode-selector']").then(element => {
    const paintEditor = element
    console.log(paintEditor)
    if (scratchGui.editorTab.activeTabIndex === 1 && !scratchGui.mode.isPlayerOnly) {
      console.log("uwu")
    }
  });

  return <React.Fragment>{"This is a new plugin."}</React.Fragment>;
};

Paper.displayName = "Paper";

export default Paper;
