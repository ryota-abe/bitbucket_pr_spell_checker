function onSave() {
    const dic = document.getElementById('user-dictionary');
    const userDictionary = dic.value.split('\n').map(s => s.trim().toLowerCase());
    chrome.storage.sync.set({userDictionary});
}

function onRestore() {
    chrome.storage.sync.get(['userDictionary'], items =>
        document.getElementById('user-dictionary').value = items.userDictionary.join('\n')
    );
}

document.addEventListener('DOMContentLoaded', onRestore);
document.getElementById('save').addEventListener('click', onSave);
