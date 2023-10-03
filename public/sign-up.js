//Regexes
const name_regex = /^([a-zA-Z\s])+$/;
const email_regex = /^[\w\.-]+@[\w]+\.[a-zA-Z]{2,}$/;
const password_digit = /(?=.*\d)/;
const password_cl = /(?=.*[A-Z])/;
const password_regex = /^[\w!@#$%^&*]{8,15}$/;
const submitValid = true;

//query selectors
const form = document.querySelector(".sign-up-form");
const checkbox = document.querySelector(".checkbox");
const password = document.querySelector("#password");
const information = [
    document.querySelector("#full-name"),
    document.querySelector("#username"),
    document.querySelector("#password"),
    document.querySelector("#confirm-password")
];

//Non database checks: 
form.addEventListener('submit', (e)=>{
    e.preventDefault(); //stops refresh
    if(checkbox.checked && submittable()){
        alert('Form submitted successfully');
        form.submit();
    }else{
        alert('Form is invalid');
    }
});

function submittable(){
    for(let i = 0; i < information.length; i++){
        if(information[i].getAttribute('class') == 'fail'){
            return false;
        }
    }
    return true;
};

function validateAndSetClass(element, regex){
    const val = element.value;
    if(regex.test(val)){
        element.setAttribute('class','success');
    }else{
        element.setAttribute('class','fail');
    }
}

form.addEventListener('keyup', e => {
    const names = e.target.name;
    const val = e.target.value;
    const element = e.target;

    if(names === "name"){
        validateAndSetClass(e.target,name_regex);
    }else if(names === "username"){
        validateAndSetClass(e.target,email_regex);
    }else if (names === "password") {
        // Separate validation for each condition
        const hasDigit = password_digit.test(val);
        const hasCapital = password_cl.test(val);
        const isCorrectLength = password_regex.test(val);
   
        if (hasDigit && hasCapital && isCorrectLength) { 
            element.setAttribute('class', 'success');
        } else {
            element.setAttribute('class', 'fail');
        }
    }else if(names === "confirm-password"){
        if(val === password.value){
            element.setAttribute('class','success');
        }else{
            element.setAttribute('class','fail');
        }
    }
});
//add tooltip

//accept terms of service

//database checks:
//email exists or not, if it does not send email that account has been made 

