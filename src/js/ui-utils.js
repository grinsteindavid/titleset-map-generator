/**
 * Display a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (info, success, warning, error)
 */
export function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Append to body
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('visible');
    setTimeout(() => {
      notification.remove();
    }, 500); // Wait for fade out animation
  }, 3000);
}

/**
 * Show message when no tab is selected
 */
export function showNoTabSelectedMessage() {
  // Remove existing message if present
  const existingMessage = document.getElementById('no-tab-selected-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageElem = document.createElement('div');
  messageElem.id = 'no-tab-selected-message';
  messageElem.className = 'notification warning';
  messageElem.textContent = 'No layer tab is selected. Please select a layer to edit.';
  
  // Add to map container
  document.querySelector('.map-container').appendChild(messageElem);
}
