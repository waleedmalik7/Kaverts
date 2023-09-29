const form = document.querySelector(".login-form");
form.addEventListener('submit', (e) => {
    e.preventDefault();
    fetch("/login", {
        method: "POST",
        body: JSON.stringify({
            email: form.email.value,
            pw: form.password.value
        }),
        headers: {
            "Content-type": "application/x-www-form-urlencoded"
        }
    });
});