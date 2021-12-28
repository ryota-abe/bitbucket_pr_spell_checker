function onSave() {
    const dic = document.getElementById('user-dictionary');
    const userDictionary = dic.value.split('\n').map(s => s.trim().toLowerCase());
    chrome.storage.sync.set({userDictionary}, () => {
        const message = document.getElementById('message');
        message.innerText = 'saved.';
        setTimeout(() => { message.innerText = '' }, 750);
    });
}

function onRestore() {
    chrome.storage.sync.get(['userDictionary'], items =>
        document.getElementById('user-dictionary').value = items.userDictionary.join('\n')
    );
}

document.addEventListener('DOMContentLoaded', onRestore);
document.getElementById('save').addEventListener('click', onSave);
