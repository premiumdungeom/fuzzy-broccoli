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
app.use(express.static(path.join(__dirname, '..')));

// Bot configuration
const botToken = '8488159096:AAHnzzdhE2wrIKCS5OtR2o3K_1Cw3PL38kg';
const adminId = '5650788149';
const bot = new TelegramBot(botToken);

// Channel configuration - use actual channel IDs
const channels = {
  'Channel 1': '-1002586398527',
  'Channel 2': '-1002858278191'
};

// User storage (simplified - just for tracking who completed verification)
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

function addUser(userId) {
  const users = loadUsers();
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      verified: true,
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

// Set webhook route
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

// Webhook endpoint
app.post(`/bot${botToken}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing update:', error);
    res.sendStatus(200);
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API endpoint to check if user is member of channels
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

    for (const channelId of channelsArray) {
      try {
        const result = await bot.getChatMember(channelId, numericUserId);
        const status = result.status;
        membershipStatus[channelId] = !['left', 'kicked'].includes(status);
        console.log(`✅ User ${numericUserId} status in ${channelId}: ${status}`);
      } catch (error) {
        console.error(`❌ Error checking membership for ${channelId}:`, error.message);
        membershipStatus[channelId] = false;
      }
    }

    // If all channels are joined, mark user as verified
    const allJoined = Object.values(membershipStatus).every(status => status === true);
    if (allJoined) {
      addUser(numericUserId);
      
      // Notify admin
      bot.sendMessage(adminId, `✅ User ${numericUserId} has successfully joined all channels!`);
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
        const userInfo = `User ${data.userId} has joined all channels`;
        console.log(userInfo);
        
        bot.sendMessage(adminId, userInfo);
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

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  
  if (!fs.existsSync(USER_DATA_FILE)) {
    saveUsers({});
  }
  
  try {
    const webhookUrl = `https://webbb-mvut.onrender.com/bot${botToken}`;
    await bot.setWebHook(webhookUrl);
    console.log('Webhook set successfully');
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
});