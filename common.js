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

// Get bot username from Telegram data
function getBotUsername() {
  const userData = localStorage.getItem('telegramUser');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      // Check if we have the bot username in start_param or use default
      if (user.start_param && user.start_param.includes('_')) {
        // Extract bot username from start_param if available
        const parts = user.start_param.split('_');
        if (parts.length > 1) {
          return parts[0]; // Assuming format like "botname_ref123"
        }
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  return 'EchoEARN_robot'; // Default bot username
}

// Get referral code for the current user
function getReferralCode() {
  const userId = getUserId();
  return `ref${userId}`;
}

// Generate referral link
function generateReferralLink() {
  const botUsername = getBotUsername();
  const referralCode = getReferralCode();
  return `https://t.me/${botUsername}?start=${referralCode}`;
}

// Check if user was referred and process bonus
// Check if user was referred and process bonus
function checkReferralStatus() {
  const userData = localStorage.getItem('telegramUser');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      // Check if user has a referral parameter
      if (user.start_param && user.start_param.startsWith('ref')) {
        const referrerId = user.start_param.replace('ref', '');
        
        // Check if we've already processed this referral
        const referralKey = `referralProcessed_${getUserId()}`;
        if (!localStorage.getItem(referralKey)) {
          // Mark as processed
          localStorage.setItem(referralKey, 'true');
          
          // Send API request to process referral
          fetch(`/api/telegram/start?userId=${getUserId()}&startParam=${user.start_param}`)
            .then(response => response.json())
            .then(data => {
              console.log('Referral processed via API:', data);
            })
            .catch(error => {
              console.error('Error processing referral via API:', error);
            });
        }
      }
    } catch (error) {
      console.error('Error processing referral:', error);
    }
  }
}

// Initialize referral system
function initializeReferralSystem() {
  checkReferralStatus();
}