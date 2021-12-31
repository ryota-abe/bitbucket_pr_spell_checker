function onSave() {
  const dic = document.getElementById('user-dictionary');
  const userDictionary = dic.value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
  const checkOnAddedRows = document.getElementById('check-on-added').checked
  const checkOnDeletedRows = document.getElementById('check-on-deleted').checked
  const checkOnOtherRows = document.getElementById('check-on-other').checked
  const button = document.getElementById('save');
  const items = { userDictionary, options: { checkOnAddedRows, checkOnDeletedRows, checkOnOtherRows } }
  chrome.storage.sync.set(items, () => {
    button.classList.add('disabled')
    button.innerText = 'Saved';
    setTimeout(() => {
      button.innerText = 'Save'
      button.classList.remove('disabled')
    }, 1000);
  });
}

function onRestore() {
  chrome.storage.sync.get(['userDictionary', 'options'], items => {
    const userDictionary = (items.userDictionary ?? []).join('\n')
    const options = (items.options ?? { checkOnAddedRows: true, checkOnDeletedRows: false, checkOnOtherRows: true })
    document.getElementById('user-dictionary').value = userDictionary
    document.getElementById('check-on-added').checked = options.checkOnAddedRows
    document.getElementById('check-on-deleted').checked = options.checkOnDeletedRows
    document.getElementById('check-on-other').checked = options.checkOnOtherRows
  });
}

document.addEventListener('DOMContentLoaded', onRestore);
document.getElementById('save').addEventListener('click', onSave);
