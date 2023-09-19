const form = document.querySelector(".login-form");
form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log(form.username.value,form.password.value);
});