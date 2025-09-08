// common.js
function getUserId() {
  const userData = localStorage.getItem('telegramUser');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.id || 'default'; // Use Telegram user ID if available
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  return 'default'; // Fallback for users without Telegram data
}

function getUserBalanceKey() {
  return `userBalance_${getUserId()}`;
}

function initializeBalance() {
  const balanceKey = getUserBalanceKey();
  // Check if balance exists in localStorage, if not initialize it
  if (!localStorage.getItem(balanceKey)) {
    localStorage.setItem(balanceKey, '0');
  }
  
  // Update balance display on the page
  updateBalanceDisplay();
}

function updateBalanceDisplay() {
  const balanceKey = getUserBalanceKey();
  const balance = localStorage.getItem(balanceKey) || '0';
  
  // Update balance on home page (using the ID)
  const homeBalanceElement = document.getElementById('balance-display');
  if (homeBalanceElement) {
    homeBalanceElement.textContent = balance;
  }
  
  // Also update any other balance displays if they exist
  const otherBalanceElements = document.querySelectorAll('.text-4xl.font-bold');
  otherBalanceElements.forEach(element => {
    if (!element.id || element.id !== 'balance-display') {
      element.textContent = balance;
    }
  });
}

function addToBalance(amount) {
  const balanceKey = getUserBalanceKey();
  const currentBalance = parseInt(localStorage.getItem(balanceKey) || '0');
  const newBalance = currentBalance + amount;
  localStorage.setItem(balanceKey, newBalance.toString());
  updateBalanceDisplay();
  return newBalance;
}

function deductFromBalance(amount) {
  const balanceKey = getUserBalanceKey();
  const currentBalance = parseInt(localStorage.getItem(balanceKey) || '0');
  if (currentBalance >= amount) {
    const newBalance = currentBalance - amount;
    localStorage.setItem(balanceKey, newBalance.toString());
    updateBalanceDisplay();
    return newBalance;
  }
  return currentBalance; // Not enough balance
}

function getCurrentBalance() {
  const balanceKey = getUserBalanceKey();
  return parseInt(localStorage.getItem(balanceKey) || '0');
}