const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();
const UserManager = require('./userManager');
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
  'Channel 1': 'allinonepayout', // Your actual channel username
  'Channel 2': 'ALL1N_0NE'       // Your actual channel username
};

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
// Webhook endpoint - Telegram will send updates here
app.post(`/bot${botToken}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing update:', error);
    res.sendStatus(200); // Still send 200 to prevent Telegram from retrying
  }
});

// Handle /start command with referral parameter
bot.onText(/\/start (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const startParam = match[1];
  
  // Store user data
  const userData = {
    id: userId,
    username: msg.from.username,
    first_name: msg.from.first_name,
    last_name: msg.from.last_name,
    join_date: new Date().toISOString()
  };
  
  // Check if this is a referral
  if (startParam.startsWith('ref')) {
    const referrerId = startParam.replace('ref', '');
    userData.referred_by = referrerId;
    
    // Add user to manager
    UserManager.addUser(userData);
    
    // Send welcome message
    bot.sendMessage(chatId, `Welcome! You were referred by user ${referrerId}.`);
    
    // Process the referral via our API
    processReferral(userId, startParam)
      .then(data => console.log('Referral processed:', data))
      .catch(error => console.error('Error processing referral:', error));
  } else {
    // Add user without referral
    UserManager.addUser(userData);
    bot.sendMessage(chatId, 'Welcome to our bot! Use /help to see available commands.');
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
    last_name: msg.from.last_name,
    join_date: new Date().toISOString()
  };
  
  UserManager.addUser(userData);
  bot.sendMessage(chatId, 'Welcome to our bot! Use /help to see available commands.');
});

// Function to process referral
async function processReferral(userId, startParam) {
  try {
    // Check if this is a referral (start parameter begins with "ref")
    if (startParam && startParam.startsWith('ref')) {
      const referrerId = startParam.replace('ref', '');
      
      // Check if we've already processed this referral
      const referralKey = `referralProcessed_${userId}`;
      if (!localStorage.getItem(referralKey)) {
        // Mark as processed
        localStorage.setItem(referralKey, 'true');
        
        // Get referral bonus amount from settings
        const referralConfig = JSON.parse(localStorage.getItem('pointsConfig') || '{}');
        const bonusAmount = parseInt(referralConfig.friendInvitePoints) || 20;
        
        // Use UserManager to handle the referral
        const referrer = UserManager.getUser(referrerId);
        if (referrer) {
          UserManager.updateUserBalance(referrerId, bonusAmount);
          UserManager.incrementUserInvites(referrerId);
          
          console.log(`Referral bonus of ${bonusAmount} points awarded to user ${referrerId} for referring user ${userId}`);
          
          // Notify admin about the referral
          bot.sendMessage(adminId, `🎉 New referral! User ${userId} was referred by ${referrerId}. ${bonusAmount} points awarded.`);
        } else {
          console.log(`Referrer ${referrerId} not found in database`);
        }
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
    const users = UserManager.loadUsers();
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
app.post('/api/telegram/check-membership', async (req, res) => {
  const { userId, channelNames } = req.body;
  
  console.log('Membership check for user:', userId, 'channels:', channelNames);
  
  if (!userId || !channelNames) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  try {
    const membershipStatus = {};
    const numericUserId = parseInt(userId);
    
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    for (const channelName of channelNames) {
      const channelUsername = channels[channelName];
      
      if (!channelUsername) {
        console.error(`Channel not configured: ${channelName}`);
        membershipStatus[channelName] = false;
        continue;
      }
      
      try {
        // Use the channel username directly (without @)
        const chatMember = await bot.getChatMember(channelUsername, numericUserId);
        
        // User is a member if status is not 'left' or 'kicked'
        membershipStatus[channelName] = !['left', 'kicked'].includes(chatMember.status);
        
        console.log(`User ${numericUserId} status in ${channelName} (${channelUsername}): ${chatMember.status}`);
        
      } catch (error) {
        console.error(`Error checking membership for ${channelName}:`, error.message);
        
        // More detailed error logging
        if (error.response) {
          console.error('Telegram API response:', error.response.body);
        }
        
        membershipStatus[channelName] = false;
      }
    }
    
    console.log('Final membership status:', membershipStatus);
    res.json({ membership: membershipStatus });
    
  } catch (error) {
    console.error('Overall error checking membership:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
  
  // Automatically set webhook on server start
  try {
    const webhookUrl = `https://webbb-mvut.onrender.com/bot${botToken}`;
    await bot.setWebHook(webhookUrl);
    console.log('Webhook set successfully');
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
});