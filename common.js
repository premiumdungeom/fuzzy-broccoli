// common.js
function initializeBalance() {
  // Check if balance exists in localStorage, if not initialize it
  if (!localStorage.getItem('userBalance')) {
    localStorage.setItem('userBalance', '0');
  }
  
  // Update balance display on the page
  updateBalanceDisplay();
}

function updateBalanceDisplay() {
  const balance = localStorage.getItem('userBalance') || '0';
  
  // Update balance on home page
  const homeBalanceElement = document.querySelector('.text-4xl.font-bold.my-1');
  if (homeBalanceElement) {
    homeBalanceElement.textContent = balance;
  }
  
  // Update balance on profile page
  const profileBalanceElement = document.querySelector('.text-3xl.font-bold');
  if (profileBalanceElement) {
    profileBalanceElement.textContent = balance;
  }
}

function addToBalance(amount) {
  const currentBalance = parseInt(localStorage.getItem('userBalance') || '0');
  const newBalance = currentBalance + amount;
  localStorage.setItem('userBalance', newBalance.toString());
  updateBalanceDisplay();
  return newBalance;
}

function deductFromBalance(amount) {
  const currentBalance = parseInt(localStorage.getItem('userBalance') || '0');
  if (currentBalance >= amount) {
    const newBalance = currentBalance - amount;
    localStorage.setItem('userBalance', newBalance.toString());
    updateBalanceDisplay();
    return newBalance;
  }
  return currentBalance; // Not enough balance
}

function getCurrentBalance() {
  return parseInt(localStorage.getItem('userBalance') || '0');
}