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

// Store active Telegram logins (in production, use a proper database)
const activeLogins = new Map();

// Generate a random string for login token
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API endpoint to initiate Telegram login
app.post('/api/telegram/login', (req, res) => {
  const token = generateToken();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
  
  activeLogins.set(token, { 
    expires,
    status: 'pending',
    userData: null
  });
  
  res.json({ 
    token,
    botUsername: 'EchoEARN_robot', // Replace with your bot's username
    loginUrl: `https://t.me/EchoEARN_robot?start=${token}` // Replace with your bot's username
  });
});

// API endpoint to check login status
app.get('/api/telegram/status/:token', (req, res) => {
  const { token } = req.params;
  const loginData = activeLogins.get(token);
  
  if (!loginData) {
    return res.status(404).json({ error: 'Token not found' });
  }
  
  if (Date.now() > loginData.expires) {
    activeLogins.delete(token);
    return res.status(410).json({ error: 'Token expired' });
  }
  
  res.json({
    status: loginData.status,
    user: loginData.userData
  });
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

// Handle Telegram bot commands
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1];
  const loginData = activeLogins.get(token);
  
  if (!loginData || Date.now() > loginData.expires) {
    bot.sendMessage(chatId, 'This login link has expired. Please generate a new one from the website.');
    return;
  }
  
  // Store user data
  loginData.status = 'completed';
  loginData.userData = {
    id: msg.from.id,
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name || '',
    photoUrl: msg.from.photo ? `https://api.telegram.org/bot${botToken}/getFile?file_id=${msg.from.photo.big_file_id}` : null
  };
  
  activeLogins.set(token, loginData);
  
  bot.sendMessage(chatId, 'Login successful! You can return to the website now.');
  
  // Notify admin
  bot.sendMessage(adminId, `New user login: ${msg.from.first_name} ${msg.from.last_name || ''} (@${msg.from.username || 'no username'})`);
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
