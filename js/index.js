let count = [1, 1, 1, 1, 1, 1, 1];

var url = window.location.href;
let link;
if (url.indexOf('/en') > -1){
    link = '../index.html';
}
else{
    link = './en/index.html';
}
const en = document.getElementById('en');
en.setAttribute('href', link);


setInterval(()=>{
    nextSlide(1);
},5000);

// Function to go to next Image
function nextSlide(slider_index){
    const images = document.getElementById(`slider-${slider_index}`).children[0].children;
    const totalImages = images.length;
    if(count[slider_index] == totalImages){
        count[slider_index] = 0;
    }
    for(let i=0; i<totalImages; i++){
        images[i].style.transform = `translateX(-${100*count[slider_index]}%)`;
        images[i].style.transition = "transform 1s ease-in-out";
    }
    count[slider_index]++;
}

// Function to go to previous Image
function previousSlide(slider_index){
    const images = document.getElementById(`slider-${slider_index}`).children[0].children;
    const totalImages = images.length;
    if(count[slider_index] == 0){
        count[slider_index] = totalImages-1;
    }
    else{
        count[slider_index] -= 1;
    }
    for(let i=0; i<totalImages; i++){
        images[i].style.transform = `translateX(-${100*count[slider_index]}%)`;
        images[i].style.transition = "transform 1s ease-in-out";
    }
}

function toSlide(slider_index, index){
    const images = document.getElementById(`slider-${slider_index}`).children[0];
    const totalImages = images.length;
    count[slider_index] = index;
    const slider = document.querySelector('.slider');
    const nav_buttons = slider.children[3].children;
    for(n=0; n<nav_buttons.length; n++){
        if(n == index){
            nav_buttons[n].style.backgroundColor = "rgba(200, 200, 200, 0.5)";
        }
        else{
            nav_buttons[n].style.backgroundColor = "#333";
        }
    }
    
    for(let i=0; i<totalImages; i++){
        images[i].style.transform = `translateX(-${100*count}%)`;
        images[i].style.transition = "transform 1s ease-in-out";
    }
}

const menu = document.getElementById('sous');
let menu_choices = menu.children;
const menu_titre = document.getElementById('titre_menu');

function displayMenu(selection){
    if(menu.style.display == 'flex'){
        // if the menu is already displayed, hide it
        menu.style.display = 'none';
        if(selection != 0){
            menu_titre.innerHTML = menu_choices[selection-1].innerText;
        }
    }
    else{
        menu.style.display = 'flex';
        for(let i=0; i<menu_choices.length; i++){
            menu_choices[i].style.width = '100%';
        }
    }
}