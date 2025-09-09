const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..'))); // Serve static files

// Replace with your bot token
const botToken = '8488159096:AAHnzzdhE2wrIKCS5OtR2o3K_1Cw3PL38kg';
const adminId = '5650788149';

// Initialize Telegram Bot without polling
const bot = new TelegramBot(botToken);
// Note: Removed { polling: true } to prevent automatic polling

// Channel configuration - use actual channel usernames (without @)
const channels = {
  'Channel 1': -1002586398527, // Your actual channel username
  'Channel 2': -1002858278191      // Your actual channel username
};

// User storage file
const USER_DATA_FILE = './users.json';

// Helper functions for user data management
function loadUsers() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
  return {};
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

function addUser(userData) {
  const users = loadUsers();
  if (!users[userData.id]) {
    users[userData.id] = {
      ...userData,
      balance: 0,
      invites: 0,
      join_date: new Date().toISOString()
    };
    saveUsers(users);
    return true;
  }
  return false;
}

function getUser(userId) {
  const users = loadUsers();
  return users[userId] || null;
}

function updateUserBalance(userId, amount) {
  const users = loadUsers();
  if (users[userId]) {
    users[userId].balance = (users[userId].balance || 0) + amount;
    saveUsers(users);
    return users[userId].balance;
  }
  return null;
}

function incrementUserInvites(userId) {
  const users = loadUsers();
  if (users[userId]) {
    users[userId].invites = (users[userId].invites || 0) + 1;
    saveUsers(users);
    return users[userId].invites;
  }
  return null;
}

// Set webhook route - call this once to set up the webhook
app.get('/set-webhook', async (req, res) => {
  try {
    const webhookUrl = `https://webbb-mvut.onrender.com/bot${botToken}`;
    const result = await bot.setWebHook(webhookUrl);
    console.log('Webhook set successfully:', result);
    res.json({ success: true, message: 'Webhook set successfully', result });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook', details: error.message });
  }
});

// Webhook endpoint - Telegram will send updates here
// Add this function to your index.js to clearly separate bot and mini app contexts
function isMiniAppContext(initData) {
  // Check if this is coming from a mini app (has web_app data)
  return initData && initData.query_id;
}

// Modify your webhook handler to check context
app.post(`/bot${botToken}`, (req, res) => {
  try {
    const update = req.body;
    
    // If this is a web app data message, handle it differently
    if (update.message && update.message.web_app_data) {
      handleWebAppData(update.message);
    } else {
      bot.processUpdate(update);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing update:', error);
    res.sendStatus(200);
  }
});

function handleWebAppData(message) {
  try {
    const data = JSON.parse(message.web_app_data.data);
    
    if (data.action === 'channels_joined' && data.userId) {
      // User has completed the channel joining process in mini app
      const userInfo = `User ${data.userId} has joined all channels via mini app`;
      console.log(userInfo);
      
      // Notify admin
      bot.sendMessage(adminId, userInfo);
      
      // Send confirmation to user
      bot.sendMessage(message.chat.id, 'Thank you for joining our channels! 🎉 You can now access all features.');
    }
  } catch (error) {
    console.error('Error processing web app data:', error);
  }
}

// Handle /start command with referral parameter
// In index.js, modify the start command handlers:

// Handle /start command with referral parameter - ONLY IN BOT CONTEXT
bot.onText(/\/start (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const startParam = match[1];
  
  // Store user data
  const userData = {
    id: userId,
    username: msg.from.username,
    first_name: msg.from.first_name,
    last_name: msg.from.last_name
  };
  
  // Check if this is a referral (only process in bot context, not mini app)
  if (startParam.startsWith('ref')) {
    const referrerId = startParam.replace('ref', '');
    userData.referred_by = referrerId;
    
    // Add user to manager
    addUser(userData);
    
    // Send welcome message with instructions to use the mini app
    bot.sendMessage(chatId, `Welcome! You were referred by user ${referrerId}. Please use the menu button to open our mini app and complete the verification process.`);
    
    // Process the referral
    processReferral(userId, startParam)
      .then(data => console.log('Referral processed:', data))
      .catch(error => console.error('Error processing referral:', error));
  } else {
    // Regular start command - direct to mini app
    addUser(userData);
    bot.sendMessage(chatId, 'Welcome to our bot! Please use the menu button to open our mini app and get started.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Open Mini App', web_app: { url: 'https://webbb-mvut.onrender.com' } }]
        ]
      }
    });
  }
});

// Handle simple /start command without parameters
bot.onText(/\/start$/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Store user data
  const userData = {
    id: userId,
    username: msg.from.username,
    first_name: msg.from.first_name,
    last_name: msg.from.last_name
  };
  
  addUser(userData);
  bot.sendMessage(chatId, 'Welcome to our bot! Use /help to see available commands.');
});

// Function to process referral
// Modify processReferral to only work in bot context
async function processReferral(userId, startParam) {
  try {
    // Only process referrals that start with "ref" and are in bot context
    if (startParam && startParam.startsWith('ref')) {
      const referrerId = startParam.replace('ref', '');
      
      // Check if referrer exists
      const referrer = getUser(referrerId);
      if (referrer) {
        // Get referral bonus amount from settings
        const referralConfig = { friendInvitePoints: 20 };
        const bonusAmount = parseInt(referralConfig.friendInvitePoints) || 20;
        
        // Award bonus to referrer
        updateUserBalance(referrerId, bonusAmount);
        incrementUserInvites(referrerId);
        
        console.log(`Referral bonus of ${bonusAmount} points awarded to user ${referrerId} for referring user ${userId}`);
        
        // Notify admin about the referral
        bot.sendMessage(adminId, `🎉 New referral! User ${userId} was referred by ${referrerId}. ${bonusAmount} points awarded.`);
        
        // Notify referrer
        bot.sendMessage(referrerId, `🎉 You've earned ${bonusAmount} points! User ${userId} joined using your referral link.`);
      } else {
        console.log(`Referrer ${referrerId} not found in database`);
      }
    }
    
    return { success: true, message: 'Referral processed' };
  } catch (error) {
    console.error('Error processing referral:', error);
    throw error;
  }
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API endpoint to get referral statistics
app.get('/api/admin/referrals', (req, res) => {
  try {
    const users = loadUsers();
    const referralStats = {};
    
    // Calculate referral statistics
    Object.values(users).forEach(user => {
      if (user.referred_by) {
        if (!referralStats[user.referred_by]) {
          referralStats[user.referred_by] = {
            referrer_id: user.referred_by,
            total_referrals: 0,
            users: []
          };
        }
        referralStats[user.referred_by].total_referrals += 1;
        referralStats[user.referred_by].users.push({
          user_id: user.id,
          username: user.username,
          join_date: user.join_date
        });
      }
    });
    
    res.json({ referrals: referralStats });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to process referral
app.get('/api/telegram/start', async (req, res) => {
  const { userId, startParam } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing user ID' });
  }
  
  try {
    const result = await processReferral(userId, startParam);
    res.json(result);
  } catch (error) {
    console.error('Error processing start command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to check if user is member of channels
// In your index.js file, update the membership check endpoint:

// 
// API endpoint to check if user is member of channels
// In your index.js file, modify the /api/telegram/check-membership endpoint:

app.get('/api/telegram/check-membership', async (req, res) => {
  const { userId, channelNames } = req.query;
  
  if (!userId || !channelNames) {
    return res.status(400).json({ error: 'Missing userId or channelNames parameters' });
  }
  
  try {
    const channelsArray = Array.isArray(channelNames) 
      ? channelNames 
      : channelNames.split(',');
    
    const membershipStatus = {};
    const numericUserId = parseInt(userId);

    for (const channelUsername of channelsArray) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelUsername}&user_id=${numericUserId}`
        );
        const data = await response.json();

        if (data.ok) {
          const status = data.result.status;
          membershipStatus[channelUsername] = !['left', 'kicked'].includes(status);
          console.log(`✅ User ${numericUserId} status in ${channelUsername}: ${status}`);
        } else {
          console.error(`❌ API error for ${channelUsername}:`, data.description);
          membershipStatus[channelUsername] = false;
        }
      } catch (error) {
        console.error(`❌ Error with ${channelUsername}:`, error.message);
        membershipStatus[channelUsername] = false;
      }
    }

    res.json({ 
      success: true, 
      userId: numericUserId,
      membership: membershipStatus 
    });
  } catch (error) {
    console.error('Overall error checking membership:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle data from Mini App
bot.on('message', (msg) => {
  if (msg.web_app_data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      
      if (data.action === 'channels_joined' && data.userId) {
        // User has completed the channel joining process
        const userInfo = `User ${data.userId} has joined all channels`;
        console.log(userInfo);
        
        // Notify admin
        bot.sendMessage(adminId, userInfo);
        
        // Send confirmation to user
        bot.sendMessage(msg.chat.id, 'Thank you for joining our channels! 🎉');
      }
    } catch (error) {
      console.error('Error processing web app data:', error);
    }
  }
});

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Add this after app.listen()
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  
  // Initialize users.json if it doesn't exist
  if (!fs.existsSync(USER_DATA_FILE)) {
    saveUsers({});
  }
  
  // Automatically set webhook on server start
  try {
    const webhookUrl = `https://webbb-mvut.onrender.com/bot${botToken}`;
    await bot.setWebHook(webhookUrl);
    console.log('Webhook set successfully');
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
});