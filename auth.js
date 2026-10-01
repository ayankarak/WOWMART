function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('redirect');
    return target ? target : 'index.html';
}
function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.style.color = (type === 'error') ? 'red' : 'green';
}

function initAuthPage() {
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');
    
    if (!signInForm || !signUpForm) return;

    const signInMsg = document.getElementById('signin-msg');
    const signUpMsg = document.getElementById('signup-msg');

    function getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    }

    // --- Sign Up Process ---
    signUpForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('signup-user').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-pass').value;
        const repeat = document.getElementById('signup-pass-repeat').value;
        if (!username || !email || !password || !repeat) {
            return showMessage(signUpMsg, 'Please fill in all fields!', 'error');
        }

        if (password !== repeat) {
            return showMessage(signUpMsg, 'Passwords do not match!', 'error');
        }

        let users = getUsers();

        const userExists = users.some(u => u.username === username || u.email === email);
        if (userExists) {
            return showMessage(signUpMsg, 'An account with this username or email already exists!', 'error');
        }
        users.push({ username, email, password });
        localStorage.setItem('users', JSON.stringify(users));
        
        localStorage.setItem('loggedInUser', username);

        showMessage(signUpMsg, 'Account created successfully! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = getRedirectTarget();
        }, 1000);
    });

    // --- Sign In Process ---
    signInForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const inputId = document.getElementById('signin-user').value.trim();
        const password = document.getElementById('signin-pass').value;

        if (!inputId || !password) {
            return showMessage(signInMsg, 'Please enter your username and password!', 'error');
        }

        const users = getUsers();
        if (users.length === 0) {
            return showMessage(signInMsg, 'You don\'t have an account!', 'error');
        }

        // User match kora
        const foundUser = users.find(u => (u.username === inputId || u.email === inputId) && u.password === password);

        if (!foundUser) {
            return showMessage(signInMsg, 'Invalid username or password!', 'error');
        }
        localStorage.setItem('loggedInUser', foundUser.username);

        showMessage(signInMsg, 'Login successful! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = getRedirectTarget();
        }, 1000);
    });
}
function updateAccountLabel() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) return;
    const desktopBtn = document.querySelector('.main-header .cart-action a[href="account.html"]');
    if (desktopBtn) {
        desktopBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${loggedInUser}`;
    }

    // Mobile account span update
    const mobileSpan = document.querySelector('.mobile-header-actions a[href="account.html"] span');
    if (mobileSpan) {
        mobileSpan.textContent = loggedInUser;
    }
}

function init() {
    initAuthPage();
    updateAccountLabel();
}

document.addEventListener('DOMContentLoaded', init);