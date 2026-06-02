import * as itBase from './languages/it/base.js'
import * as enBase from './languages/en/base.js'
import * as enAbsurd from './languages/en/absurd.js'
import * as itAbsurd from './languages/it/absurd.js'
import * as itEverything from './languages/it/everything.js'


const allCards = {
  en: {
    base: enBase,
    absurd: enAbsurd
  },
  it: {
    base: itBase,
    absurd: itAbsurd,
    everything: itEverything
  },
};

export const availableOptions = {
  languages: Object.keys(allCards),
  expansionsByLang: Object.keys(allCards).reduce((acc, lang) => {
    acc[lang] = Object.keys(allCards[lang]);
    return acc;
  }, {}),
};

export function getDeck(lang, expansions = ['base']) {
    let black = [];
    let white = [];

    expansions.forEach(pack => {
        const data = allCards[lang]?.[pack];
        if(data) {
            black = [...black, ...data.blackCards];
            white = [...white, ...data.whiteCards];
        }
    });

    return { black, white };
}