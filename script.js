// Firebase configuration - you will need to replace this with your own Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAK-NzCqQSCiLn5WSSf-5tWbsO5nSyubEk",
  authDomain: "best-msg-4cb83.firebaseapp.com",
  projectId: "best-msg-4cb83",
  storageBucket: "best-msg-4cb83.firebasestorage.app",
  messagingSenderId: "94214242826",
  appId: "1:94214242826:web:f02a0deb024e43a32fd5f3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
// Auth Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const resetForm = document.getElementById('resetForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const showResetLink = document.getElementById('showReset');
const backToLoginLink = document.getElementById('backToLogin');
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');
const resetFormElement = document.getElementById('resetFormElement');

// App Elements
const logoutBtn = document.getElementById('logoutBtn');
const currentUserInfo = document.getElementById('currentUserInfo');
const userList = document.getElementById('userList');
const searchUsers = document.getElementById('searchUsers');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const chatContainer = document.getElementById('chatContainer');
const chatHeader = document.getElementById('chatHeader');
const messageContainer = document.getElementById('messageContainer');
const chatRequest = document.getElementById('chatRequest');
const messageInputContainer = document.getElementById('messageInputContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const acceptChat = document.getElementById('acceptChat');
const declineChat = document.getElementById('declineChat');

// Global variables
let currentUser = null;
let selectedUser = null;
let currentChatId = null;
let allUsers = [];
let isMobile = window.innerWidth <= 768;
let userStatusListeners = {}; // Map to store unsubscribe functions for user status listeners
let lastOnlineTime = null;

// Event Listeners for Authentication
showSignupLink.addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  resetForm.style.display = 'none';
});

showLoginLink.addEventListener('click', () => {
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  resetForm.style.display = 'none';
});

showResetLink.addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'none';
  resetForm.style.display = 'block';
});

backToLoginLink.addEventListener('click', () => {
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  resetForm.style.display = 'none';
});

// Login Form Submission
loginFormElement.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  // Sign in with email and password
  auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Clear form
          loginFormElement.reset();
      })
      .catch((error) => {
          alert('Login Error: ' + error.message);
      });
});

// Signup Form Submission
signupFormElement.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  
  // Create user with email and password
  auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Add user to Firestore
          return db.collection('users').doc(userCredential.user.uid).set({
              uid: userCredential.user.uid,
              name: name,
              email: email,
              isOnline: true,
              lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      })
      .then(() => {
          // Clear form
          signupFormElement.reset();
          // Switch to login form
          loginForm.style.display = 'block';
          signupForm.style.display = 'none';
      })
      .catch((error) => {
          alert('Signup Error: ' + error.message);
      });
});

// Reset Password Form Submission
resetFormElement.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value;
  
  // Send password reset email
  auth.sendPasswordResetEmail(email)
      .then(() => {
          alert('Password reset email sent. Check your inbox.');
          resetFormElement.reset();
          loginForm.style.display = 'block';
          resetForm.style.display = 'none';
      })
      .catch((error) => {
          alert('Reset Error: ' + error.message);
      });
});

// Logout Button
logoutBtn.addEventListener('click', () => {
  updateUserStatus(false);
  auth.signOut();
});

// Auth State Change Listener
auth.onAuthStateChanged((user) => {
  if (user) {
      // User is signed in
      currentUser = user;
      
      // Get user data from Firestore
      db.collection('users').doc(user.uid).get()
          .then((doc) => {
              if (doc.exists) {
                  currentUser = { ...currentUser, ...doc.data() };
                  
                  // Show app container, hide auth container
                  authContainer.style.display = 'none';
                  appContainer.style.display = 'flex';
                  
                  // Update current user info
                  updateCurrentUserInfo();
                  
                  // Load all users
                  loadUsers();
                  
                  // Set user as online
                  updateUserStatus(true);

                  // Setup heartbeat for online status
                  setupOnlineHeartbeat();
              }
          });
  } else {
      // User is signed out
      if (currentUser) {
          // Clear last known online time
          updateUserStatus(false);
      }
      
      currentUser = null;
      
      // Show auth container, hide app container
      authContainer.style.display = 'flex';
      appContainer.style.display = 'none';
      
      // Reset UI
      resetUI();
      
      // Clear all status listeners
      clearAllStatusListeners();
  }
});

// Setup heartbeat to maintain online status
function setupOnlineHeartbeat() {
  // Update online status every 5 minutes
  const heartbeatInterval = setInterval(() => {
    if (currentUser && currentUser.uid) {
      db.collection('users').doc(currentUser.uid).update({
        isOnline: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(error => console.error('Error updating heartbeat:', error));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 300000); // 5 minutes
  
  // Store the interval ID to clear it on logout
  window.onlineHeartbeat = heartbeatInterval;
}

// Update current user info
function updateCurrentUserInfo() {
  if (!currentUser) return;
  
  const nameInitial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '';
  
  currentUserInfo.innerHTML = `
      <div class="avatar">
          ${nameInitial}
      </div>
      <div class="user-details">
          <div class="name">${currentUser.name || 'User'}</div>
          <div class="status">Online</div>
      </div>
  `;
}

// Update user online status
function updateUserStatus(isOnline) {
  if (!currentUser || !currentUser.uid) return;
  
  // Use server timestamp for lastSeen
  const lastSeen = firebase.firestore.FieldValue.serverTimestamp();
  
  // Store last online time to prevent race conditions
  lastOnlineTime = new Date().getTime();
  
  return db.collection('users').doc(currentUser.uid).update({
      isOnline: isOnline,
      lastSeen: lastSeen
  }).catch(error => console.error('Error updating status:', error));
}

// Clear status listeners
function clearAllStatusListeners() {
  Object.values(userStatusListeners).forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  
  userStatusListeners = {};
  
  // Clear heartbeat interval
  if (window.onlineHeartbeat) {
    clearInterval(window.onlineHeartbeat);
    window.onlineHeartbeat = null;
  }
}

// Reset UI when logged out
function resetUI() {
  userList.innerHTML = '';
  chatPlaceholder.style.display = 'flex';
  chatContainer.style.display = 'none';
  selectedUser = null;
  currentChatId = null;
}

// Load all users
function loadUsers() {
  // Listen for users collection changes
  const usersListener = db.collection('users').where('uid', '!=', currentUser.uid)
      .onSnapshot((snapshot) => {
          allUsers = [];
          snapshot.docs.forEach(doc => {
              allUsers.push(doc.data());
              
              // Set up real-time listener for each user's online status
              setupUserStatusListener(doc.data().uid);
          });
          
          renderUserList(allUsers);
          
          // If there's a selected user, check for chat requests
          if (selectedUser) {
              checkChatRequest();
          }
      });
      
  // Store the unsubscribe function
  userStatusListeners['allUsers'] = usersListener;
      
  // Add search functionality
  searchUsers.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      if (searchTerm === '') {
          renderUserList(allUsers);
      } else {
          const filteredUsers = allUsers.filter(user => 
              user.name.toLowerCase().includes(searchTerm) || 
              user.email.toLowerCase().includes(searchTerm)
          );
          renderUserList(filteredUsers);
      }
  });
}

// Setup individual user status listener
function setupUserStatusListener(userId) {
  // Skip if already listening
  if (userStatusListeners[userId]) return;
  
  const statusListener = db.collection('users').doc(userId)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        
        // Find user in allUsers array and update status
        const userIndex = allUsers.findIndex(u => u.uid === userId);
        if (userIndex !== -1) {
          allUsers[userIndex] = { ...allUsers[userIndex], ...userData };
          
          // Update UI if this user is rendered
          updateUserStatusInUI(userId, userData.isOnline);
          
          // If this is the selected user, update chat header
          if (selectedUser && selectedUser.uid === userId) {
            selectedUser = { ...selectedUser, ...userData };
            updateChatHeader(selectedUser);
          }
        }
      }
    }, error => {
      console.error(`Error listening to user ${userId} status:`, error);
    });
  
  // Store the unsubscribe function
  userStatusListeners[userId] = statusListener;
}

// Update user status in UI
function updateUserStatusInUI(userId, isOnline) {
  const userItems = document.querySelectorAll('.user-item');
  for (let i = 0; i < userItems.length; i++) {
    const item = userItems[i];
    const nameEl = item.querySelector('.name');
    const statusEl = item.querySelector('.status');
    
    // Find user in allUsers
    const user = allUsers.find(u => u.uid === userId);
    if (user && nameEl && nameEl.textContent === user.name) {
      statusEl.textContent = isOnline ? 'Online' : 'Offline';
      break;
    }
  }
}

// Render user list
function renderUserList(users) {
  userList.innerHTML = '';
  
  users.forEach(user => {
      const userElement = document.createElement('div');
      userElement.classList.add('user-item');
      userElement.dataset.uid = user.uid;
      
      // Check if this is the selected user
      if (selectedUser && selectedUser.uid === user.uid) {
          userElement.classList.add('active');
      }
      
      const nameInitial = user.name ? user.name.charAt(0).toUpperCase() : '';
      const status = user.isOnline ? 'Online' : 'Offline';
      
      userElement.innerHTML = `
          <div class="avatar">
              ${nameInitial}
          </div>
          <div class="user-details">
              <div class="name">${user.name || 'User'}</div>
              <div class="status">${status}</div>
          </div>
      `;
      
      // Add click event to select user
      userElement.addEventListener('click', () => {
          selectUser(user);
      });
      
      userList.appendChild(userElement);
  });
}

// Select a user to chat with
function selectUser(user) {
  selectedUser = user;
  
  // Update UI
  document.querySelectorAll('.user-item').forEach(item => {
      item.classList.remove('active');
  });
  
  const userItems = document.querySelectorAll('.user-item');
  for (let i = 0; i < userItems.length; i++) {
      const item = userItems[i];
      if (item.dataset.uid === user.uid) {
          item.classList.add('active');
          break;
      }
  }
  
  // Update chat header
  updateChatHeader(user);
  
  // Show chat container, hide placeholder
  chatPlaceholder.style.display = 'none';
  chatContainer.style.display = 'flex';
  
  // Check if chat exists
  checkChatExistence(user);
  
  // Handle mobile view
  if (isMobile) {
      toggleMobileView();
      addBackButton();
  }
}

// Update chat header with selected user info
function updateChatHeader(user) {
  const nameInitial = user.name ? user.name.charAt(0).toUpperCase() : '';
  const status = user.isOnline ? 'Online' : 'Offline';
  
  // Create back button for mobile
  const backButtonHtml = isMobile ? '<button class="back-to-users"><i class="fas fa-arrow-left"></i></button>' : '';
  
  chatHeader.innerHTML = `
      ${backButtonHtml}
      <div class="avatar">
          ${nameInitial}
      </div>
      <div class="user-details">
          <div class="name">${user.name || 'User'}</div>
          <div class="status">${status}</div>
      </div>
  `;
  
  // Add event listener to back button if on mobile
  if (isMobile) {
    const backButton = chatHeader.querySelector('.back-to-users');
    if (backButton) {
      backButton.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        
        // Show sidebar, hide chat area
        sidebar.classList.remove('hidden');
        chatArea.classList.remove('active');
      });
    }
  }
}

// Check if chat already exists between current user and selected user
function checkChatExistence(user) {
  // Query for chats where both users are participants
  db.collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .get()
      .then((snapshot) => {
          let chatExists = false;
          
          snapshot.docs.forEach(doc => {
              const chatData = doc.data();
              
              // Check if the selected user is also a participant
              if (chatData.participants.includes(user.uid)) {
                  chatExists = true;
                  currentChatId = doc.id;
                  
                  // Check chat status
                  if (chatData.status === 'pending') {
                      // Check if current user is the initiator
                      if (chatData.initiator === currentUser.uid) {
                          // Show waiting for acceptance message
                          messageContainer.innerHTML = '<div class="chat-status">Waiting for user to accept chat request...</div>';
                          chatRequest.style.display = 'none';
                          messageInputContainer.style.display = 'none';
                      } else {
                          // Show accept/decline options
                          messageContainer.innerHTML = '';
                          chatRequest.style.display = 'block';
                          messageInputContainer.style.display = 'none';
                      }
                  } else if (chatData.status === 'active') {
                      // Load messages
                      chatRequest.style.display = 'none';
                      messageInputContainer.style.display = 'flex';  // Changed to flex for better mobile display
                      loadMessages(currentChatId);
                  } else if (chatData.status === 'declined') {
                      // Show declined message
                      messageContainer.innerHTML = '<div class="chat-status">Chat request was declined. You cannot send messages.</div>';
                      chatRequest.style.display = 'none';
                      messageInputContainer.style.display = 'none';
                  }
                  
                  // Listen for typing indicators
                  listenForTypingIndicators(currentChatId);
                  
                  return;
              }
          });
          
          if (!chatExists) {
              // No chat exists, show option to initiate chat
              messageContainer.innerHTML = '<div class="chat-status">Click to send a message and initiate a chat with this user.</div>';
              chatRequest.style.display = 'none';
              messageInputContainer.style.display = 'flex';  // Changed to flex for better mobile display
              
              // Create new chat with pending status
              createNewChat(user);
          }
      })
      .catch(error => {
          console.error('Error checking chat existence:', error);
      });
}

// Create a new chat
function createNewChat(user) {
  const chatData = {
      participants: [currentUser.uid, user.uid],
      initiator: currentUser.uid,
      status: 'pending',
      typing: {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('chats').add(chatData)
      .then(docRef => {
          currentChatId = docRef.id;
          
          // Listen for typing indicators
          listenForTypingIndicators(currentChatId);
      })
      .catch(error => {
          console.error('Error creating chat:', error);
      });
}

// Check for chat requests
function checkChatRequest() {
  if (!currentChatId || !selectedUser) return;
  
  // Stop existing listener if any
  if (userStatusListeners['chatRequest']) {
    userStatusListeners['chatRequest']();
  }
  
  const chatRequestListener = db.collection('chats').doc(currentChatId)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const chatData = doc.data();
        
        if (chatData.status === 'pending') {
          if (chatData.initiator === currentUser.uid) {
            // Show waiting for acceptance message
            messageContainer.innerHTML = '<div class="chat-status">Waiting for user to accept chat request...</div>';
            chatRequest.style.display = 'none';
            messageInputContainer.style.display = 'none';
          } else {
            // Show accept/decline options
            messageContainer.innerHTML = '';
            chatRequest.style.display = 'block';
            messageInputContainer.style.display = 'none';
          }
        } else if (chatData.status === 'active') {
          // Load messages
          chatRequest.style.display = 'none';
          messageInputContainer.style.display = 'flex';  // Changed to flex for better mobile display
          loadMessages(currentChatId);
        } else if (chatData.status === 'declined') {
          // Show declined message
          messageContainer.innerHTML = '<div class="chat-status">Chat request was declined. You cannot send messages.</div>';
          chatRequest.style.display = 'none';
          messageInputContainer.style.display = 'none';
        }
      }
    });
    
  // Store unsubscribe function
  userStatusListeners['chatRequest'] = chatRequestListener;
}

// Accept chat request
acceptChat.addEventListener('click', () => {
  if (!currentChatId) return;
  
  db.collection('chats').doc(currentChatId).update({
    status: 'active',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    chatRequest.style.display = 'none';
    messageInputContainer.style.display = 'flex';  // Changed to flex for better mobile display
    loadMessages(currentChatId);
  })
  .catch(error => {
    console.error('Error accepting chat:', error);
  });
});

// Decline chat request
declineChat.addEventListener('click', () => {
  if (!currentChatId) return;
  
  db.collection('chats').doc(currentChatId).update({
    status: 'declined',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    chatRequest.style.display = 'none';
    messageInputContainer.style.display = 'none';
    messageContainer.innerHTML = '<div class="chat-status">You declined this chat request.</div>';
  })
  .catch(error => {
    console.error('Error declining chat:', error);
  });
});

// Load messages
function loadMessages(chatId) {
  // Clear message container
  messageContainer.innerHTML = '';
  
  // Stop existing listener if any
  if (userStatusListeners['messages']) {
    userStatusListeners['messages']();
  }
  
  // Listen for messages
  const messagesListener = db.collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('createdAt')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          displayMessage(change.doc.data());
        }
      });
      
      // Scroll to bottom of message container
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, (error) => {
      console.error('Error loading messages:', error);
    });
    
  // Store unsubscribe function
  userStatusListeners['messages'] = messagesListener;
}

// Display a message
function displayMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  
  // Check if message is from current user
  if (message.senderId === currentUser.uid) {
    messageElement.classList.add('sent');
  } else {
    messageElement.classList.add('received');
  }
  
  // Format timestamp
  let timestamp = 'Just now';
  if (message.createdAt) {
    const date = message.createdAt.toDate();
    timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  messageElement.innerHTML = `
    <div class="message-content">
      <p>${message.text}</p>
      <span class="timestamp">${timestamp}</span>
    </div>
  `;
  
  messageContainer.appendChild(messageElement);
}

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const text = messageInput.value.trim();
  if (!text || !currentChatId) return;
  
  // Clear input
  messageInput.value = '';
  
  const messageData = {
    text: text,
    senderId: currentUser.uid,
    senderName: currentUser.name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Add message to Firestore
  db.collection('chats').doc(currentChatId)
    .collection('messages')
    .add(messageData)
    .then(() => {
      // Update chat status to active if it was pending
      return db.collection('chats').doc(currentChatId).update({
        status: 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: text,
        lastMessageSenderId: currentUser.uid
      });
    })
    .catch(error => {
      console.error('Error sending message:', error);
    });
});

// Set up beforeunload event to update user status when leaving
window.addEventListener('beforeunload', () => {
  if (currentUser && currentUser.uid) {
    // Set user as offline
    // Using a synchronous approach for beforeunload
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      localId: currentUser.uid,
      isOnline: false
    }));
    
    // Also attempt the normal async approach
    updateUserStatus(false);
  }
});

// Use visibilitychange to update online status when tab is hidden/visible
document.addEventListener('visibilitychange', () => {
  if (currentUser && currentUser.uid) {
    if (document.visibilityState === 'hidden') {
      updateUserStatus(false);
    } else {
      updateUserStatus(true);
    }
  }
});

// Optional: Add typing indicator functionality
let typingTimeout;
messageInput.addEventListener('input', () => {
  if (!currentChatId) return;
  
  clearTimeout(typingTimeout);
  
  // Set typing status
  db.collection('chats').doc(currentChatId).update({
    [`typing.${currentUser.uid}`]: true
  });
  
  // Clear typing status after 2 seconds of inactivity
  typingTimeout = setTimeout(() => {
    db.collection('chats').doc(currentChatId).update({
      [`typing.${currentUser.uid}`]: false
    });
  }, 2000);
});

// Listen for typing indicators
function listenForTypingIndicators(chatId) {
  // Stop existing listener if any
  if (userStatusListeners['typing']) {
    userStatusListeners['typing']();
  }
  
  const typingListener = db.collection('chats').doc(chatId)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const chatData = doc.data();
        
        if (chatData.typing && chatData.typing[selectedUser.uid]) {
          // Show typing indicator
          const typingIndicator = document.createElement('div');
          typingIndicator.classList.add('typing-indicator');
          typingIndicator.textContent = `${selectedUser.name} is typing...`;
          
          // Remove any existing typing indicators
          const existingIndicator = document.querySelector('.typing-indicator');
          if (existingIndicator) {
            existingIndicator.remove();
          }
          
          messageContainer.appendChild(typingIndicator);
          
          // Scroll to bottom
          messageContainer.scrollTop = messageContainer.scrollHeight;
        } else {
          // Remove typing indicator
          const existingIndicator = document.querySelector('.typing-indicator');
          if (existingIndicator) {
            existingIndicator.remove();
          }
        }
      }
    });
    
  // Store unsubscribe function
  userStatusListeners['typing'] = typingListener;
}

// Mobile view functions
function toggleMobileView() {
  const sidebar = document.querySelector('.sidebar');
  const chatArea = document.querySelector('.chat-area');
  
  if (isMobile) {
    // Hide sidebar, show chat area
    sidebar.classList.add('hidden');
    chatArea.classList.add('active');
  }
}

// Add back button to chat header for mobile
function addBackButton() {
  // Back button is now added in updateChatHeader function
}

// Add window resize listener to update isMobile variable
window.addEventListener('resize', () => {
  const wasMobile = isMobile;
  isMobile = window.innerWidth <= 768;
  
  // If device switched between mobile and desktop mode
  if (wasMobile !== isMobile) {
    // Update UI elements that depend on mobile state
    if (selectedUser) {
      updateChatHeader(selectedUser);
    }
    
    // Reset mobile classes
    if (!isMobile) {
      const sidebar = document.querySelector('.sidebar');
      const chatArea = document.querySelector('.chat-area');
      
      sidebar.classList.remove('hidden');
      
      if (!selectedUser) {
        chatArea.classList.remove('active');
      }
    }
  }
});

// Fix for iOS devices to ensure proper input display
function fixIOSInputDisplay() {
  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS) {
    // Add special class for iOS devices
    document.body.classList.add('ios-device');
    
    // Fix for virtual keyboard issues
    messageInput.addEventListener('focus', () => {
      // Scroll the page after a short delay to ensure the input is visible
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
        messageInputContainer.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });
  }
}

// Initialize mobile classes on load
document.addEventListener('DOMContentLoaded', () => {
  isMobile = window.innerWidth <= 768;
  
  // Ensure chat area is hidden initially on mobile
  if (isMobile) {
    const chatArea = document.querySelector('.chat-area');
    chatArea.classList.remove('active');
  }
  
  // Fix iOS input display issues
  fixIOSInputDisplay();
  
  // Make sure message input container is displayed correctly on all devices
  messageInputContainer.style.display = 'none'; // Initially hidden
});
