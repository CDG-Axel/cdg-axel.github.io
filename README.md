Initial target of project - helper utility for Idle Heroes mobele game.

You can contribute to this project by adding or fixing translations (js/ih-utils.js, js/gen_pages.mjs).
It would be very cool if you could explain how guild points are calculated in Star Expedition. At the moment, the calculation of these points is quite approximate, especially for bosses 200-160.

The main structure of this project is generated with the templates (/templates) using the /js/gen_pages.mjs script. The 'tabData' and 'langMap' variables contain classes for building the main menu for all supported languages. It is possible to add partial localization support, as if no translated text is found, English data is used instead.

The index page (/index.htm) now redirects to the Soul Expedition page in the user's language or in English if the language isn't supported. The page for 404 errors (/404.html) redirects to the home page (home.html) with the same language rules as for the index.

/ihutils.html (with the /js/sa-sim.js) is deprecated, serving as an all-in-one page for all languages and menus. The project has now transitioned to a template-generated structure for better Search Engine Optimization (SEO).

These pages are generated automatically; do not change them directly:
  /home.html
  /soul-awakening.html
  /star-expedition.html

Localized versions of the generated pages are placed in the /%language%/ directory. ISO 639-1 language naming is used; for example:
  /ru/home.html
  /ru/soul-awakening.html
  /ru/star-expedition.html

