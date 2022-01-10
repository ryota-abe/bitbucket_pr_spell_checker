import {browser} from 'webextension-polyfill-ts';
import {additionalWords} from './additional_words';

const Typo = require('typo-js') as any;
const affData = require('typo-js/dictionaries/en_US/en_US.aff');
const dicData = require('typo-js/dictionaries/en_US/en_US.dic');

let userDictionary: string[] = [];
let options: {
  checkOnAddedRows: boolean
  checkOnDeletedRows: boolean
  checkOnOtherRows: boolean
};
let dictionary: any;
interface CheckResult {typos: string[], rowsCount: number}
const checkResultMap = new Map<HTMLElement, CheckResult>();

function spellCheck(article: HTMLElement) {
  const typoSet = new Set<string>();
  const typoRowMap: Record<string, HTMLElement[]> = {};
  const splitRegex = /[0-9 \t!"#$%&'()\[\]{}\-\=^~\\|@`;+:*,.<>/_?]/;
  const identifierRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  const rows = getRows(article);
  if (checkResultMap.get(article)?.rowsCount === rows.length) {
    return;
  }

  rows.forEach((row) => {
    row.innerHTML
        .split(splitRegex)
        .filter((identifier) => identifierRegex.test(identifier))
        .filter(isMisspelled)
        .forEach((typo) => {
          typoSet.add(typo);
          typoRowMap[typo] = typoRowMap[typo] ? [...typoRowMap[typo], row] : [row];
        });
  });

  const typos = Array.from(typoSet);
  checkResultMap.set(article, {typos, rowsCount: rows.length});
  updateDom(article, typos, typoRowMap);

  if (typos.length > 0) {
    console.log('Detected Misspellings: ', typos);
    setBadge();
  }
}

function updateDom(article: HTMLElement, typos: string[], typoRowMap: Record<string, HTMLElement[]>) {
  const outputDiv = getOutputDiv(article);
  setTimeout(() => {
    outputDiv.innerHTML = '';
    const buttons = typos.map((typo) => {
      const button = createMisspelledWordButton(typo);
      button.onclick = (e) => {
        const isSelected = button.classList.contains('spell-checker-error');
        if (!isSelected) {
          setErrorStyle(...typoRowMap[typo]);
          setErrorStyle(button);
        } else {
          clearErrorStyle(...typoRowMap[typo]);
          clearErrorStyle(button);
        }
      };
      return button;
    });
    buttons.forEach((b) => outputDiv.append(b));
  });

  // hide div when there's nothing to display
  (outputDiv.parentNode as HTMLElement).style.display = typos.length ? 'flex' : 'none';

  const gutter = article.querySelector('.gutter-width-apply-width');
  const left = outputDiv.parentNode?.querySelector<HTMLElement>('.spell-checker-left');
  if (gutter && left) {
    left.style.width = `${gutter.clientWidth}px`;
  }
}

function getRows(article: HTMLElement) {
  const selector = [
    ...(options.checkOnAddedRows ? ['.type-add .code-diff'] : []),
    ...(options.checkOnDeletedRows ? ['.type-del .code-diff'] : []),
    ...(options.checkOnOtherRows ? ['.type-normal .code-diff'] : []),
  ].join(', ');
  return selector ? article.querySelectorAll<HTMLElement>(selector) : [];
}

function createMisspelledWordButton(word: string) {
  const button = document.createElement('button');
  button.innerText = word;
  button.className = 'spell-checker-button';
  return button;
}

function setErrorStyle(...elements: HTMLElement[]) {
  elements.forEach((element) => element.classList.add('spell-checker-error'));
}

function clearErrorStyle(...elements: HTMLElement[]) {
  elements.forEach((element) => element.classList.remove('spell-checker-error'));
}

function isMisspelled(identifier: string) {
  return camelToWords(identifier).some((word) => {
    if (word.length < 4) {
      return false;
    }
    if (userDictionary.includes(word.toLowerCase())) {
      return false;
    }
    if (!dictionary.check(word) && !dictionary.check(word.toUpperCase())) {
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

  const fileHeader = article.querySelector('div[data-testid="file-header"]') as HTMLElement;
  const fileBody = fileHeader?.nextElementSibling;
  if (fileHeader && fileBody) {
    fileHeader.parentElement?.insertBefore(outer, fileBody);
    outer.style.top = `${54 + fileHeader.offsetHeight}px`;
    outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('spell-checker-hidden');
    const observer = new MutationObserver((e) => {
      outer.style.top = `${54 + fileHeader.offsetHeight}px`;
      outer.classList[fileBody.clientHeight === 0 ? 'add' : 'remove']('spell-checker-hidden');
    });
    observer.observe(fileBody, {attributes: true});
  }
  return right;
}

function setBadge() {
  const typosInThisPage = Array.from(checkResultMap).flatMap(([__, {typos}]) => typos);
  chrome.runtime.sendMessage({badge: `${typosInThisPage.length || ''}`});
}

function clearBadge() {
  chrome.runtime.sendMessage({badge: ''});
}

const main = async () => {
  const items = await browser.storage.sync.get(['userDictionary', 'options']);
  options = (items.options ?? {checkOnAddedRows: true, checkOnDeletedRows: false, checkOnOtherRows: true});
  userDictionary = [...additionalWords, ...(items.userDictionary ?? [])];
  Array.from(document.querySelectorAll('article')).forEach(spellCheck);
};

window.addEventListener('load', async function() {
  dictionary = new Typo('en_US', affData, dicData);

  const observer = new MutationObserver(main);
  const body = document.getElementsByTagName('body')[0];
  observer.observe(body, {subtree: true, childList: true});

  const style = document.createElement('style');
  style.innerText = require('./style.css');
  document.querySelector('head')?.appendChild(style);
});

window.addEventListener('focus', setBadge);

window.addEventListener('blur', clearBadge);

browser.storage.onChanged.addListener(() => {
  checkResultMap.clear();
  Array.from(document.getElementsByClassName('spell-checker-error')).forEach((e) => clearErrorStyle(e as HTMLElement));
  main();
});
