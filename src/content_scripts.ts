import { browser } from 'webextension-polyfill-ts'
import { additionalWords } from './additional_words.ts'

const Typo = require('typo-js') as any;

let userDictionary: string[] = [];
let dictionary: any

function checkSpell(article: HTMLElement) {
  const rows = article.querySelectorAll<HTMLElement>('.type-normal .code-diff, .type-add .code-diff');
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
  }
  (outputDiv.parentNode as HTMLElement).style.display = identifiers.length ? 'flex' : 'none';
}

function createMisspelledWordButton(word: string) {
  const button = document.createElement('button');
  button.innerText = word;
  button.style.border = '1px solid rgb(223, 225, 230)';
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
      console.log('Misspelled: ' + word);
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
  outer.style.border = '1px solid rgb(223, 225, 230)';
  outer.style.borderRadius = '3px';
  outer.style.fontFamily = 'SFMono-Medium, "SF Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", Menlo, Consolas, Courier, monospace';
  const left = document.createElement('div');
  left.style.display = 'inline-block';
  left.style.color = 'rgb(94, 108, 132)';
  left.style.backgroundColor = 'rgb(244, 245, 247)';
  left.style.borderRight = '1px solid rgb(223, 225, 230)';
  left.style.padding = '8px';
  left.style.lineHeight = '32px';
  left.style.width = '40px';
  left.innerText = 'typo?';
  setErrorStyle(left);
  const right = document.createElement('div') as HTMLElement;
  right.className = 'spell-check-output';
  right.style.display = 'inline-block';
  right.style.flexShrink = '1';
  right.style.padding = '8px';

  outer.append(left);
  outer.append(right);
  article.prepend(outer);
  return right;
}

window.onload = async function() {
  dictionary = new Typo("en_US");
  const observer = new MutationObserver(main);
  const body = document.getElementsByTagName('body')[0];
  observer.observe(body, {subtree: true, childList: true});
}

const main = async () => {
  const items = await browser.storage.sync.get(['userDictionary']);
  userDictionary = [...additionalWords, ...(items.userDictionary ?? [])];
  Array.from(document.querySelectorAll('article')).forEach(checkSpell);
};

