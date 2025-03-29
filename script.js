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
              }
          });
  } else {
      // User is signed out
      currentUser = null;
      
      // Show auth container, hide app container
      authContainer.style.display = 'flex';
      appContainer.style.display = 'none';
      
      // Reset UI
      resetUI();
  }
});

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
  
  db.collection('users').doc(currentUser.uid).update({
      isOnline: isOnline,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(error => console.error('Error updating status:', error));
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
  db.collection('users').where('uid', '!=', currentUser.uid)
      .onSnapshot((snapshot) => {
          allUsers = [];
          snapshot.docs.forEach(doc => {
              allUsers.push(doc.data());
          });
          
          renderUserList(allUsers);
          
          // If there's a selected user, check for chat requests
          if (selectedUser) {
              checkChatRequest();
          }
      });
      
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

// Render user list
function renderUserList(users) {
  userList.innerHTML = '';
  
  users.forEach(user => {
      const userElement = document.createElement('div');
      userElement.classList.add('user-item');
      
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
      if (item.querySelector('.name').textContent === user.name) {
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
}

// Update chat header with selected user info
function updateChatHeader(user) {
  const nameInitial = user.name ? user.name.charAt(0).toUpperCase() : '';
  const status = user.isOnline ? 'Online' : 'Offline';
  
  chatHeader.innerHTML = `
      <div class="avatar">
          ${nameInitial}
      </div>
      <div class="user-details">
          <div class="name">${user.name || 'User'}</div>
          <div class="status">${status}</div>
      </div>
  `;
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
                      messageInputContainer.style.display = 'block';
                      loadMessages(currentChatId);
                  } else if (chatData.status === 'declined') {
                      // Show declined message
                      messageContainer.innerHTML = '<div class="chat-status">Chat request was declined. You cannot send messages.</div>';
                      chatRequest.style.display = 'none';
                      messageInputContainer.style.display = 'none';
                  }
                  
                  return;
              }
          });
          
          if (!chatExists) {
              // No chat exists, show option to initiate chat
              messageContainer.innerHTML = '<div class="chat-status">Click to send a message and initiate a chat with this user.</div>';
              chatRequest.style.display = 'none';
              messageInputContainer.style.display = 'block';
              
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('chats').add(chatData)
      .then(docRef => {
          currentChatId = docRef.id;
      })
      .catch(error => {
          console.error('Error creating chat:', error);
      });
}

// Check for chat requests
function checkChatRequest() {
  if (!currentChatId || !selectedUser) return;
  
  db.collection('chats').doc(currentChatId)
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
          messageInputContainer.style.display = 'block';
          loadMessages(currentChatId);
        } else if (chatData.status === 'declined') {
          // Show declined message
          messageContainer.innerHTML = '<div class="chat-status">Chat request was declined. You cannot send messages.</div>';
          chatRequest.style.display = 'none';
          messageInputContainer.style.display = 'none';
        }
      }
    });
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
    messageInputContainer.style.display = 'block';
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
  
  // Listen for messages
  db.collection('chats').doc(chatId)
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
    updateUserStatus(false);
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
  db.collection('chats').doc(chatId)
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
        } else {
          // Remove typing indicator
          const existingIndicator = document.querySelector('.typing-indicator');
          if (existingIndicator) {
            existingIndicator.remove();
          }
        }
      }
    });
}

// Add these variables to your existing global variables
let isMobile = window.innerWidth <= 768;

// Add this function after your existing functions
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
    // Check if back button already exists
    if (document.querySelector('.back-to-users')) return;
    
    const backButton = document.createElement('button');
    backButton.classList.add('back-to-users');
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    backButton.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const chatArea = document.querySelector('.chat-area');
        
        // Show sidebar, hide chat area
        sidebar.classList.remove('hidden');
        chatArea.classList.remove('active');
    });
    
    // Insert back button at the beginning of chat header
    chatHeader.prepend(backButton);
}

// Update the selectUser function to handle mobile view
// Modify your existing selectUser function
function selectUser(user) {
    selectedUser = user;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const userItems = document.querySelectorAll('.user-item');
    for (let i = 0; i < userItems.length; i++) {
        const item = userItems[i];
        if (item.querySelector('.name').textContent === user.name) {
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

// Add window resize listener to update isMobile variable
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
});

// Initialize mobile classes on load
document.addEventListener('DOMContentLoaded', () => {
    isMobile = window.innerWidth <= 768;
    
    // Ensure chat area is hidden initially on mobile
    if (isMobile) {
        const chatArea = document.querySelector('.chat-area');
        chatArea.classList.remove('active');
    }
});