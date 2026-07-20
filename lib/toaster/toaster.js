function toast(message, type, duration = 5) {
  const toaster = document.createElement('div');
  toaster.classList.add('toast');
  toaster.classList.add(type);
  toaster.textContent = message;

  document.getElementById('toaster-container').appendChild(toaster);

  setTimeout(function() {
      toaster.remove();
  }, duration * 1000);
}