import * as React from "react";
import ReactDOM from "react-dom";

import SearchButtonLessModule from "./SearchButton.less";
console.log(SearchButtonLessModule)

import StatisticsIcon from "assets/icon--statistics.svg";
import SearchIcon from "assets/icon--code-filter.svg";

function search(query, selector, type) {
  if (!selector) return;

  query = query.toLowerCase();
  const containsQuery = (str) => str.toLowerCase().includes(query);

  for (const i of Array.from(selector)) {
    let label;
    switch(type) {
      case("sprite"):
        label = (i as HTMLElement).children[0].children[2]
        break;
      case("costume"):
        label = (i as HTMLElement).children[0].children[2].children[0]
        break;
    }
    const visible = () => {
      if (!query) return true;
      if (!label) return false;
      return containsQuery(label.innerText);
    }
    (i as HTMLElement).style.display = visible() ? "" : "none";
  }
};

function spriteSearchHandler(isEnabled: Boolean) {
  if (!isEnabled) {
    const customElements = document.querySelectorAll(".addons_MoreSearchBar_searchButton_LP5sg, #addons_MoreSearchBar_spriteSearchInput");
    customElements.forEach((element) => {
      element.remove();
    });
    return;
  }

  const header = document.getElementsByClassName("gandi_collapsible-box_header_dc9Es")[1]

  const SearchButton = document.createElement('span');
  SearchButton.className = "addons_MoreSearchBar_searchButton_LP5sg addons_tip-icon_oy8QS"

  const searchBar = document.createElement("input")
  searchBar.id = "addons_MoreSearchBar_spriteSearchInput"
  searchBar.className = "addons_MoreSearchBar_searchbar_R83gw"
  searchBar.placeholder = "Filter sprites"
  searchBar.type = "search"

  const parent = document.getElementsByClassName("gandi_target-pane_target-list_10PNw")[0]

  const spritesSelector = document.getElementsByClassName("gandi_sprite-selector_sprite-wrapper_1C5Mq")

  searchBar.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    search(target.value, spritesSelector, "sprite");
  });

  SearchButton.addEventListener("click", () => {
    const existingSearchBar = document.getElementById("addons_MoreSearchBar_spriteSearchInput");

    if (existingSearchBar) {
      existingSearchBar.remove();
    } else {
      parent.prepend(searchBar)
    }
  })

  ReactDOM.render(<SearchIcon />, SearchButton);

  header.appendChild(SearchButton);
}

function costumeSearchHandler(isEnabled: Boolean) {
  let searchBarAppended = false;

  const observer = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        if (!isEnabled) {
          const customElements = document.querySelectorAll("#addons_MoreSearchBar_costumeSearchInput");
          customElements.forEach((element) => {
            for (const i of Array.from(document.getElementsByClassName("gandi_selector_list-area_1Xbj_")[0].children)) {
              (i as HTMLElement).style.display = "";
            }
            element.remove();
            observer.disconnect()
            searchBarAppended = false
          });
          return;
        }
        
        const header = document.getElementsByClassName("gandi_selector_wrapper_8_BHs")[0];
        
        if (!header) {
          searchBarAppended = false;
        }
        
        if (header && !searchBarAppended) {
          const searchBar = document.createElement("input");
          searchBar.id = "addons_MoreSearchBar_costumeSearchInput"
          searchBar.className = "addons_MoreSearchBar_searchbar_R83gw";
          searchBar.placeholder = "Filter costumes";
          searchBar.type = "search";

          searchBar.addEventListener("input", (e) => {
            const target = e.target as HTMLInputElement;
            search(target.value, document.getElementsByClassName("gandi_selector_list-area_1Xbj_")[0].children, "costume");
          });

          header.prepend(searchBar);
          searchBarAppended = true;
        }
      }
    }
  });

  observer.observe(document, { childList: true, subtree: true });
}

const MoreSearchBar: React.FC<PluginContext> = ({ redux, msg, registerSettings}) => {
  React.useEffect(() => {
    const register = registerSettings(
      msg('plugins.MoreSearchBar.title'),
      'More Search Bars',
      [
        {
          key: 'sprite',
          label: msg('plugins.MoreSearchBar.sprite'),
          items: [
            {
              key: 'spriteSearch',
              type: 'switch',
              label: msg('plugins.MoreSearchBar.label.enable'),
              value: false,
              onChange: (value) => {
                spriteSearchHandler(value as Boolean)
              },
            },
          ],
        },
        {
          key: 'costume',
          label: msg('plugins.MoreSearchBar.costume'),
          items: [
            {
              key: 'costumeSearch',
              type: 'switch',
              label: msg('plugins.MoreSearchBar.label.enable'),
              value: false,
              onChange: (value) => {
                costumeSearchHandler(value as Boolean)
              },
            },
          ],
        },
      ],
      <StatisticsIcon />,
    );
    return () => {
      register.dispose();
    };
  }, [registerSettings, msg]);

  // Use the layout style in your render method
  return null;
};

MoreSearchBar.displayName = "MoreSearchBar";

export default MoreSearchBar;
