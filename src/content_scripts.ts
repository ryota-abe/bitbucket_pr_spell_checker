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
  button.style.boxSizing = 'border-box';
  button.style.border = '1px solid rgb(223, 225, 230)';
  button.style.color = '#172b4d';
  button.style.backgroundColor = '#F4F5F7';
  button.style.fontSize = '12px';
  button.style.margin = '4px';
  button.style.height = '32px';
  button.style.cursor = 'pointer';
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
  const div = article.getElementsByClassName('spell-check-output')[0] as HTMLElement;
  if (div) {
    return div;
  }
  const outer = document.createElement('div');
  outer.style.display = 'flex';
  outer.style.backgroundColor = 'rgb(244, 245, 247)';
  outer.style.borderRight = '1px solid rgb(223, 225, 230)';
  outer.style.borderBottom = '1px solid rgb(223, 225, 230)';
  outer.style.borderLeft = '1px solid rgb(223, 225, 230)';
  outer.style.fontFamily = 'SFMono-Medium, "SF Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", Menlo, Consolas, Courier, monospace';
  outer.style.zIndex = '180';
  outer.style.overflow = 'hidden';
  outer.style.position = 'sticky'
  const left = document.createElement('div');
  left.style.display = 'inline-block';
  left.style.color = 'rgb(94, 108, 132)';
  left.style.borderRight = '1px solid rgb(223, 225, 230)';
  left.style.padding = '3px 8px';
  left.style.lineHeight = '32px';
  left.style.width = '39px';
  left.innerText = 'typo?';
  const right = document.createElement('div') as HTMLElement;
  right.className = 'spell-check-output';
  right.style.backgroundColor = 'white';
  right.style.display = 'inline-block';
  right.style.flexGrow = '1';
  right.style.padding = '0 8px';

  outer.append(left);
  outer.append(right);
  const fileHeader = article.querySelector('div[data-testid="file-header"]') as HTMLElement
  const fileBody = fileHeader?.nextElementSibling
  if (fileHeader && fileBody) {
    fileHeader.parentElement?.insertBefore(outer, fileBody)
    outer.style.top = `${54 + fileHeader.offsetHeight}px`
    outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('output-hidden');
    const observer = new MutationObserver(e => {
      outer.style.top = `${54 + fileHeader.offsetHeight}px`
      outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('output-hidden');
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
  style.innerText = `.output-hidden { display: none !important; }`;
  document.querySelector('head')?.appendChild(style);
});

const main = async () => {
  const items = await browser.storage.sync.get(['userDictionary', 'options']);
  options = (items.options ?? { checkOnAddedRows: true, checkOnDeletedRows: false, checkOnOtherRows: true })
  userDictionary = [...additionalWords, ...(items.userDictionary ?? [])];
  Array.from(document.querySelectorAll('article')).forEach(checkSpell);
};
