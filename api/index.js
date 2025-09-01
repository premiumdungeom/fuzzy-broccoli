const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files

// Replace with your bot token
const botToken = '8488159096:AAHnzzdhE2wrIKCS5OtR2o3K_1Cw3PL38kg';
const adminId = '5650788149';

// Initialize Telegram Bot
const bot = new TelegramBot(botToken, { polling: true });

// Channel configuration - use actual channel usernames (without @)
const channels = {
  'Channel 1': 'allinonepayout', // Your actual channel username
  'Channel 2': 'ALL1N_0NE'       // Your actual channel username
};

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API endpoint to check if user is member of channels
app.post('/api/telegram/check-membership', async (req, res) => {
  const { userId, channelNames } = req.body;
  
  if (!userId || !channelNames) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  try {
    const membershipStatus = {};
    
    for (const channelName of channelNames) {
      const channelUsername = channels[channelName];
      
      if (!channelUsername) {
        console.error(`Channel not configured: ${channelName}`);
        membershipStatus[channelName] = false;
        continue;
      }
      
      try {
        // Format channel as @username for the API
        const channelId = `@${channelUsername}`;
        
        // Check if user is a member of the channel
        const chatMember = await bot.getChatMember(channelId, parseInt(userId));
        
        // User is a member if status is not 'left' or 'kicked'
        membershipStatus[channelName] = !['left', 'kicked'].includes(chatMember.status);
        
        console.log(`User ${userId} status in ${channelName}: ${chatMember.status}`);
        
      } catch (error) {
        console.error(`Error checking membership for channel ${channelName}:`, error.message);
        
        // If we get a "chat not found" error, the bot might not be admin in the channel
        if (error.response && error.response.statusCode === 400) {
          console.error(`Bot may not be admin in channel ${channelName} or channel doesn't exist`);
        }
        
        membershipStatus[channelName] = false;
      }
    }
    
    res.json({ membership: membershipStatus });
  } catch (error) {
    console.error('Error checking channel membership:', error);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Open http://localhost:${port} to view the app`);
  console.log('Configured channels:', channels);
});