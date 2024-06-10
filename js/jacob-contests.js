function process_character(char) {
    console.log(char);
}

function find_character(name) {
    const url = 'https://i.need.my.own.api.to.get.this/'+name;
    fetch(url).then(res => res.json().then(json => process_character(json))).catch(err => console.log(err));
}

function char_keyup(event) {
    if (event.keyCode === 13) {
        find_character(document.getElementById('edCharacterName').value);
    }
}



function init() {
}