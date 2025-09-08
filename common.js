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

// Referral tracking system
function trackReferral(referrerId, referredId) {
  // Save referral relationship
  const referralKey = `referral_${referredId}`;
  localStorage.setItem(referralKey, referrerId);
  
  // Update referrer's stats
  const referrerInvitesKey = `userInvites_${referrerId}`;
  const currentInvites = parseInt(localStorage.getItem(referrerInvitesKey) || '0');
  localStorage.setItem(referrerInvitesKey, (currentInvites + 1).toString());
  
  // Award bonus to referrer
  const referralConfig = JSON.parse(localStorage.getItem('pointsConfig') || '{}');
  const bonusAmount = parseInt(referralConfig.friendInvitePoints) || 20;
  
  const referrerBalanceKey = `userBalance_${referrerId}`;
  const currentBalance = parseInt(localStorage.getItem(referrerBalanceKey) || '0');
  localStorage.setItem(referrerBalanceKey, (currentBalance + bonusAmount).toString());
  
  console.log(`Referral recorded: ${referredId} was referred by ${referrerId}`);
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

// User profile management
function getUserProfile() {
  const userId = getUserId();
  const profileKey = `userProfile_${userId}`;
  const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
  
  // Set defaults if profile doesn't exist
  if (!profile.balance) profile.balance = 0;
  if (!profile.invites) profile.invites = 0;
  if (!profile.earnings) profile.earnings = 0;
  if (!profile.joinedDate) profile.joinedDate = new Date().toISOString();
  
  return profile;
}

function saveUserProfile(profile) {
  const userId = getUserId();
  const profileKey = `userProfile_${userId}`;
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

function updateUserProfile() {
  const profile = getUserProfile();
  
  // Update from current balance
  profile.balance = getCurrentBalance();
  
  // Update invite count
  const invitesKey = `userInvites_${getUserId()}`;
  profile.invites = parseInt(localStorage.getItem(invitesKey) || '0');
  
  // Calculate earnings (invites * points per invite)
  const referralConfig = JSON.parse(localStorage.getItem('pointsConfig') || '{}');
  const bonusAmount = parseInt(referralConfig.friendInvitePoints) || 20;
  profile.earnings = profile.invites * bonusAmount;
  
  saveUserProfile(profile);
  return profile;
}

// Check if user was referred and process bonus
// Update the checkReferralStatus function in common.js
function checkReferralStatus() {
  const userData = localStorage.getItem('telegramUser');
  const startParam = localStorage.getItem('telegramStartParam');
  
  if (userData && startParam && startParam.startsWith('ref')) {
    try {
      const user = JSON.parse(userData);
      const referrerId = startParam.replace('ref', '');
      
      // Check if we've already processed this referral
      const referralKey = `referralProcessed_${getUserId()}`;
      if (!localStorage.getItem(referralKey)) {
        // Mark as processed
        localStorage.setItem(referralKey, 'true');
        
        // Get referral bonus amount from settings
        const referralConfig = JSON.parse(localStorage.getItem('pointsConfig') || '{}');
        const bonusAmount = parseInt(referralConfig.friendInvitePoints) || 20;
        
        // Add bonus to referrer's balance
        const referrerBalanceKey = `userBalance_${referrerId}`;
        const currentBalance = parseInt(localStorage.getItem(referrerBalanceKey) || '0');
        localStorage.setItem(referrerBalanceKey, (currentBalance + bonusAmount).toString());
        
        // Update referrer's referral count
        const referrerInvitesKey = `userInvites_${referrerId}`;
        const currentInvites = parseInt(localStorage.getItem(referrerInvitesKey) || '0');
        localStorage.setItem(referrerInvitesKey, (currentInvites + 1).toString());
        
        console.log(`Referral bonus of ${bonusAmount} points awarded to user ${referrerId}`);
        
        // Show a welcome message for referred users
        if (tg && tg.showPopup) {
          tg.showPopup({
            title: 'Welcome!',
            message: `You were referred by a friend! You both earn ${bonusAmount} points.`,
            buttons: [{ type: 'ok' }]
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