import { browser } from 'webextension-polyfill-ts'
import { additionalWords } from './additional_words';

const Typo = require('typo-js') as any;
const affData = require('typo-js/dictionaries/en_US/en_US.aff')
const dicData = require('typo-js/dictionaries/en_US/en_US.dic')

let userDictionary: string[] = [];
let options: {
  checkOnAddedRows: boolean
  checkOnDeletedRows: boolean
  checkOnOtherRows: boolean
}
let dictionary: any
const misspellingWords = new Set<string>()

async function checkSpell(article: HTMLElement) {
  const selector = [
    ...(options.checkOnAddedRows ? ['.type-add .code-diff'] : []),
    ...(options.checkOnDeletedRows ? ['.type-del .code-diff'] : []),
    ...(options.checkOnOtherRows ? ['.type-normal .code-diff'] : []),
  ].join(', ');
  const rows = selector && article.querySelectorAll<HTMLElement>(selector);
  const identifierSet = new Set<string>();
  const elementMap: Record<string, HTMLElement[]> = {};
  const splitRegex = /[0-9 \t!"#$%&'()\[\]{}\-\=^~\\|@`;+:*,.<>/_?]/;
  const identifierRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  rows && Array.from(rows).forEach(row => {
    row.innerText
    .split(splitRegex)
    .filter(identifier => identifierRegex.test(identifier))
    .filter(isMisspelled)
    .forEach(identifier => {
      identifierSet.add(identifier);
      elementMap[identifier] = elementMap[identifier] ? [...elementMap[identifier], row] : [row];
    });
  });

  const identifiers = Array.from(identifierSet);

  const outputDiv = getOutputDiv(article);
  if (outputDiv.getElementsByTagName('button').length !== identifiers.length) {
    setTimeout(() => {
      outputDiv.innerHTML = '';
      const buttons = identifiers.map(word => {
        const button = createMisspelledWordButton(word);
        button.onclick = e => {
          const isSelected = button.style.textDecorationStyle === 'wavy';
          Object.keys(elementMap).forEach(key => {
            elementMap[key].forEach(clearErrorStyle);
          });
          buttons.forEach(clearErrorStyle);
          if (!isSelected) {
            elementMap[word].forEach(setErrorStyle);
            setErrorStyle(button);
          }
        }
        return button;
      });
      buttons.forEach(b => outputDiv.append(b));
    });

    if (misspellingWords.size) {
      console.log('Detected Misspellings: ', Array.from(misspellingWords));
    }
  }
  // hide div when there's nothing to display
  (outputDiv.parentNode as HTMLElement).style.display = identifiers.length ? 'flex' : 'none';
}

function createMisspelledWordButton(word: string) {
  const button = document.createElement('button');
  button.innerText = word;
  button.className = 'spell-checker-button';
  return button;
}

function setErrorStyle(element: HTMLElement) {
  element.style.textDecoration = '1px red wavy underline';
  element.style.textDecorationSkipInk = 'none';
}

function clearErrorStyle(element: HTMLElement) {
  element.style.textDecoration = 'none';
}

function isMisspelled(identifier: string) {
  return camelToWords(identifier).some(word => {
    if (word.length < 4) {
      return false;
    }
    if (userDictionary.includes(word.toLowerCase())) {
      return false;
    }
    if (!dictionary.check(word) && !dictionary.check(word.toUpperCase())) {
      misspellingWords.add(word);
      return true;
    }
    return false;
  });
}

function camelToWords(camel: string) {
  return camel.replace(/([a-z])([A-Z])/g, (__, c1, c2) => c1 + ' ' + c2)
  .replace(/([A-Z])([A-Z])([a-z])/g, (__, c1, c2, c3) => c1 + ' ' + c2 + c3)
  .split(' ');
}

function getOutputDiv(article: HTMLElement): HTMLElement {
  const div = article.getElementsByClassName('spell-checker-right')[0] as HTMLElement;
  if (div) {
    return div;
  }

  const outer = document.createElement('div');
  const left = document.createElement('div');
  const right = document.createElement('div');
  outer.className = 'spell-checker-outer';
  left.className = 'spell-checker-left';
  right.className = 'spell-checker-right';
  left.innerText = 'typo?';
  outer.append(left);
  outer.append(right);

  const fileHeader = article.querySelector('div[data-testid="file-header"]') as HTMLElement
  const fileBody = fileHeader?.nextElementSibling
  if (fileHeader && fileBody) {
    fileHeader.parentElement?.insertBefore(outer, fileBody)
    outer.style.top = `${54 + fileHeader.offsetHeight}px`
    outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('spell-checker-hidden');
    const observer = new MutationObserver(e => {
      outer.style.top = `${54 + fileHeader.offsetHeight}px`
      outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('spell-checker-hidden');
    });
    observer.observe(fileBody, {attributes: true});
  }
  return right;
}

window.addEventListener('load', async function() {
  dictionary = new Typo('en_US', affData, dicData);

  const observer = new MutationObserver(main);
  const body = document.getElementsByTagName('body')[0];
  observer.observe(body, {subtree: true, childList: true});

  browser.storage.onChanged.addListener(main);

  const style = document.createElement('style');
  style.innerText = require('./style.css');
  document.querySelector('head')?.appendChild(style);
});

const main = async () => {
  const items = await browser.storage.sync.get(['userDictionary', 'options']);
  options = (items.options ?? { checkOnAddedRows: true, checkOnDeletedRows: false, checkOnOtherRows: true })
  userDictionary = [...additionalWords, ...(items.userDictionary ?? [])];
  Array.from(document.querySelectorAll('article')).forEach(checkSpell);
};
