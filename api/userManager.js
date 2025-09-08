// userManager.js
const fs = require('fs');
const path = require('path');

class UserManager {
  constructor() {
    this.usersFilePath = path.join(__dirname, 'data', 'users.json');
    this.ensureDataDirectory();
    this.users = this.loadUsers();
  }
  
  ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
  
  loadUsers() {
    try {
      if (fs.existsSync(this.usersFilePath)) {
        const usersJson = fs.readFileSync(this.usersFilePath, 'utf8');
        return JSON.parse(usersJson);
      }
      return {};
    } catch (error) {
      console.error('Error loading users:', error);
      return {};
    }
  }
  
  saveUsers() {
    try {
      fs.writeFileSync(this.usersFilePath, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }
  
  addUser(userData) {
    this.users[userData.id] = {
      id: userData.id,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      referred_by: userData.referred_by || null,
      join_date: new Date().toISOString(),
      balance: 0,
      invites: 0
    };
    this.saveUsers();
  }
  
  getUser(userId) {
    return this.users[userId] || null;
  }
  
  updateUserBalance(userId, amount) {
    if (this.users[userId]) {
      this.users[userId].balance += amount;
      this.saveUsers();
      return this.users[userId].balance;
    }
    return null;
  }
  
  incrementUserInvites(userId) {
    if (this.users[userId]) {
      this.users[userId].invites += 1;
      this.saveUsers();
      return this.users[userId].invites;
    }
    return null;
  }
  
  getUsersByReferrer(referrerId) {
    return Object.values(this.users).filter(user => user.referred_by === referrerId);
  }
}

// Create a singleton instance
const userManager = new UserManager();
module.exports = userManager;